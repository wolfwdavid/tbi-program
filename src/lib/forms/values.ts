import type { CaseData, FieldDef, FormDef, Question, Value } from './types.ts';
import { sharedQuestions } from './questions.ts';

/** All questions a form can draw on: shared ones plus its own. */
export function questionIndex(forms: FormDef[]): Map<string, Question> {
	const index = new Map<string, Question>();
	for (const q of sharedQuestions) index.set(q.key, q);
	for (const f of forms) for (const q of f.questions ?? []) index.set(q.key, q);
	return index;
}

/** "2026-10-08" → "10/08/2026". Leaves anything else untouched. */
export function formatDate(v: string): string {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
	return m ? `${m[2]}/${m[3]}/${m[1]}` : v;
}

/** "14:30" → "2:30 PM". */
export function formatTime(v: string): string {
	const m = /^(\d{2}):(\d{2})$/.exec(v);
	if (!m) return v;
	const h = Number(m[1]);
	return `${h % 12 || 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`;
}

export function formatMoney(v: string): string {
	const n = Number(String(v).replace(/[$,\s]/g, ''));
	return Number.isFinite(n) && String(v).trim() !== ''
		? n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
		: v;
}

/** Table cell key: cell('services', 0, 'type') → "services.0.type". */
export const cell = (table: string, row: number, col: string) => `${table}.${row}.${col}`;

/** Count of table rows with any answer, scanning up to `max`. */
export function rowCount(d: CaseData, table: string, max = 50): number {
	let last = -1;
	for (const k of Object.keys(d)) {
		if (!k.startsWith(table + '.')) continue;
		const row = Number(k.slice(table.length + 1).split('.')[0]);
		if (Number.isInteger(row) && row < max && d[k] !== '' && d[k] !== false)
			last = Math.max(last, row);
	}
	return last + 1;
}

function columnType(index: Map<string, Question>, key: string): string | undefined {
	const q = index.get(key);
	if (q) return q.type;
	// Table cell: "<table>.<row>.<col>"
	const m = /^(.*)\.(\d+)\.([^.]+)$/.exec(key);
	if (m) return index.get(m[1])?.columns?.find((c) => c.id === m[3])?.type;
	return undefined;
}

/** Value of a key, formatted for print according to its question type. */
export function display(d: CaseData, key: string, index: Map<string, Question>): Value {
	const v = d[key];
	if (typeof v !== 'string') return v;
	switch (columnType(index, key)) {
		case 'date':
			return formatDate(v);
		case 'time':
			return formatTime(v);
		case 'money':
			return formatMoney(v);
		default:
			return v;
	}
}

export function resolve(field: FieldDef, d: CaseData, index: Map<string, Question>): Value {
	return typeof field.src === 'string' ? display(d, field.src, index) : field.src(d);
}

export function isAnswered(v: unknown): boolean {
	return typeof v === 'boolean' ? v : typeof v === 'string' && v.trim() !== '';
}

/** Keys a form needs answered, excluding optional questions and checkboxes. */
export function requiredKeys(form: FormDef, index: Map<string, Question>): string[] {
	const keys = new Set<string>();
	for (const f of form.fields) {
		for (const k of typeof f.src === 'string' ? [f.src] : (f.needs ?? [])) keys.add(k);
	}
	return [...keys].filter((k) => {
		const q = index.get(k) ?? index.get(k.replace(/\.\d+\.[^.]+$/, ''));
		return q && !q.optional && q.type !== 'checkbox' && q.type !== 'table';
	});
}

/** Share of a form's required answers that are filled, 0–1. Forms with nothing required count as 1. */
export function completeness(form: FormDef, d: CaseData, index: Map<string, Question>): number {
	const keys = requiredKeys(form, index);
	if (keys.length === 0) return 1;
	return keys.filter((k) => isAnswered(d[k])).length / keys.length;
}

/** Every question key a form uses, including table prefixes and form-local questions. */
export function formQuestionKeys(form: FormDef, index: Map<string, Question>): string[] {
	const keys = new Set<string>();
	const add = (k: string) => {
		if (index.has(k)) keys.add(k);
		else {
			const table = k.replace(/\.\d+\.[^.]+$/, '');
			if (index.has(table)) keys.add(table);
		}
	};
	for (const f of form.fields)
		for (const k of typeof f.src === 'string' ? [f.src] : (f.needs ?? [])) add(k);
	for (const q of form.questions ?? []) keys.add(q.key);
	return [...keys];
}
