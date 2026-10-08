// Fill form definitions with the sample case and write the PDFs, for checking alignment.
//
//   npx tsx scripts/render-form.ts <out-dir> <def-file>...
//   e.g. npx tsx scripts/render-form.ts ../out src/lib/forms/defs/doh-5729.ts
//
// Then turn them into PNGs with: python scripts/render_png.py <out-dir>

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fillForm } from '../src/lib/forms/fill.ts';
import type { FormDef } from '../src/lib/forms/types.ts';
import { questionIndex } from '../src/lib/forms/values.ts';
import { sampleCase } from './sample-case.ts';

const [outDir, ...defFiles] = process.argv.slice(2);
if (!outDir || defFiles.length === 0) {
	console.error('usage: tsx scripts/render-form.ts <out-dir> <def-file>...');
	process.exit(1);
}
await mkdir(outDir, { recursive: true });

const load = (file: string) => readFile(path.join('static', 'forms', file));
let problems = 0;

for (const defFile of defFiles) {
	const mod = await import(pathToFileURL(path.resolve(defFile)).href);
	const forms = Object.values(mod).filter((v): v is FormDef => !!v && typeof v === 'object' && 'fields' in v);
	for (const form of forms) {
		const data = { ...sampleCase, ...extraSample(form) };
		const { doc, overflow, missingFields } = await fillForm(form, data, load, { index: questionIndex([form]) });
		const out = path.join(outDir, `${form.id}.pdf`);
		await writeFile(out, await doc.save());
		console.log(`${form.id}: ${doc.getPageCount()} pages -> ${out}`);
		if (overflow.length) console.log(`  continuation: ${overflow.map((o) => o.label).join(' | ')}`);
		if (missingFields.length) {
			problems++;
			console.log(`  MISSING ACROFORM FIELDS: ${missingFields.join(' | ')}`);
		}
	}
}

/** Fill a form's own questions with plausible placeholder answers. */
function extraSample(form: FormDef) {
	const out: Record<string, string | boolean> = {};
	for (const q of form.questions ?? []) {
		if (q.key in sampleCase) continue;
		switch (q.type) {
			case 'date':
				out[q.key] = '2026-10-08';
				break;
			case 'time':
				out[q.key] = '10:30';
				break;
			case 'checkbox':
				out[q.key] = true;
				break;
			case 'select':
				out[q.key] = q.options?.[0] ?? '';
				break;
			case 'number':
			case 'money':
				out[q.key] = '1250';
				break;
			case 'phone':
				out[q.key] = '(518) 555-0100';
				break;
			case 'table':
				for (const c of q.columns ?? []) out[`${q.key}.0.${c.id}`] = `Sample ${c.label}`;
				break;
			case 'longtext':
				out[q.key] = `Sample answer for "${q.label}". This is longer text to check wrapping across the lines available on the form.`;
				break;
			default:
				out[q.key] = `Sample ${q.label}`.slice(0, 40);
		}
	}
	return out;
}

process.exit(problems ? 1 : 0);
