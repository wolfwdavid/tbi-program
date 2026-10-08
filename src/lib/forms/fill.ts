import {
	PDFCheckBox,
	PDFDict,
	PDFDocument,
	PDFDropdown,
	PDFName,
	PDFRadioGroup,
	PDFTextField,
	StandardFonts,
	degrees,
	rgb,
	type PDFFont,
	type PDFForm,
	type PDFPage
} from 'pdf-lib';
import type {
	AcroTarget,
	CaseData,
	FormDef,
	MarkTarget,
	Overflow,
	Question,
	Target,
	TextTarget
} from './types.ts';
import { questionIndex, resolve } from './values.ts';

export type LoadPdf = (file: string) => Promise<ArrayBuffer | Uint8Array>;

export interface FillOptions {
	/** Lock fields so the PDF can't be edited afterwards. Default false (fields stay editable). */
	flatten?: boolean;
	/** Question lookup; built from `forms` when omitted. */
	index?: Map<string, Question>;
}

export interface FillResult {
	doc: PDFDocument;
	overflow: Overflow[];
	/** Field names in the definition that the PDF doesn't have (a definition bug). */
	missingFields: string[];
}

const INK = rgb(0.05, 0.1, 0.45);
const MIN_SIZE = 6;
const CONT = ' (cont.)';

const isAcro = (t: Target): t is AcroTarget => 'acro' in t;
const isMark = (t: Target): t is MarkTarget => 'mark' in t;

/** Replace characters the standard Helvetica font can't encode. */
function sanitizer(font: PDFFont) {
	const ok = new Map<string, boolean>();
	const replacements: Record<string, string> = { '‑': '-', ' ': ' ', '\t': ' ' };
	return (text: string) =>
		[...text.normalize('NFC')]
			.map((ch) => {
				if (ch === '\n') return ch;
				if (replacements[ch]) return replacements[ch];
				if (!ok.has(ch)) {
					try {
						font.widthOfTextAtSize(ch, 10);
						ok.set(ch, true);
					} catch {
						ok.set(ch, false);
					}
				}
				return ok.get(ch) ? ch : '?';
			})
			.join('');
}

/** Greedy word wrap; also honours explicit newlines and breaks words longer than a line. */
export function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
	const out: string[] = [];
	for (const para of text.split(/\r?\n/)) {
		let line = '';
		for (const word of para.split(/\s+/).filter(Boolean)) {
			const next = line ? `${line} ${word}` : word;
			if (font.widthOfTextAtSize(next, size) <= width) {
				line = next;
				continue;
			}
			if (line) out.push(line);
			let w = word;
			while (font.widthOfTextAtSize(w, size) > width && w.length > 1) {
				let cut = w.length - 1;
				while (cut > 1 && font.widthOfTextAtSize(w.slice(0, cut), size) > width) cut--;
				out.push(w.slice(0, cut));
				w = w.slice(cut);
			}
			line = w;
		}
		out.push(line);
	}
	return out;
}

/** Trim `line` so that `line + suffix` fits in `width`. */
function fitWithSuffix(line: string, suffix: string, font: PDFFont, size: number, width: number) {
	let s = line;
	while (s && font.widthOfTextAtSize(s + suffix, size) > width) s = s.slice(0, -1);
	return s.trimEnd() + suffix;
}

function fillAcro(
	form: PDFForm,
	t: AcroTarget,
	value: string | boolean,
	text: string,
	font: PDFFont,
	label: string,
	overflow: Overflow[],
	missing: string[]
) {
	let field;
	try {
		field = form.getField(t.acro);
	} catch {
		missing.push(t.acro);
		return;
	}
	if (field instanceof PDFCheckBox) {
		if (value === true || (typeof value === 'string' && value.trim() !== '')) field.check();
		else field.uncheck();
	} else if (field instanceof PDFRadioGroup) {
		if (value) field.select(t.option ?? text);
	} else if (field instanceof PDFDropdown) {
		if (value) field.select(t.option ?? text);
	} else if (field instanceof PDFTextField) {
		const rect = field.acroField.getWidgets()[0].getRectangle();
		// A single-line box tall enough for two small lines may wrap when the answer has a line break.
		if (!field.isMultiline() && text.includes('\n') && rect.height >= 2 * MIN_SIZE * 1.18 + 2) {
			field.enableMultiline();
		}
		const multiline = field.isMultiline();
		// Leave room for the widget's own padding; multiline boxes pad more.
		const width = rect.width - (multiline ? 6 : 4);
		const content = multiline ? text : text.replace(/\s*\n\s*/g, '; ');
		let size = Math.min(10, Math.max(MIN_SIZE, rect.height * 0.62));
		const fits = (s: number) =>
			multiline
				? wrap(content, font, s, width).length * s * 1.18 <= rect.height - 2
				: font.widthOfTextAtSize(content, s) <= width;
		while (size > MIN_SIZE && !fits(size)) size -= 0.5;
		// Wrap multiline text ourselves: pdf-lib's own wrapping can let a long first line run past the box.
		let final = multiline ? wrap(content, font, size, width).join('\n') : content;
		if (!fits(size)) {
			overflow.push({ label, text });
			if (multiline) {
				const max = Math.max(1, Math.floor((rect.height - 2) / (size * 1.18)));
				const lines = wrap(content, font, size, width).slice(0, max);
				lines[max - 1] = fitWithSuffix(lines[max - 1] ?? '', CONT, font, size, width);
				final = lines.join('\n');
			} else {
				final = fitWithSuffix(content, CONT, font, size, width);
			}
		}
		const max = field.getMaxLength();
		if (max !== undefined && final.length > max) {
			overflow.push({ label, text });
			final = final.slice(0, max);
		}
		field.setFontSize(size);
		field.setText(final);
	}
}

function drawText(
	page: PDFPage,
	t: TextTarget,
	text: string,
	font: PDFFont,
	label: string,
	overflow: Overflow[]
) {
	const size = t.size ?? 9;
	const lineHeight = t.lineHeight ?? size * 1.2;
	const maxLines = t.lines ?? 1;
	// Text rotated 90° runs up the page, so the room left is measured along y.
	const width = t.maxWidth ?? (t.rotate ? page.getHeight() - t.y : page.getWidth() - t.x) - 24;
	let lines = maxLines === 1 ? [text.replace(/\s*\n\s*/g, '; ')] : wrap(text, font, size, width);
	if (maxLines === 1 && font.widthOfTextAtSize(lines[0], size) > width) {
		overflow.push({ label, text });
		lines = [fitWithSuffix(lines[0], CONT, font, size, width)];
	} else if (lines.length > maxLines) {
		overflow.push({ label, text });
		lines = lines.slice(0, maxLines);
		lines[maxLines - 1] = fitWithSuffix(lines[maxLines - 1], CONT, font, size, width);
	}
	const theta = ((t.rotate ?? 0) * Math.PI) / 180;
	lines.forEach((line, i) => {
		page.drawText(line, {
			x: t.x + i * lineHeight * Math.sin(theta),
			y: t.y - i * lineHeight * Math.cos(theta),
			size,
			font,
			color: INK,
			rotate: degrees(t.rotate ?? 0)
		});
	});
}

/** Fill one form. Returns the PDF (not yet saved) plus anything that didn't fit. */
export async function fillForm(
	form: FormDef,
	data: CaseData,
	load: LoadPdf,
	opts: FillOptions = {}
): Promise<FillResult> {
	const index = opts.index ?? questionIndex([form]);
	const doc = await PDFDocument.load(await load(form.file), { ignoreEncryption: true });
	// Some DOH forms carry an XFA copy; viewers that prefer it would ignore our filled fields.
	doc.catalog.lookupMaybe(PDFName.of('AcroForm'), PDFDict)?.delete(PDFName.of('XFA'));

	const font = await doc.embedFont(StandardFonts.Helvetica);
	const bold = await doc.embedFont(StandardFonts.HelveticaBold);
	const clean = sanitizer(font);
	const pdfForm = doc.getForm();
	const overflow: Overflow[] = [];
	const missing: string[] = [];

	for (const name of form.clearFields ?? []) {
		try {
			pdfForm.getTextField(name).setText('');
		} catch {
			missing.push(name);
		}
	}

	for (const field of form.fields) {
		const value = resolve(field, data, index);
		if (value === undefined || value === null || value === '') continue;
		const text = typeof value === 'string' ? clean(value.trim()) : '';
		const label =
			field.label ??
			(typeof field.src === 'string'
				? (index.get(field.src)?.label ?? field.src)
				: 'Additional information');
		for (const t of Array.isArray(field.to) ? field.to : [field.to]) {
			if (isAcro(t)) fillAcro(pdfForm, t, value, text, font, label, overflow, missing);
			else if (isMark(t)) {
				if (value) {
					doc
						.getPage(t.page)
						.drawText('X', { x: t.x, y: t.y, size: t.size ?? 10, font: bold, color: INK });
				}
			} else if (text) drawText(doc.getPage(t.page), t, text, font, label, overflow);
		}
	}

	if (pdfForm.getFields().length > 0) {
		pdfForm.updateFieldAppearances(font);
		if (opts.flatten) {
			try {
				pdfForm.flatten();
			} catch {
				// Some signature widgets can't be flattened; leave the fields editable instead.
			}
		}
	}

	if (overflow.length > 0) addContinuation(doc, form, data, overflow, font, bold, clean);
	return { doc, overflow, missingFields: missing };
}

function addContinuation(
	doc: PDFDocument,
	form: FormDef,
	data: CaseData,
	items: Overflow[],
	font: PDFFont,
	bold: PDFFont,
	clean: (s: string) => string
) {
	const W = 612;
	const H = 792;
	const M = 54;
	const width = W - M * 2;
	let page = doc.addPage([W, H]);
	let y = H - M;
	const name = clean(String(data['participant.name'] ?? ''));
	const cin = clean(String(data['participant.cin'] ?? ''));

	const header = () => {
		page.drawText(clean(`Continuation: ${form.code} ${form.title}`), {
			x: M,
			y,
			size: 12,
			font: bold
		});
		y -= 16;
		page.drawText(`Participant: ${name || '________________'}    CIN: ${cin || '__________'}`, {
			x: M,
			y,
			size: 9,
			font
		});
		y -= 8;
		page.drawLine({
			start: { x: M, y },
			end: { x: W - M, y },
			thickness: 0.5,
			color: rgb(0.6, 0.6, 0.6)
		});
		y -= 18;
	};
	header();

	for (const item of items) {
		const lines = wrap(item.text, font, 10, width);
		if (y - 14 - 13 < M) {
			page = doc.addPage([W, H]);
			y = H - M;
			header();
		}
		page.drawText(clean(item.label), { x: M, y, size: 10, font: bold });
		y -= 14;
		for (const line of lines) {
			if (y < M) {
				page = doc.addPage([W, H]);
				y = H - M;
				header();
			}
			page.drawText(line, { x: M, y, size: 10, font, color: INK });
			y -= 13;
		}
		y -= 10;
	}
}

/** Fill several forms and merge them into one PDF, in the order given. */
export async function buildPacket(
	forms: FormDef[],
	data: CaseData,
	load: LoadPdf,
	opts: FillOptions = {}
): Promise<{ bytes: Uint8Array; overflow: Record<string, Overflow[]> }> {
	const index = opts.index ?? questionIndex(forms);
	const packet = await PDFDocument.create();
	const overflow: Record<string, Overflow[]> = {};
	for (const form of forms) {
		const { doc, overflow: o } = await fillForm(form, data, load, {
			...opts,
			index,
			flatten: true
		});
		if (o.length) overflow[form.id] = o;
		const pages = await packet.copyPages(doc, doc.getPageIndices());
		pages.forEach((p) => packet.addPage(p));
	}
	return { bytes: await packet.save(), overflow };
}
