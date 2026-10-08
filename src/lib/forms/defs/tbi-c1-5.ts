import type { CaseData, FieldDef, FormDef, Question, Value } from '../types.ts';
import { cell } from '../values.ts';

const ID = 'tbi-c1-5';
const G = 'Contact list';
const SVC = `${ID}.services`;

const DAYS = [
	'Monday to Friday',
	'Monday to Saturday',
	'Seven days a week',
	'Other (circle by hand)'
];
/** Day indexes (Mon = 0) circled for each answer. */
const DAY_RUNS: Record<string, [number, number]> = {
	'Monday to Friday': [0, 4],
	'Monday to Saturday': [0, 5],
	'Seven days a week': [0, 6]
};

/** Printed x extents of Mon..Fri; Sat/Sun move between blocks. */
const WEEKDAYS: [number, number][] = [
	[265.8, 292.8],
	[303.7, 334.3],
	[345.2, 373.0],
	[383.9, 420.4],
	[431.3, 448.1]
];
const WEEKEND_SC: [number, number][] = [
	[480.8, 501.2],
	[508.5, 533.3]
];
const WEEKEND: [number, number][] = [
	[495.5, 515.9],
	[523.2, 548.0]
];

const str = (v: Value) => (typeof v === 'string' ? v.trim() : '');

/** "17:30" → { hour: "5", minute: "30", pm: true }. */
function splitTime(v: Value) {
	const m = /^(\d{1,2}):(\d{2})$/.exec(str(v));
	if (!m) return undefined;
	const h = Number(m[1]);
	return { hour: String(h % 12 || 12), minute: m[2], pm: h >= 12 };
}

/** Waiver services other than service coordination, from the shared services table. */
function otherServices(d: CaseData) {
	const out: { type: string; provider: string }[] = [];
	for (let i = 0; i < 10; i++) {
		const type = str(d[cell('services', i, 'type')]);
		const provider = str(d[cell('services', i, 'provider')]);
		if ((type || provider) && type !== 'Service Coordination') out.push({ type, provider });
	}
	return out;
}

/**
 * Hours of operation printed as "__:__ AM to __:__ PM". The hour and minute go either side of
 * the printed colon. `letter` is set where the form prints only "M" after the closing time.
 */
function hours(
	page: number,
	y: number,
	openKey: string,
	closeKey: string,
	at: { openHour: number; openMin: number; closeHour: number; closeMin: number; letter?: number }
): FieldDef[] {
	const part = (key: string, k: 'hour' | 'minute') => (d: CaseData) => splitTime(d[key])?.[k] ?? '';
	const fields: FieldDef[] = [
		{
			src: part(openKey, 'hour'),
			needs: [openKey],
			label: 'Opening time',
			to: { page, x: at.openHour, y, maxWidth: 24 }
		},
		{
			src: part(openKey, 'minute'),
			label: 'Opening time',
			to: { page, x: at.openMin, y, maxWidth: 28 }
		},
		{
			src: part(closeKey, 'hour'),
			needs: [closeKey],
			label: 'Closing time',
			to: { page, x: at.closeHour, y, maxWidth: 24 }
		},
		{
			src: part(closeKey, 'minute'),
			label: 'Closing time',
			to: { page, x: at.closeMin, y, maxWidth: 22 }
		}
	];
	if (at.letter !== undefined) {
		fields.push({
			src: (d) => {
				const t = splitTime(d[closeKey]);
				return t ? (t.pm ? 'P' : 'A') : '';
			},
			label: 'Closing time',
			to: { page, x: at.letter, y, maxWidth: 8 }
		});
	}
	return fields;
}

/** "Circle" the days of operation with a pair of brackets around each run of days. */
function days(page: number, y: number, key: string, weekend: [number, number][]): FieldDef[] {
	const spots = [...WEEKDAYS, ...weekend];
	const run = (d: CaseData) => DAY_RUNS[str(d[key])];
	return [
		{
			src: (d) => (run(d) ? '(' : ''),
			needs: [key],
			label: 'Days of operation',
			to: { page, x: spots[0][0] - 7.5, y, size: 18, maxWidth: 10 }
		},
		...spots.map(([, end], i): FieldDef => ({
			src: (d) => (run(d)?.[1] === i ? ')' : ''),
			label: 'Days of operation',
			to: { page, x: end + 0.8, y, size: 18, maxWidth: 10 }
		}))
	];
}

const questions: Question[] = [
	{ key: `${ID}.date`, label: 'Date of this contact list', type: 'date', group: G },
	{
		key: `${ID}.poContact.name`,
		label: 'Protective oversight contact',
		type: 'text',
		group: G,
		optional: true,
		help: 'Leave blank to use the emergency contact.'
	},
	{
		key: `${ID}.poContact.phone`,
		label: 'Protective oversight contact phone',
		type: 'phone',
		group: G,
		optional: true
	},
	{
		key: `${ID}.scSupervisorPhone`,
		label: 'SC supervisor telephone',
		type: 'phone',
		group: G,
		optional: true,
		help: 'Leave blank to use the agency phone.'
	},
	{ key: `${ID}.scOpen`, label: 'SC agency opens at', type: 'time', group: G },
	{ key: `${ID}.scClose`, label: 'SC agency closes at', type: 'time', group: G },
	{
		key: `${ID}.scDays`,
		label: 'SC agency days of operation',
		type: 'select',
		group: G,
		options: DAYS
	},
	{ key: `${ID}.rrdsPhone`, label: 'RRDS telephone', type: 'phone', group: G },
	{ key: `${ID}.rrdsSupervisor`, label: 'RRDS supervisor', type: 'text', group: G, optional: true },
	{
		key: `${ID}.rrdsSupervisorPhone`,
		label: 'RRDS supervisor telephone',
		type: 'phone',
		group: G,
		optional: true
	},
	{ key: `${ID}.rrdcOpen`, label: 'RRDC opens at', type: 'time', group: G },
	{ key: `${ID}.rrdcClose`, label: 'RRDC closes at', type: 'time', group: G },
	{
		key: `${ID}.rrdcDays`,
		label: 'RRDC days of operation',
		type: 'select',
		group: G,
		options: DAYS
	},
	{
		key: SVC,
		label: 'Waiver service contacts (page 2)',
		type: 'table',
		group: G,
		rows: 4,
		help: 'Service and agency default to the waiver services listed for this case (other than service coordination).',
		columns: [
			{ id: 'service', label: 'Service' },
			{ id: 'staff', label: 'Staff name' },
			{ id: 'staffPhone', label: 'Staff telephone', type: 'phone' },
			{ id: 'supervisor', label: 'Supervisor' },
			{ id: 'supervisorPhone', label: 'Supervisor telephone', type: 'phone' },
			{ id: 'agency', label: 'Agency' },
			{ id: 'open', label: 'Opens at', type: 'time' },
			{ id: 'close', label: 'Closes at', type: 'time' },
			{ id: 'days', label: 'Days of operation', type: 'select', options: DAYS }
		]
	}
];

/** Baseline of the "Service" line of each block on page 2. */
const BLOCKS = [690.8, 548.4, 390.0, 247.5];

function serviceBlock(row: number, top: number): FieldDef[] {
	const c = (col: string) => cell(SVC, row, col);
	const fallback = (k: 'type' | 'provider') => (d: CaseData) =>
		d[c(k === 'type' ? 'service' : 'agency')] || otherServices(d)[row]?.[k];
	const y = (offset: number) => top - offset + 2;
	const n = row + 1;
	return [
		{
			src: fallback('type'),
			label: `Service ${n}`,
			to: { page: 1, x: 95, y: y(0), maxWidth: 472 }
		},
		{ src: c('staff'), to: { page: 1, x: 78, y: y(30.1), maxWidth: 250 } },
		{ src: c('staffPhone'), to: { page: 1, x: 403, y: y(30.1), maxWidth: 172 } },
		{ src: c('supervisor'), to: { page: 1, x: 111, y: y(60), maxWidth: 214 } },
		{ src: c('supervisorPhone'), to: { page: 1, x: 403, y: y(60), maxWidth: 172 } },
		{
			src: fallback('provider'),
			label: `Service ${n} agency`,
			to: { page: 1, x: 89, y: y(89.8), size: 8, maxWidth: 148 }
		},
		...hours(1, y(89.8), c('open'), c('close'), {
			openHour: 372,
			openMin: 403,
			closeHour: 498,
			closeMin: 531,
			letter: 551.5
		}),
		...days(1, top - 119.7, c('days'), WEEKEND)
	];
}

export const tbiC15: FormDef = {
	id: ID,
	code: 'TBI C-1.5',
	title: 'Waiver Services Contact List',
	file: 'tbi-c1-5-2009.pdf',
	revision: 'July 2009',
	sourceUrl: 'https://www.health.ny.gov/health_care/medicaid/reference/tbi/docs/c1_5.pdf',
	legacy2009: true,
	stage: 'plan',
	roles: ['sc'],
	signers: [],
	when: "With the initial service plan; update it whenever a service or contact changes and at least yearly. A current copy must be kept in the participant's home.",
	questions,
	fields: [
		// Page 1
		{ src: 'participant.name', to: { page: 0, x: 38, y: 568, maxWidth: 420 } },
		{ src: `${ID}.date`, to: { page: 0, x: 470, y: 568, maxWidth: 100 } },
		{
			src: (d) => d[`${ID}.poContact.name`] || d['participant.emergencyContact.name'],
			needs: ['participant.emergencyContact.name'],
			label: 'Protective oversight contact',
			to: { page: 0, x: 195, y: 526.2, maxWidth: 214 }
		},
		{
			src: (d) => d[`${ID}.poContact.phone`] || d['participant.emergencyContact.phone'],
			needs: ['participant.emergencyContact.phone'],
			label: 'Protective oversight contact phone',
			to: { page: 0, x: 453, y: 526.2, maxWidth: 117 }
		},

		{ src: 'serviceCoordinator.name', to: { page: 0, x: 78, y: 462.5, maxWidth: 234 } },
		{ src: 'serviceCoordinator.phone', to: { page: 0, x: 389, y: 462.5, maxWidth: 185 } },
		{ src: 'scSupervisor.name', to: { page: 0, x: 111, y: 432.7, maxWidth: 198 } },
		{
			src: (d) => d[`${ID}.scSupervisorPhone`] || d['scAgency.phone'],
			needs: ['scAgency.phone'],
			label: 'SC supervisor telephone',
			to: { page: 0, x: 385, y: 432.7, maxWidth: 185 }
		},
		{ src: 'scAgency.name', to: { page: 0, x: 89, y: 402.9, size: 8, maxWidth: 148 } },
		...hours(0, 402.9, `${ID}.scOpen`, `${ID}.scClose`, {
			openHour: 372,
			openMin: 403,
			closeHour: 484,
			closeMin: 513
		}),
		...days(0, 371.0, `${ID}.scDays`, WEEKEND_SC),

		{ src: 'rrds.name', to: { page: 0, x: 78, y: 294.9, maxWidth: 248 } },
		{ src: `${ID}.rrdsPhone`, to: { page: 0, x: 403, y: 294.9, maxWidth: 172 } },
		{ src: `${ID}.rrdsSupervisor`, to: { page: 0, x: 111, y: 265.1, maxWidth: 212 } },
		{ src: `${ID}.rrdsSupervisorPhone`, to: { page: 0, x: 399, y: 265.1, maxWidth: 172 } },
		{ src: 'rrdc.name', to: { page: 0, x: 89, y: 235.3, size: 8, maxWidth: 148 } },
		...hours(0, 235.3, `${ID}.rrdcOpen`, `${ID}.rrdcClose`, {
			openHour: 372,
			openMin: 403,
			closeHour: 498,
			closeMin: 531,
			letter: 551.5
		}),
		...days(0, 203.5, `${ID}.rrdcDays`, WEEKEND),
		// Complaint line hours are the State's, not the case's: left blank.

		// Page 2: one block per waiver service.
		...BLOCKS.flatMap((top, row) => serviceBlock(row, top))
	]
};
