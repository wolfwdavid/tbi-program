import type { CaseData, FieldDef, FormDef, Question, TextTarget, Value } from '../types.ts';
import { cell, formatMoney, rowCount } from '../values.ts';
import { sharedQuestions } from '../questions.ts';

// TBI C-4.3 Addendum to Existing Service Plan (July 2009), flat PDF.
// Pages 3 and 4 are landscape (/Rotate 90): text there is drawn with rotate 90 in the
// page's unrotated space, where a table row is a band of x (top of the turned page = small x)
// and a column is a band of y (left of the turned page = small y).

const ID = 'tbi-c4-3';
const k = (name: string) => `${ID}.${name}`;

const ID_G = 'Addendum: identification';
const REQ = 'Addendum: summary of request';
const COST = 'Addendum: cost of services';

const str = (d: CaseData, key: string) => {
	const v = d[key];
	return typeof v === 'string' ? v.trim() : '';
};
const num = (d: CaseData, key: string) => {
	const s = str(d, key).replace(/[$,\s]/g, '');
	const n = Number(s);
	return s !== '' && Number.isFinite(n) ? n : undefined;
};
const signed = (n: number) => (n > 0 ? '+' : '') + formatMoney(String(n));

// Landscape grids: row top edges (x) and column bands (y) from the drawn rules.
const COLS = {
	type: [45, 153.9],
	provider: [153.9, 351.9],
	effective: [351.9, 423.9],
	frequency: [423.9, 495.9],
	units: [495.9, 594.9],
	rate: [594.9, 653.4],
	cost: [653.4, 746.8]
} as const;
type Col = keyof typeof COLS;
const SP_ROWS = [175.3, 224.0, 272.8, 321.6, 358.3, 407.1]; // page 3: 5 rows
const W_ROWS = [163.1, 211.9, 260.7, 309.5, 358.3]; // page 4: 4 rows

const LH = 9.5;
function landCell(page: number, rows: number[], r: number, col: Col): TextTarget {
	const [y0, y1] = COLS[col];
	const height = rows[r + 1] - rows[r];
	return {
		page,
		x: rows[r] + 9,
		y: y0 + 2.5,
		rotate: 90,
		size: 8,
		lineHeight: LH,
		lines: Math.max(1, Math.floor((height - 4) / LH)),
		maxWidth: y1 - y0 - 5
	};
}

// State plan rows: shared type/provider/frequency, form-local effective date, units, rate, cost.
const statePlanCost = (d: CaseData, r: number): number | undefined => {
	const own = num(d, cell(k('statePlan'), r, 'cost'));
	if (own !== undefined) return own;
	const rate = num(d, cell(k('statePlan'), r, 'rate'));
	const units = num(d, cell(k('statePlan'), r, 'annualUnits'));
	return rate !== undefined && units !== undefined ? rate * units : undefined;
};
const waiverCost = (d: CaseData, r: number) => num(d, cell('services', r, 'cost'));

function total(d: CaseData, table: string, cost: (d: CaseData, r: number) => number | undefined) {
	let sum = 0;
	let any = false;
	for (let r = 0; r < rowCount(d, table); r++) {
		const c = cost(d, r);
		if (c !== undefined) {
			sum += c;
			any = true;
		}
	}
	return any ? sum : undefined;
}
const statePlanTotal = (d: CaseData) => total(d, 'services.statePlan', statePlanCost);
const waiverTotal = (d: CaseData) => total(d, 'services', waiverCost);
const allTotal = (d: CaseData) => {
	const a = statePlanTotal(d);
	const b = waiverTotal(d);
	return a === undefined && b === undefined ? undefined : (a ?? 0) + (b ?? 0);
};
const allOld = (d: CaseData) => {
	const a = num(d, k('statePlanOldCost'));
	const b = num(d, k('waiverOldCost'));
	return a === undefined && b === undefined ? undefined : (a ?? 0) + (b ?? 0);
};
const money =
	(f: (d: CaseData) => number | undefined) =>
	(d: CaseData): Value => {
		const n = f(d);
		return n === undefined ? undefined : formatMoney(String(n));
	};
const diff =
	(now: (d: CaseData) => number | undefined, old: (d: CaseData) => number | undefined) =>
	(d: CaseData): Value => {
		const a = now(d);
		const b = old(d);
		return a === undefined || b === undefined ? undefined : signed(a - b);
	};

/** Rows past what the printed grid holds, summarised so they reach the continuation page. */
function extraRows(table: string, from: number, describe: (d: CaseData, r: number) => string) {
	return (d: CaseData): Value => {
		const out: string[] = [];
		for (let r = from; r < rowCount(d, table); r++) {
			const s = describe(d, r);
			if (s) out.push(s);
		}
		return out.length ? `More rows: ${out.join('; ')}` : undefined;
	};
}
const join = (...parts: string[]) => parts.filter(Boolean).join(', ');

const questions: Question[] = [
	{
		key: k('planningTeam'),
		label: 'Individuals who participated in developing the addendum',
		type: 'table',
		group: ID_G,
		rows: 4,
		columns: [
			{ id: 'name', label: 'Name' },
			{ id: 'relationship', label: 'Relationship' },
			{ id: 'phone', label: 'Phone', type: 'phone' }
		]
	},
	{ key: k('submissionDate'), label: 'Date the addendum is submitted', type: 'date', group: ID_G },
	{ key: k('planFrom'), label: 'Last approved service plan: from', type: 'date', group: ID_G },
	{ key: k('planTo'), label: 'Last approved service plan: to', type: 'date', group: ID_G },
	{
		key: k('summary'),
		label: 'Summary of request',
		type: 'longtext',
		group: REQ,
		help: 'Describe in detail all significant functional and/or psycho-social changes since the current Service Plan was written that are the basis for this addendum, why the plan needs to change, and the specific goals of each HCBS/TBI waiver service being requested.'
	},
	{
		key: k('statePlan'),
		label: 'Medicaid State Plan services: addendum details',
		type: 'table',
		group: COST,
		rows: 5,
		help: 'Row N here adds to row N of "Medicaid State Plan and other services". Total cost is rate × annual units if left blank.',
		columns: [
			{ id: 'effectiveDate', label: 'Effective date', type: 'date' },
			{ id: 'annualUnits', label: 'Annual amount of units', type: 'number' },
			{ id: 'rate', label: 'Rate', type: 'money' },
			{ id: 'cost', label: 'Total annual cost', type: 'money' }
		]
	},
	{
		key: k('statePlanOldCost'),
		label: 'Old annual cost of Medicaid State Plan services',
		type: 'money',
		group: COST
	},
	{
		key: k('waiver'),
		label: 'HCBS/TBI waiver services: addendum details',
		type: 'table',
		group: COST,
		rows: 4,
		help: 'Row N here adds to row N of "Waiver services" (which supplies the service, provider, frequency and total cost).',
		columns: [
			{ id: 'effectiveDate', label: 'Effective date', type: 'date' },
			{ id: 'annualUnits', label: 'Annual amount of units', type: 'number' },
			{ id: 'rate', label: 'Rate', type: 'money' }
		]
	},
	{
		key: k('waiverOldCost'),
		label: 'Old annual cost of HCBS/TBI waiver services',
		type: 'money',
		group: COST
	}
];

const fields: FieldDef[] = [
	// Page 1: identification
	{ src: 'participant.name', to: { page: 0, x: 128, y: 599.2, maxWidth: 205 } },
	{ src: 'participant.cin', to: { page: 0, x: 408, y: 599.2, maxWidth: 150 } },
	{ src: 'participant.dob', to: { page: 0, x: 165, y: 570.2, maxWidth: 170 } },
	{
		src: 'participant.address',
		to: { page: 0, x: 391, y: 570.2, maxWidth: 168, lines: 2, lineHeight: 11, size: 8.5 }
	},
	{ src: 'participant.injury.onsetDate', to: { page: 0, x: 171, y: 541.2, maxWidth: 165 } },
	{ src: 'participant.injury.ageAtOnset', to: { page: 0, x: 166, y: 512.2, maxWidth: 170 } },
	{
		src: 'participant.countyFiscalResponsibility',
		to: { page: 0, x: 491, y: 512.2, maxWidth: 70 }
	},
	{
		src: 'participant.diagnosis',
		to: { page: 0, x: 148, y: 483.3, maxWidth: 190, lines: 2, lineHeight: 10, size: 8 }
	},
	{ src: 'participant.medicareNumber', to: { page: 0, x: 410, y: 483.3, maxWidth: 150 } },
	{ src: 'participant.ssn', to: { page: 0, x: 123, y: 454.3, maxWidth: 160 } },
	{ src: 'participant.otherInsurance', to: { page: 0, x: 435, y: 454.3, maxWidth: 125 } },
	...[374, 361.5, 349, 336.3].flatMap((y, r): FieldDef[] =>
		(
			[
				['name', 88],
				['relationship', 248],
				['phone', 407]
			] as const
		).map(([col, x]) => ({
			src: cell(k('planningTeam'), r, col),
			to: { page: 0, x, y, size: 8, maxWidth: 152 }
		}))
	),
	{ src: 'serviceCoordinator.name', to: { page: 0, x: 196, y: 310.9, maxWidth: 360 } },
	{ src: 'scAgency.name', to: { page: 0, x: 134, y: 298.8, maxWidth: 420 } },
	{ src: 'scAgency.address', to: { page: 0, x: 137, y: 286.7, maxWidth: 420 } },
	{ src: 'serviceCoordinator.phone', to: { page: 0, x: 140, y: 264, maxWidth: 200 } },
	{ src: k('submissionDate'), to: { page: 0, x: 362, y: 240, maxWidth: 90 } },
	{ src: k('planFrom'), to: { page: 0, x: 177, y: 215.5, maxWidth: 55 } },
	{ src: k('planTo'), to: { page: 0, x: 249, y: 215.5, maxWidth: 75 } },
	// "Date of Decision" is the RRDS's.

	// Page 2: II. Summary of request (open page)
	{
		src: k('summary'),
		to: { page: 1, x: 90, y: 634, size: 10, lineHeight: 13, lines: 44, maxWidth: 432 }
	},

	// Page 3 (landscape): Medicaid State Plan services
	...[0, 1, 2, 3, 4].flatMap((r): FieldDef[] => [
		{ src: cell('services.statePlan', r, 'type'), to: landCell(2, SP_ROWS, r, 'type') },
		{ src: cell('services.statePlan', r, 'provider'), to: landCell(2, SP_ROWS, r, 'provider') },
		{ src: cell(k('statePlan'), r, 'effectiveDate'), to: landCell(2, SP_ROWS, r, 'effective') },
		{ src: cell('services.statePlan', r, 'frequency'), to: landCell(2, SP_ROWS, r, 'frequency') },
		{ src: cell(k('statePlan'), r, 'annualUnits'), to: landCell(2, SP_ROWS, r, 'units') },
		{ src: cell(k('statePlan'), r, 'rate'), to: landCell(2, SP_ROWS, r, 'rate') },
		{
			src: (d) => {
				const c = statePlanCost(d, r);
				return c === undefined ? undefined : formatMoney(String(c));
			},
			needs: [cell('services.statePlan', r, 'type')],
			label: `State Plan service ${r + 1}: total annual cost`,
			to: landCell(2, SP_ROWS, r, 'cost')
		}
	]),
	{
		src: extraRows('services.statePlan', 5, (d, r) =>
			join(
				str(d, cell('services.statePlan', r, 'type')),
				str(d, cell('services.statePlan', r, 'provider')),
				str(d, cell('services.statePlan', r, 'frequency')),
				formatMoney(String(statePlanCost(d, r) ?? ''))
			)
		),
		label: 'Medicaid State Plan services (more rows)',
		to: { page: 2, x: 433, y: 50, rotate: 90, size: 7, maxWidth: 640 }
	},
	{
		src: money(statePlanTotal),
		needs: ['services.statePlan'],
		label: 'Projected total annual cost of Medicaid State Plan services',
		to: { page: 2, x: 452.5, y: 450, rotate: 90, maxWidth: 170 }
	},
	{ src: k('statePlanOldCost'), to: { page: 2, x: 470.6, y: 450, rotate: 90, maxWidth: 170 } },
	{
		src: diff(statePlanTotal, (d) => num(d, k('statePlanOldCost'))),
		needs: [k('statePlanOldCost')],
		label: 'State Plan services: difference',
		to: { page: 2, x: 488.7, y: 450, rotate: 90, maxWidth: 170 }
	},

	// Page 4 (landscape): HCBS/TBI waiver services
	...[0, 1, 2, 3].flatMap((r): FieldDef[] => [
		{ src: cell('services', r, 'type'), to: landCell(3, W_ROWS, r, 'type') },
		{ src: cell('services', r, 'provider'), to: landCell(3, W_ROWS, r, 'provider') },
		{ src: cell(k('waiver'), r, 'effectiveDate'), to: landCell(3, W_ROWS, r, 'effective') },
		{ src: cell('services', r, 'units'), to: landCell(3, W_ROWS, r, 'frequency') },
		{ src: cell(k('waiver'), r, 'annualUnits'), to: landCell(3, W_ROWS, r, 'units') },
		{ src: cell(k('waiver'), r, 'rate'), to: landCell(3, W_ROWS, r, 'rate') },
		{ src: cell('services', r, 'cost'), to: landCell(3, W_ROWS, r, 'cost') }
	]),
	{
		src: extraRows('services', 4, (d, r) =>
			join(
				str(d, cell('services', r, 'type')),
				str(d, cell('services', r, 'provider')),
				str(d, cell('services', r, 'units')),
				formatMoney(str(d, cell('services', r, 'cost')))
			)
		),
		label: 'HCBS/TBI waiver services (more rows)',
		to: { page: 3, x: 382, y: 50, rotate: 90, size: 7, maxWidth: 640 }
	},
	{
		src: money(waiverTotal),
		needs: ['services'],
		label: 'Projected total annual cost of HCBS/TBI waiver services',
		to: { page: 3, x: 403.8, y: 414, rotate: 90, maxWidth: 220 }
	},
	{ src: k('waiverOldCost'), to: { page: 3, x: 421.9, y: 414, rotate: 90, maxWidth: 220 } },
	{
		src: diff(waiverTotal, (d) => num(d, k('waiverOldCost'))),
		needs: [k('waiverOldCost')],
		label: 'Waiver services: difference',
		to: { page: 3, x: 440, y: 414, rotate: 90, maxWidth: 220 }
	},
	{
		src: money(allTotal),
		label: 'Projected total annual cost of all Medicaid services',
		to: { page: 3, x: 476.2, y: 414, rotate: 90, maxWidth: 220 }
	},
	{
		src: money(allOld),
		label: 'All Medicaid services: old cost',
		to: { page: 3, x: 494.2, y: 414, rotate: 90, maxWidth: 220 }
	},
	{
		src: diff(allTotal, allOld),
		label: 'All Medicaid services: difference',
		to: { page: 3, x: 512.4, y: 414, rotate: 90, maxWidth: 220 }
	}

	// Page 5: signatures and the RRDS determination are completed by hand.
];

/** Continuation-page label for a table cell key ("<table>.<row>.<col>"). */
function withCellLabels(list: FieldDef[], own: Question[]): FieldDef[] {
	const all = [...own, ...sharedQuestions];
	return list.map((f) => {
		if (f.label || typeof f.src !== 'string') return f;
		const m = /^(.*)\.(\d+)\.([^.]+)$/.exec(f.src);
		const q = m && all.find((q) => q.key === m[1]);
		const col = m && q?.columns?.find((c) => c.id === m[3]);
		return m && q && col ? { ...f, label: `${q.label}, row ${Number(m[2]) + 1}: ${col.label}` } : f;
	});
}

export const tbiC43: FormDef = {
	id: ID,
	code: 'TBI C-4.3',
	title: 'Addendum to Existing Service Plan',
	file: 'tbi-c4-3-2009.pdf',
	revision: 'July 2009',
	sourceUrl: 'https://www.health.ny.gov/health_care/medicaid/reference/tbi/docs/c4_3.pdf',
	legacy2009: true,
	stage: 'ongoing',
	roles: ['sc'],
	signers: [
		'Waiver participant',
		'Advocate / representative (if any)',
		'Service coordinator',
		'Service coordinator supervisor',
		'RRDS'
	],
	when: 'Whenever services change between service plans. The RRDS reviews it within 5 business days; an emergency increase in services needs an addendum within 2 business days.',
	questions,
	fields: withCellLabels(fields, questions)
};
