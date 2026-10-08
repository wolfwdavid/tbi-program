import type { CaseData, FieldDef, FormDef, Question } from '../types.ts';
import { cell } from '../values.ts';

const ID = 'tbi-c1-3';
const k = (name: string) => `${ID}.${name}`;

const PLAN = 'Protective oversight';
const FIN = 'Protective oversight: finances';
const SAFE = 'Protective oversight: fire and safety';
const EMERG = 'Protective oversight: emergencies';
const MED = 'Protective oversight: medication';

const YN = ['Yes', 'No'];
const STATUS = ['Original plan', 'Revision of plan', 'No change since last submission'];
const SUPERVISION = [
	'Paid staff only',
	'A combination of natural and paid staff',
	'Natural supports only'
];
const CALLS = k('callList');

const yn = (name: string, label: string, group: string, optional = false): Question => ({
	key: k(name),
	label,
	type: 'select',
	group,
	options: YN,
	...(optional ? { optional } : {})
});
const text = (name: string, label: string, group: string, help?: string): Question => ({
	key: k(name),
	label,
	type: 'text',
	group,
	optional: true,
	...(help ? { help } : {})
});

/** X position centred in a printed "[ ]" whose brackets start at `open` and `close`. */
const box = (open: number, close = open + 14) => (open + 4.7 + close) / 2 - 3.35;

/** One X per printed "[ ]" option; `xs` are the boxes in the same order as `options`. */
function marks(key: string, options: string[], page: number, y: number, xs: number[]): FieldDef[] {
	return options.map((opt, i) => ({
		src: (d: CaseData) => d[key] === opt,
		...(i === 0 ? { needs: [key] } : {}),
		to: { page, x: xs[i], y, mark: true as const }
	}));
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/**
 * Default emergency call order: the emergency contact, then informal supports with a phone
 * number (skipping anyone already listed with the same number).
 */
function defaultCallList(d: CaseData) {
	const supports: { name: string; phone: string; relationship: string }[] = [];
	for (let i = 0; i < 6; i++) {
		const name = str(d[cell('supports.informal', i, 'name')]);
		const phone = str(d[cell('supports.informal', i, 'phone')]);
		if (name && phone)
			supports.push({
				name,
				phone,
				relationship: str(d[cell('supports.informal', i, 'relationship')])
			});
	}
	const list: typeof supports = [];
	const ecName = str(d['participant.emergencyContact.name']);
	const ecPhone = str(d['participant.emergencyContact.phone']);
	if (ecName) {
		const match = supports.find((s) => s.phone === ecPhone);
		list.push({ name: ecName, phone: ecPhone, relationship: match?.relationship ?? '' });
	}
	for (const s of supports) if (!list.some((l) => l.phone === s.phone)) list.push(s);
	return list;
}

const questions: Question[] = [
	{ key: k('dateSubmitted'), label: 'Date submitted', type: 'date', group: PLAN },
	{ key: k('status'), label: 'This plan is', type: 'select', group: PLAN, options: STATUS },

	yn('ownFinances', 'Can the participant manage his/her own finances?', FIN),
	text('help.atm', 'Who helps with: ATM', FIN),
	text('help.banking', 'Who helps with: banking', FIN),
	text('help.bills', 'Who helps with: bill paying', FIN),
	text('help.budgeting', 'Who helps with: budgeting', FIN),
	text('help.checking', 'Who helps with: checking account', FIN),
	{
		...yn('repPayee', 'Does the participant request a representative payee?', FIN, true),
		help: 'Leave blank to answer Yes when a representative payee is named.'
	},

	yn('egress', 'Can the participant use the various means of egress in his/her home?', SAFE),
	{
		key: k('fireArrangements'),
		label:
			'If not, have other arrangements been made so the participant is as safe as possible in a fire?',
		type: 'select',
		group: SAFE,
		options: ['Yes', 'No', 'Not applicable']
	},
	{
		key: k('precautions'),
		label: 'Extra fire precautions',
		type: 'longtext',
		group: SAFE,
		optional: true
	},
	yn('unsteady', 'Does the participant tend to be unsteady in his/her balance?', SAFE),
	text('fallMeasures', 'If yes, measures taken to reduce falls in the home', SAFE),
	yn('kitchenSafe', 'Is the participant safe within the kitchen?', SAFE),
	text('kitchenUnsafe', 'If not, which kitchen activities may be unsafe', SAFE),
	text(
		'kitchenActions',
		'Actions taken to keep the participant as safe as possible in the kitchen',
		SAFE
	),

	yn('supervision24', 'Is the participant receiving 24-hour supervision?', EMERG),
	{
		key: k('supervisionBy'),
		label: '24-hour supervision is provided by',
		type: 'select',
		group: EMERG,
		options: SUPERVISION,
		optional: true
	},
	yn(
		'backupPlan',
		'Is a back-up plan for 24-hour supervision defined in the Service Plan?',
		EMERG,
		true
	),
	{
		key: CALLS,
		label: 'Emergency call list, in calling order',
		type: 'table',
		group: EMERG,
		rows: 4,
		help: 'Leave blank to list the emergency contact, then informal supports with a phone number.',
		columns: [
			{ id: 'name', label: 'Name' },
			{ id: 'phone', label: 'Telephone', type: 'phone' },
			{ id: 'relationship', label: 'Relationship' }
		]
	},
	yn('pers', 'Does the participant have a Personal Emergency Response System?', EMERG),
	text('otherDevices', 'Other safety systems, devices or supports provided', EMERG),

	yn('takesMeds', 'Is the participant presently taking prescribed medication?', MED),
	yn('medsIndependent', 'Can the participant consistently take medication independently?', MED),
	text('cueing', 'If assistance is needed, what visual and verbal cueing is needed', MED),
	yn('prePour', 'Does the participant have help with pre-pouring medication?', MED),
	text('prePourWho', 'Who provides the pre-pouring assistance', MED),
	text('prePourConsider', 'If no pre-pouring help, should it be considered?', MED),
	{
		key: k('medContact.name'),
		label: 'Contact for medication concerns: name',
		type: 'text',
		group: MED
	},
	{
		key: k('medContact.relationship'),
		label: 'Contact for medication concerns: relationship',
		type: 'text',
		group: MED
	},
	{
		key: k('medContact.phone'),
		label: 'Contact for medication concerns: phone',
		type: 'phone',
		group: MED
	},
	{
		key: k('foodContact.name'),
		label: 'Contact if food intake changes: name',
		type: 'text',
		group: MED
	},
	{
		key: k('foodContact.relationship'),
		label: 'Contact if food intake changes: relationship',
		type: 'text',
		group: MED
	},
	{
		key: k('foodContact.phone'),
		label: 'Contact if food intake changes: phone',
		type: 'phone',
		group: MED
	},
	{
		key: k('comments'),
		label: 'Additional comments',
		type: 'longtext',
		group: PLAN,
		optional: true
	}
];

/** Baselines of the four "Name / Relationship / Phone" rows on page 1. */
const PEOPLE = [499.3, 474.1, 448.8, 423.4];
/** Baselines of the four emergency call list rows on page 3. */
const CALL_ROWS = [627.5, 599.5, 571.5, 543.5];

export const tbiC13: FormDef = {
	id: ID,
	code: 'TBI C-1.3',
	title: 'Plan for Protective Oversight',
	file: 'tbi-c1-3-2009.pdf',
	revision: 'July 2009',
	sourceUrl: 'https://www.health.ny.gov/health_care/medicaid/reference/tbi/docs/c1_3.pdf',
	legacy2009: true,
	stage: 'plan',
	roles: ['sc'],
	signers: [
		'Waiver participant',
		'Advocate / representative (if any)',
		'Service coordinator',
		'SC supervisor',
		'Natural supports',
		'RRDS'
	],
	when: 'With the initial service plan, every revised plan and addendum; reviewed by the service coordinator at least every six months and right after any related incident.',
	questions,
	fields: [
		// Page 1: header
		{ src: 'participant.name', to: { page: 0, x: 82, y: 675.5, maxWidth: 196 } },
		{ src: 'participant.phone', to: { page: 0, x: 358, y: 675.5, maxWidth: 110 } },
		{
			src: 'participant.address',
			to: { page: 0, x: 94, y: 648, lines: 2, lineHeight: 27.6, maxWidth: 188 }
		},
		{ src: 'participant.cin', to: { page: 0, x: 345, y: 648, maxWidth: 124 } },
		{ src: k('dateSubmitted'), to: { page: 0, x: 399, y: 620.4, maxWidth: 70 } },
		...STATUS.map((opt, i): FieldDef => ({
			src: (d) => d[k('status')] === opt,
			...(i === 0 ? { needs: [k('status')] } : {}),
			to: { page: 0, x: box(36), y: [590.8, 577, 563.2][i], mark: true }
		})),

		// Page 1: people listed in the plan (informal supports; work phone left for hand entry)
		...PEOPLE.flatMap((y, i): FieldDef[] => [
			{
				src: cell('supports.informal', i, 'name'),
				label: `Person ${i + 1} in plan: name`,
				to: { page: 0, x: 75, y, size: 8, maxWidth: 82 }
			},
			{
				src: cell('supports.informal', i, 'relationship'),
				label: `Person ${i + 1} in plan: relationship`,
				to: { page: 0, x: 235, y, size: 8, maxWidth: 55 }
			},
			{
				src: cell('supports.informal', i, 'phone'),
				label: `Person ${i + 1} in plan: home phone`,
				to: { page: 0, x: 364, y, size: 8, maxWidth: 60 }
			}
		]),

		// I. Finances
		...marks(k('ownFinances'), YN, 0, 367.7, [box(432), box(501.4, 512.1)]),
		{ src: k('help.atm'), to: { page: 0, x: 180, y: 300.7, maxWidth: 176 } },
		{ src: k('help.banking'), to: { page: 0, x: 201, y: 273.1, maxWidth: 156 } },
		{ src: k('help.bills'), to: { page: 0, x: 215, y: 245.5, maxWidth: 143 } },
		{ src: k('help.budgeting'), to: { page: 0, x: 213, y: 217.9, maxWidth: 143 } },
		{ src: k('help.checking'), to: { page: 0, x: 208, y: 190.3, maxWidth: 149 } },
		{
			src: (d) =>
				d[k('repPayee')] === 'Yes' || (!d[k('repPayee')] && !!str(d['participant.repPayee'])),
			needs: [k('repPayee')],
			to: { page: 0, x: box(458.8), y: 160.7, mark: true }
		},
		{ src: (d) => d[k('repPayee')] === 'No', to: { page: 0, x: box(501.4), y: 160.7, mark: true } },
		{ src: 'participant.repPayee', to: { page: 0, x: 110, y: 135.1, maxWidth: 423 } },

		// II. Fire and safety (page 2)
		...marks(k('egress'), YN, 1, 689.6, [box(108), box(180)]),
		...marks(k('fireArrangements'), ['Yes', 'No', 'Not applicable'], 1, 634.4, [
			box(108),
			box(180),
			box(288.1)
		]),
		{
			src: k('precautions'),
			to: { page: 1, x: 110, y: 581.3, lines: 2, lineHeight: 27.6, maxWidth: 423 }
		},
		...marks(k('unsteady'), YN, 1, 510.2, [box(108), box(180)]),
		{ src: k('fallMeasures'), to: { page: 1, x: 110, y: 457, maxWidth: 423 } },
		...marks(k('kitchenSafe'), YN, 1, 427.4, [box(396), box(468)]),
		{ src: k('kitchenUnsafe'), to: { page: 1, x: 110, y: 401.8, maxWidth: 416 } },
		{ src: k('kitchenActions'), to: { page: 1, x: 110, y: 346.7, maxWidth: 463 } },

		// III. Emergency plan
		...marks(k('supervision24'), YN, 1, 182.2, [box(432.7), box(495.4)]),
		...SUPERVISION.map((opt, i): FieldDef => ({
			src: (d) => d[k('supervisionBy')] === opt,
			to: { page: 1, x: box(252), y: [168.4, 154.6, 140.8][i], mark: true }
		})),
		...marks(k('backupPlan'), YN, 1, 99.4, [box(399.4), box(458.7)]),

		// Page 3: emergency call list (form answers, else emergency contact + informal supports)
		...CALL_ROWS.flatMap((y, row): FieldDef[] =>
			(['name', 'phone', 'relationship'] as const).map((col, c) => ({
				src: (d: CaseData) => d[cell(CALLS, row, col)] || defaultCallList(d)[row]?.[col],
				...(row === 0 && col === 'name' ? { needs: ['participant.emergencyContact.name'] } : {}),
				label: `Emergency call list ${row + 1}`,
				to: { page: 2, x: [70, 218, 366][c], y, maxWidth: 140 }
			}))
		),
		...marks(k('pers'), YN, 2, 493.4, [box(108), box(180)]),
		{ src: k('otherDevices'), to: { page: 2, x: 110, y: 440.2, maxWidth: 423 } },

		// IV. Medication
		...marks(k('takesMeds'), YN, 2, 369.3, [box(108), box(180)]),
		...marks(k('medsIndependent'), YN, 2, 327.9, [box(215.9), box(288)]),
		{ src: k('cueing'), to: { page: 2, x: 110, y: 274.7, maxWidth: 423 } },
		{
			src: (d) => d[k('prePour')] === 'Yes',
			needs: [k('prePour')],
			to: { page: 2, x: box(108), y: 231.3, mark: true }
		},
		{ src: (d) => d[k('prePour')] === 'No', to: { page: 2, x: box(108), y: 217.5, mark: true } },
		{ src: k('prePourWho'), to: { page: 2, x: 342, y: 233.3, maxWidth: 170 } },
		{ src: k('prePourConsider'), to: { page: 2, x: 355, y: 219.5, maxWidth: 157 } },
		{ src: k('medContact.name'), to: { page: 2, x: 110, y: 123, maxWidth: 150 } },
		{ src: k('medContact.relationship'), to: { page: 2, x: 280, y: 123, maxWidth: 124 } },
		{ src: k('medContact.phone'), to: { page: 2, x: 417, y: 123, maxWidth: 117 } },

		// Page 4
		{ src: k('foodContact.name'), to: { page: 3, x: 110, y: 746.9, maxWidth: 163 } },
		{ src: k('foodContact.relationship'), to: { page: 3, x: 287, y: 746.9, maxWidth: 143 } },
		{ src: k('foodContact.phone'), to: { page: 3, x: 444, y: 746.9, maxWidth: 90 } },
		{ src: k('comments'), to: { page: 3, x: 38, y: 664, lines: 6, lineHeight: 22, maxWidth: 535 } }
		// Signatures (page 4) and the RRDS comment, signature, name, title and date (pages 4-5) are left blank.
	]
};
