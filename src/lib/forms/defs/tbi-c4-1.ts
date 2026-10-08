import type {
	CaseData,
	Column,
	FieldDef,
	FormDef,
	MarkTarget,
	Question,
	QuestionType,
	TextTarget,
	Value
} from '../types.ts';
import { cell, formatDate, formatMoney, rowCount } from '../values.ts';
import { sharedQuestions } from '../questions.ts';

// TBI C-4.1 Revised Service Plan (Rev. March 2009), flat PDF, 16 pages.
// Pages 12-14 and 16 are landscape (/Rotate 90). Text there is drawn with rotate 90 in the
// page's unrotated space: a table row is a band of x (top of the turned page = small x) and a
// column is a band of y (left of the turned page = small y). Successive lines step +x.
// Checkbox positions are the pdfium character boxes of the printed box glyphs.

const ID = 'tbi-c4-1';
const k = (name: string) => `${ID}.${name}`;

const COVER = 'Revised plan: cover memo';
const IDENT = 'Revised plan: identification';
const DATES = 'Revised plan: plan dates and eligibility';
const PHYS = 'Revised plan: I. physical / medical';
const COG = 'Revised plan: II. cognitive';
const LIVING = 'Revised plan: III. community living';
const SA = 'Revised plan: substance abuse';
const PSY = 'Revised plan: psychiatric';
const CJ = 'Revised plan: criminal justice';
const BEH = 'Revised plan: behavioral';
const VOC = 'Revised plan: vocational / education / volunteer';
const IV = 'Revised plan: IV. successes / barriers / concerns';
const REQ = 'Revised plan: waiver services requested';
const INC = 'Revised plan: income and resources';
const INS = 'Revised plan: insurance and Medicaid';
const MED = 'Revised plan: medications';
const COST = 'Revised plan: cost of services';
const WEEK = 'Revised plan: weekly schedule';

const questions: Question[] = [];
const fields: FieldDef[] = [];

// ---------- helpers ----------

const str = (d: CaseData, key: string) => {
	const v = d[key];
	return typeof v === 'string' ? v.trim() : '';
};
const num = (d: CaseData, key: string) => {
	const s = str(d, key).replace(/[$,\s]/g, '');
	const n = Number(s);
	return s !== '' && Number.isFinite(n) ? n : undefined;
};
/** Amount for a blank that already prints "$". */
const plain = (n: number) =>
	n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const any = (d: CaseData, ...keys: string[]) =>
	keys.some((key) => d[key] === true || str(d, key) !== '');
const list = (parts: string[]) => parts.filter(Boolean).join('; ');

function ask(
	name: string,
	label: string,
	type: QuestionType,
	group: string,
	extra: Partial<Question> = {}
): string {
	const key = k(name);
	questions.push({ key, label, type, group, ...extra });
	return key;
}
const put = (src: FieldDef['src'], to: FieldDef['to'], extra: Partial<FieldDef> = {}) =>
	void fields.push({ src, to, ...extra });

const at = (page: number, x: number, y: number, o: Partial<TextTarget> = {}): TextTarget => ({
	page,
	x,
	y,
	...o
});
/** An X inside a printed checkbox whose glyph box starts at (l, b). */
const box = (page: number, l: number, b: number): MarkTarget => ({
	page,
	x: l + 0.4,
	y: b + 0.4,
	mark: true,
	size: 7
});

/** A printed checkbox with its own yes/no question. */
function tick(name: string, label: string, group: string, page: number, l: number, b: number) {
	const key = ask(name, label, 'checkbox', group, { optional: true });
	put(key, box(page, l, b));
	return key;
}
/** Several checkboxes: [name, label, left, bottom]. */
const ticks = (group: string, page: number, items: [string, string, number, number][]) =>
	items.map(([name, label, l, b]) => tick(name, label, group, page, l, b));

/** A text blank; `mark` puts an X in its box whenever the text (or `also`) is answered. */
function blank(
	name: string,
	label: string,
	type: QuestionType,
	group: string,
	to: TextTarget,
	o: { mark?: MarkTarget; also?: string[]; optional?: boolean; help?: string } = {}
) {
	const key = ask(name, label, type, group, {
		optional: o.optional ?? true,
		...(o.help ? { help: o.help } : {})
	});
	put(key, to);
	if (o.mark) put((d) => any(d, key, ...(o.also ?? [])), o.mark);
	return key;
}

/** One-of-several printed boxes as a select question. */
function choose(
	name: string,
	label: string,
	group: string,
	page: number,
	options: [string, number, number][],
	extra: Partial<Question> = {}
) {
	const key = ask(name, label, 'select', group, {
		options: options.map(([o]) => o),
		optional: true,
		...extra
	});
	for (const [o, l, b] of options) put((d) => d[key] === o, box(page, l, b));
	return key;
}

/** "Who provides this" boxes: one checkbox per option plus an "Other:" box with its own blank. */
function who(
	prefix: string,
	title: string,
	group: string,
	page: number,
	opts: [string, string, number, number][],
	other: { l: number; b: number; x: number; maxWidth: number }
) {
	for (const [id, label, l, b] of opts)
		tick(`${prefix}.${id}`, `${title}: ${label}`, group, page, l, b);
	blank(
		`${prefix}.other`,
		`${title}: other (who)`,
		'text',
		group,
		at(page, other.x, other.b + 0.3, { maxWidth: other.maxWidth }),
		{
			mark: box(page, other.l, other.b)
		}
	);
}

/** Landscape cell: rows are x bands, columns are y bands. */
function land(page: number, x0: number, x1: number, y0: number, y1: number, size = 7): TextTarget {
	// Single-line rows get a slightly smaller font so more fits before overflowing.
	if (x1 - x0 < 20) size = Math.min(size, 6);
	const lineHeight = size + 1.2;
	return {
		page,
		x: x0 + size + 1.5,
		y: y0 + 2.5,
		rotate: 90,
		size,
		lineHeight,
		lines: Math.max(1, Math.floor((x1 - x0 - 3) / lineHeight)),
		maxWidth: y1 - y0 - 5
	};
}

const dateOf = (d: CaseData, key: string) => formatDate(str(d, key));

// ---------- Page 1: cover memo ----------

put('rrdc.name', at(0, 140, 678.2, { maxWidth: 400 }));
put('scAgency.name', at(0, 258, 609.3, { maxWidth: 300 }));
put(
	ask('submittedDate', 'Date the packet is sent to the RRDC', 'date', COVER),
	at(0, 99, 527.5, { maxWidth: 75 })
);
put('participant.name', at(0, 384, 481, { maxWidth: 152 }));
ticks(COVER, 0, [
	[
		'packet.review',
		'Packet includes: completed 6 Month Review form (with signature page)',
		68.4,
		439.1
	],
	[
		'packet.ppo',
		'Packet includes: current Plan of Protective Oversight (with signature page)',
		68.4,
		425.3
	],
	[
		'packet.isrs',
		'Packet includes: all relevant Individual Service Reports (with signatures)',
		68.4,
		411.5
	],
	['packet.contacts', 'Packet includes: Waiver Service Provider Contact List', 68.4, 397.7],
	['packet.medicaid', 'Packet includes: Medicaid Verification Form', 68.4, 383.9],
	['packet.rights', 'Packet includes: Waiver Rights and Responsibilities', 68.4, 370.1],
	['packet.minutes', 'Packet includes: Team Meeting minutes', 68.4, 356.3],
	['packet.schedule', 'Packet includes: Weekly Schedule', 68.0, 328.7]
]);
// Service Coordinator and supervisor signature/date lines are signed by hand.

// ---------- Page 2: 1. Identification ----------

put('participant.name', at(1, 103, 515.8, { maxWidth: 170 }));
put(
	'participant.address',
	at(1, 369, 515.8, { maxWidth: 205, lines: 2, lineHeight: 11, size: 8.5 })
);
put('participant.dob', at(1, 137, 488.2, { maxWidth: 140 }));
put('participant.injury.onsetDate', at(1, 140, 460.6, { maxWidth: 140 }));
put('participant.phone', at(1, 353, 460.6, { maxWidth: 220 }));
blank('cellPhone', 'Participant cell phone', 'phone', IDENT, at(1, 344, 446.8, { maxWidth: 225 }));
put('participant.injury.ageAtOnset', at(1, 139, 433, { maxWidth: 140 }));
put('participant.county', at(1, 393, 419.2, { maxWidth: 180 }));
put('participant.cin', at(1, 129, 405.4, { maxWidth: 135 }));
put('participant.countyFiscalResponsibility', at(1, 443, 405.4, { maxWidth: 130 }));
choose('veteran', 'Veteran of the US Armed Forces', IDENT, 1, [
	['Yes', 258.0, 377.8],
	['No', 286.3, 377.8]
]);
const ecAddress = ask('emergencyContactAddress', 'Emergency contact address', 'text', IDENT, {
	optional: true
});
put(
	(d) =>
		[
			str(d, 'participant.emergencyContact.name'),
			str(d, ecAddress),
			str(d, 'participant.emergencyContact.phone')
		]
			.filter(Boolean)
			.join(', ') || undefined,
	at(1, 70, 336, { maxWidth: 500, lines: 3, lineHeight: 11 }),
	{
		label: 'Emergency contact',
		needs: ['participant.emergencyContact.name', 'participant.emergencyContact.phone']
	}
);
const TEAM = ask(
	'planningTeam',
	'Individuals who participated in developing the service plan',
	'table',
	IDENT,
	{
		rows: 5,
		columns: [
			{ id: 'name', label: 'Name' },
			{ id: 'relationship', label: 'Relationship to the individual' },
			{ id: 'phone', label: 'Telephone', type: 'phone' }
		]
	}
);
[246.5, 232.2, 217.9, 203.6, 189].forEach((y, r) => {
	put(cell(TEAM, r, 'name'), at(1, 40, y, { maxWidth: 182, size: 8.5 }));
	put(cell(TEAM, r, 'relationship'), at(1, 230, y, { maxWidth: 156, size: 8.5 }));
	put(cell(TEAM, r, 'phone'), at(1, 396, y, { maxWidth: 180, size: 8.5 }));
});
put('serviceCoordinator.name', at(1, 173, 159.5, { maxWidth: 112, size: 8.5 }));
put('scAgency.name', at(1, 401, 159.5, { maxWidth: 176, size: 8.5 }));
put('scAgency.address', at(1, 152, 132, { maxWidth: 200, size: 8.5 }));
put('serviceCoordinator.phone', at(1, 393, 132, { maxWidth: 180 }));
put('serviceCoordinator.email', at(1, 147, 104.5, { maxWidth: 210 }));
put('scSupervisor.name', at(1, 228, 77, { maxWidth: 270 }));

// ---------- Page 3: supervisor email, plan dates, physical/medical ----------

blank(
	'scSupervisorEmail',
	'Service coordination supervisor email',
	'text',
	IDENT,
	at(2, 143, 709.5, { maxWidth: 248 })
);
blank(
	'previousPeriodFrom',
	'Previous Notice of Decision (NOD) period: from',
	'date',
	DATES,
	at(2, 324, 637, { maxWidth: 67 }),
	{
		optional: false
	}
);
blank(
	'previousPeriodTo',
	'Previous Notice of Decision (NOD) period: to',
	'date',
	DATES,
	at(2, 409, 637, { maxWidth: 55 }),
	{
		optional: false
	}
);
// The form asks for PRI and Screen dates; the 2025 manual uses the UAS-NY assessment instead,
// so its date goes on the PRI line, labelled, and the Screen line stays blank.
const loc = ask('locAssessmentDate', 'Level of care assessment (UAS-NY) date', 'date', DATES, {
	help: 'Printed on the form\'s "Patient Review Instrument (PRI)" line as "UAS-NY <date>". The Screen line is left blank.'
});
put(
	(d) => (str(d, loc) ? `UAS-NY ${dateOf(d, loc)}` : undefined),
	at(2, 328, 616.8, { maxWidth: 100 }),
	{
		needs: [loc],
		label: 'Level of care assessment (UAS-NY) date'
	}
);
choose(
	'locEligible',
	'Assessment shows the individual continues to meet TBI Waiver eligibility',
	DATES,
	2,
	[
		['Yes', 368.9, 588.7],
		['No', 405.8, 588.7]
	],
	{ optional: false }
);
blank(
	'rightsDate',
	'Date of most recent Waiver Rights and Responsibilities',
	'date',
	DATES,
	at(2, 343, 561.5, { maxWidth: 85 }),
	{
		optional: false
	}
);
choose(
	'addendum',
	'Was there an addendum during the plan period?',
	DATES,
	2,
	[
		['Yes', 221.4, 533.5],
		['No', 264.3, 533.5]
	],
	{ optional: false }
);
blank(
	'addendumExplain',
	'Addendum date(s) and explanation',
	'longtext',
	DATES,
	at(2, 70, 519, { maxWidth: 500, lines: 3, lineHeight: 11 })
);

ticks(PHYS, 2, [
	['mobility.wheelchair', 'Mobility: wheelchair', 68.4, 391.6],
	['mobility.power', 'Mobility: wheelchair is power', 104.4, 377.8],
	['mobility.manual', 'Mobility: wheelchair is manual', 150.3, 377.8],
	['mobility.walker', 'Mobility: walker', 68.4, 364.0]
]);
blank('mobility.other', 'Mobility: other', 'text', PHYS, at(2, 122, 350.6, { maxWidth: 125 }), {
	mark: box(2, 68.4, 350.2)
});
ticks(PHYS, 2, [
	['functional.transfers', 'Functional: assistance with transfers required', 284.0, 391.6],
	['functional.onePerson', 'Transfers: one person', 302.0, 377.8],
	['functional.twoPerson', 'Transfers: two person', 372.4, 377.8],
	['functional.mechanical', 'Transfers: mechanical', 440.4, 377.8]
]);
blank(
	'functional.equipment',
	'Adaptive equipment used for functional needs',
	'text',
	PHYS,
	at(2, 285, 350.4, { maxWidth: 250 }),
	{
		mark: box(2, 285.6, 364.0)
	}
);
ticks(PHYS, 2, [
	['diet.regular', 'Diet: regular', 68.4, 308.8],
	['diet.diabetic', 'Diet: diabetic', 182.4, 308.8],
	['diet.lowFat', 'Diet: low fat', 283.9, 308.8],
	['diet.thickened', 'Diet: thickened liquids', 398.4, 308.8],
	['diet.lowSodium', 'Diet: low sodium', 68.4, 295.0],
	['diet.tube', 'Diet: tube feeding', 182.4, 295.0],
	['diet.aspiration', 'Diet: aspiration precautions', 283.0, 295.0]
]);
blank('diet.other', 'Diet: other', 'text', PHYS, at(2, 122, 281.5, { maxWidth: 90 }), {
	mark: box(2, 68.4, 281.2)
});
ticks(PHYS, 2, [
	['vision.impaired', 'Vision: visually impaired', 68.4, 239.8],
	['vision.guideDog', 'Vision: guide dog', 183.6, 239.8],
	['vision.braille', 'Vision: uses Braille', 68.4, 226.0],
	['vision.prosthetic', 'Vision: eye prosthetic', 182.4, 226.0],
	['vision.blindRight', 'Vision: blind, right eye', 68.4, 212.2],
	['vision.blindLeft', 'Vision: blind, left eye', 68.4, 198.4],
	['vision.largePrint', 'Vision: requires large print', 68.4, 184.6],
	['vision.glasses', 'Vision: wears glasses / contacts', 68.4, 170.8],
	['hearing.difficultyRight', 'Hearing: difficulty, right ear', 320.4, 239.8],
	['hearing.difficultyLeft', 'Hearing: difficulty, left ear', 320.4, 226.0],
	['hearing.aidRight', 'Hearing: hearing aid, right ear', 320.4, 212.2],
	['hearing.aidLeft', 'Hearing: hearing aid, left ear', 320.4, 198.4],
	['hearing.signLanguage', 'Hearing: sign language', 320.4, 184.6],
	['communication.canMakeKnown', 'Communication: can make needs/wants known', 68.4, 129.4]
]);
blank(
	'communication.language',
	'Primary language other than English (which)',
	'text',
	PHYS,
	at(2, 263, 116, { maxWidth: 272 }),
	{
		mark: box(2, 68.0, 115.6)
	}
);
ticks(PHYS, 2, [
	['communication.aphasia', 'Communication: aphasia', 68.4, 101.8],
	['communication.simplified', 'Communication: use of simplified language', 176.0, 101.8],
	['communication.wordRecall', 'Communication: difficulty with word recall', 68.4, 88.0]
]);
blank('email', "Individual's email address", 'text', PHYS, at(2, 297, 74.5, { maxWidth: 238 }), {
	mark: box(2, 68.4, 74.2)
});
// Alternative communication (page 3) is ticked from its sub-options on page 4.
const altBoard = tick(
	'communication.letterBoard',
	'Alternative communication: letter board',
	PHYS,
	3,
	104.4,
	710.5
);
const altDevice = tick(
	'communication.speechDevice',
	'Alternative communication: speech generated device',
	PHYS,
	3,
	104.4,
	696.7
);
const altOther = blank(
	'communication.altOther',
	'Alternative communication: other',
	'text',
	PHYS,
	at(3, 254, 711, { maxWidth: 280 }),
	{
		mark: box(3, 212.4, 710.5)
	}
);
put((d) => any(d, altBoard, altDevice, altOther), box(2, 68.4, 60.4));

// ---------- Page 4: disease processes, cognitive, community living ----------

const seizure = tick('disease.seizure', 'Seizure disorder', PHYS, 3, 68.4, 627.7);
blank(
	'disease.seizureFrequency',
	'Seizure frequency / duration during the last 6 months',
	'text',
	PHYS,
	at(3, 378, 628, { maxWidth: 120 }),
	{
		mark: box(3, 68.4, 627.7),
		also: [seizure]
	}
);
ticks(PHYS, 3, [
	['disease.diabetes', 'Diabetes', 68.4, 613.9],
	['disease.cardiac', 'Cardiac disease', 68.4, 600.1],
	['disease.renal', 'Renal failure', 68.4, 586.3]
]);
blank('disease.other', 'Other disease process', 'text', PHYS, at(3, 119, 573, { maxWidth: 415 }), {
	mark: box(3, 68.4, 572.5)
});
blank(
	'disease.newDiagnosis',
	'New medical diagnosis since the last reporting period',
	'text',
	PHYS,
	at(3, 332, 559, { maxWidth: 202, lines: 2, lineHeight: 13.8 }),
	{ mark: box(3, 68.0, 558.7) }
);
blank(
	'hospitalizations',
	'Hospitalizations during this reporting period (date and reason)',
	'longtext',
	PHYS,
	at(3, 69, 489, { maxWidth: 465, lines: 3, lineHeight: 12 })
);
blank(
	'physicalComments',
	'Additional comments / changes since last period: physical / medical',
	'longtext',
	PHYS,
	at(3, 69, 434, { maxWidth: 465, lines: 4, lineHeight: 12 })
);

ticks(
	COG,
	3,
	[
		['oriented', 'Oriented to date / time / place', 68.4, 365.5],
		['shortTermMemory', 'Short-term memory challenges', 68.4, 351.7],
		['longTermMemory', 'Long-term memory challenges', 68.4, 337.9],
		['judgment', 'Judgment challenges', 68.4, 324.1],
		['organizational', 'Organizational challenges', 320.0, 365.5],
		['impulseControl', 'Impulse control challenges', 319.2, 351.7],
		['problemSolving', 'Problem solving challenges', 320.0, 337.9]
	].map(([n, l, x, y]) => [`cognitive.${n}`, l, x, y] as [string, string, number, number])
);
blank(
	'cognitiveComments',
	'Additional comments / changes since last period: cognitive',
	'longtext',
	COG,
	at(3, 69, 268, { maxWidth: 465, lines: 5, lineHeight: 12 })
);

ticks(LIVING, 3, [
	['resides.alone', 'Resides alone', 68.4, 172.3],
	['resides.family', 'Resides with family', 140.4, 172.3],
	['resides.friends', 'Resides with friends', 224.4, 172.3]
]);
blank('resides.other', 'Resides: other', 'text', LIVING, at(3, 343, 172.6, { maxWidth: 155 }), {
	mark: box(3, 300.9, 172.3)
});
choose(
	'staffLevel',
	'Level of waiver staff support needed during community activities',
	LIVING,
	3,
	[
		['None', 68.4, 130.9],
		['Minimum', 140.4, 130.9],
		['Maximum', 221.4, 130.9]
	],
	{ optional: false }
);
// Informal supports: one ruled line on page 4, two more at the top of page 5.
const supports = (from: number, to: number) => (d: CaseData) =>
	list(
		Array.from(
			{ length: Math.max(0, Math.min(to, rowCount(d, 'supports.informal')) - from) },
			(_, i) => {
				const r = from + i;
				const name = str(d, cell('supports.informal', r, 'name'));
				const rel = str(d, cell('supports.informal', r, 'relationship'));
				return name && rel ? `${name} (${rel})` : name || rel;
			}
		)
	) || undefined;
put(supports(0, 3), at(3, 69, 62, { maxWidth: 430 }), {
	label: 'Informal supports',
	needs: ['supports.informal']
});
put(supports(3, 50), at(4, 69, 710.5, { maxWidth: 430, lines: 2, lineHeight: 13.8 }), {
	label: 'Informal supports (cont.)'
});

// ---------- Page 5: legal, non-waiver supports, substance abuse, psychiatric ----------

blank(
	'children',
	'Children the individual is responsible for (names and ages)',
	'text',
	LIVING,
	at(4, 69, 655.5, { maxWidth: 430, lines: 2, lineHeight: 13.8 })
);
const guardianAddress = ask('guardianAddress', 'Legal guardian address', 'text', LIVING, {
	optional: true
});
put(
	(d) =>
		[str(d, 'guardian.name'), str(d, guardianAddress), str(d, 'guardian.phone')]
			.filter(Boolean)
			.join(', ') || undefined,
	at(4, 69, 600, { maxWidth: 430 }),
	{ label: 'Court appointed legal guardian' }
);
put((d) => any(d, 'guardian.name', guardianAddress), box(4, 68.4, 613.9));
const payeeContact = ask(
	'repPayeeContact',
	'Representative payee address / phone',
	'text',
	LIVING,
	{ optional: true }
);
put(
	(d) =>
		[str(d, 'participant.repPayee'), str(d, payeeContact)].filter(Boolean).join(', ') || undefined,
	at(4, 69, 561, { maxWidth: 430 }),
	{ label: 'Social Security representative payee' }
);
put((d) => any(d, 'participant.repPayee'), box(4, 68.0, 574.8));
blank(
	'poa',
	'Power of Attorney: name, address, phone',
	'text',
	LIVING,
	at(4, 69, 519.6, { maxWidth: 430 }),
	{ mark: box(4, 68.0, 533.4) }
);
blank(
	'healthCareProxy',
	'Health Care Proxy: name, address, phone',
	'text',
	LIVING,
	at(4, 69, 478.2, { maxWidth: 430 }),
	{
		mark: box(4, 68.0, 492.0)
	}
);
blank(
	'nonWaiver.cdpap',
	'CDPAP hours approved per week (next six months)',
	'text',
	LIVING,
	at(4, 477, 437, { maxWidth: 94 }),
	{
		mark: box(4, 68.4, 436.8)
	}
);
blank(
	'nonWaiver.hha',
	'Home Health Aide hours approved per week',
	'text',
	LIVING,
	at(4, 326, 423.3, { maxWidth: 245 }),
	{
		mark: box(4, 68.4, 423.0)
	}
);
blank(
	'nonWaiver.visitingNurse',
	'Visiting nursing service hours approved per week',
	'text',
	LIVING,
	at(4, 311, 409.5, { maxWidth: 260 }),
	{
		mark: box(4, 68.4, 409.2)
	}
);
blank(
	'nonWaiver.privateDuty',
	'Private duty nursing hours approved per week',
	'text',
	LIVING,
	at(4, 296, 395.7, { maxWidth: 275 }),
	{
		mark: box(4, 68.4, 395.4)
	}
);
blank(
	'nonWaiver.other',
	'Other formal non-waiver in-home support',
	'text',
	LIVING,
	at(4, 115, 381.9, { maxWidth: 455 }),
	{
		mark: box(4, 68.0, 381.6)
	}
);
blank(
	'supportComments',
	'Additional comments / changes in formal non-waiver, in-home and informal supports',
	'longtext',
	LIVING,
	at(4, 69, 325, { maxWidth: 465, lines: 4, lineHeight: 12 })
);

tick('sa.none', 'No substance abuse history or current concerns', SA, 4, 68.4, 257.4);
const saHistory = tick('sa.history', 'History of substance abuse', SA, 4, 68.4, 243.6);
blank('sa.sobriety', 'Length of sobriety', 'text', SA, at(4, 274, 244, { maxWidth: 297 }), {
	mark: box(4, 68.4, 243.6),
	also: [saHistory]
});
const saDuring = tick(
	'sa.duringPeriod',
	'Substance abuse during the past reporting period',
	SA,
	4,
	68.4,
	229.8
);
blank(
	'sa.frequency',
	'Known frequency of substance abuse',
	'text',
	SA,
	at(4, 337, 230.2, { maxWidth: 234 }),
	{
		mark: box(4, 68.4, 229.8),
		also: [saDuring]
	}
);
ticks(SA, 4, [
	[
		'sa.treatment',
		'Currently attending community outpatient substance abuse treatment',
		68.4,
		216.0
	],
	['sa.supportGroup', 'Support group attendance', 68.0, 202.2],
	['sa.na', 'Support group: Narcotics Anonymous', 210.3, 202.2],
	['sa.aa', 'Support group: Alcoholics Anonymous', 364.2, 202.2],
	['sa.alcohol', 'Drug of choice: alcohol', 158.7, 188.4],
	['sa.unprescribed', 'Drug of choice: un-prescribed legal drugs', 216.3, 188.4],
	['sa.illegal', 'Drug of choice: illegal drugs', 366.5, 188.4]
]);
blank('sa.drugOther', 'Drug of choice: other', 'text', SA, at(4, 499, 188.7, { maxWidth: 72 }), {
	mark: box(4, 451.5, 188.4)
});
tick(
	'sa.informed',
	'Individual informed that substance abuse jeopardizes waiver involvement',
	SA,
	4,
	68.0,
	174.6
);

ticks(PSY, 4, [
	['psych.none', 'No psychiatric history or current concerns', 68.4, 119.4],
	['psych.history', 'History of psychiatric intervention', 332.2, 119.4]
]);
blank(
	'psych.concerns',
	'Current psychiatric concerns (specify)',
	'text',
	PSY,
	at(4, 268, 105.9, { maxWidth: 302, lines: 2, lineHeight: 13.8 }),
	{
		mark: box(4, 68.0, 105.6)
	}
);
const mhCare = tick(
	'psych.mhCare',
	'Currently under mental health professional care',
	PSY,
	4,
	68.4,
	78.0
);
blank(
	'psych.diagnosis',
	'Mental health diagnosis',
	'text',
	PSY,
	at(4, 385, 78.4, { maxWidth: 186 }),
	{ mark: box(4, 68.4, 78.0), also: [mhCare] }
);
tick('psych.medication', 'Psychiatric concerns are managed by medication', PSY, 4, 68.4, 64.2);

// ---------- Page 6: psychiatric (cont.), criminal justice, behavioral, vocational ----------

ticks(PSY, 5, [
	[
		'psych.pcpMonitored',
		'Psychotropic medication monitored by primary care physician / other medical professional',
		68.0,
		710.5
	],
	['psych.deferred', 'Psychiatric intervention recommended; individual deferred', 68.0, 682.9]
]);

ticks(CJ, 5, [
	['cj.none', 'No criminal justice history or current concerns', 68.4, 586.3],
	['cj.history', 'History of criminal justice activity', 68.4, 572.5]
]);
const cjDuring = tick(
	'cj.duringPeriod',
	'Criminal justice involvement during the past reporting period',
	CJ,
	5,
	68.4,
	558.7
);
blank(
	'cj.specify',
	'Criminal justice involvement (specify)',
	'text',
	CJ,
	at(5, 122, 545, { maxWidth: 412 }),
	{
		mark: box(5, 68.4, 558.7),
		also: [cjDuring]
	}
);
tick(
	'cj.informed',
	'Individual informed that criminal justice involvement may jeopardize waiver involvement',
	CJ,
	5,
	68.1,
	530.2
);
const probation = tick('cj.probation', 'Currently on probation', CJ, 5, 104.4, 488.8);
const parole = tick('cj.parole', 'Currently on parole', CJ, 5, 104.4, 475.0);
put((d) => any(d, probation, parole), box(5, 68.4, 502.6));
blank(
	'cj.conditions',
	'Probation / parole conditions that may affect community living',
	'text',
	CJ,
	at(5, 105, 447.4, { maxWidth: 430 })
);

ticks(BEH, 5, [
	[
		'beh.none',
		'No behavioral challenges affecting ability to remain in the community',
		68.4,
		406.0
	],
	['beh.historyNoneNow', 'History of behavioral challenges, none this past period', 68.4, 392.2]
]);
const behNoted = tick(
	'beh.noted',
	'Behavioral challenges noted this reporting period',
	BEH,
	5,
	68.4,
	378.4
);
blank(
	'beh.specifics',
	'Behavioral challenges: specific challenge, frequency and duration of each',
	'text',
	BEH,
	at(5, 105, 350.9, { maxWidth: 430, lines: 2, lineHeight: 13.8 }),
	{ mark: box(5, 68.4, 378.4), also: [behNoted] }
);
ticks(BEH, 5, [
	[
		'beh.formalServices',
		'Behavioral challenges managed by formal behavioral services / treatment',
		68.0,
		323.2
	],
	['beh.deferred', 'Behavioral intervention recommended; individual deferred', 68.0, 309.4]
]);

tick(
	'voc.noWish',
	'Does not wish to pursue vocational / education / volunteer endeavors now',
	VOC,
	5,
	68.4,
	226.6
);
const edu = ticks(VOC, 5, [
	['voc.ged', 'Education: GED', 104.4, 185.2],
	['voc.trade', 'Education: specialized trade school', 212.4, 185.2],
	['voc.college', 'Education: college', 369.3, 185.2]
]);
put((d) => any(d, ...edu), box(5, 68.4, 199.0));
const where = blank(
	'voc.where',
	'Where the individual works',
	'text',
	VOC,
	at(5, 297, 144, { maxWidth: 238 })
);
const duties = blank(
	'voc.duties',
	"Individual's work duties",
	'text',
	VOC,
	at(5, 326, 130.3, { maxWidth: 209 })
);
const hours = blank(
	'voc.hours',
	'Average hours worked per week',
	'text',
	VOC,
	at(5, 356, 116.5, { maxWidth: 143 })
);
const wage = choose('voc.minimumWage', 'Earning at least minimum wage', VOC, 5, [
	['Yes', 146.4, 88.6],
	['No', 182.4, 88.6]
]);
const wageExplain = blank(
	'voc.wageExplain',
	'Minimum wage: explain',
	'text',
	VOC,
	at(5, 260, 89, { maxWidth: 203 })
);
put((d) => any(d, where, duties, hours, wage, wageExplain), box(5, 104.4, 157.6));
const vesid = blank(
	'voc.vesidDate',
	'Date referred to VESID (ACCES-VR)',
	'date',
	VOC,
	at(5, 348, 75.1, { maxWidth: 150 }),
	{
		mark: box(5, 104.4, 74.8)
	}
);
const workType = blank(
	'voc.workType',
	'Type of work the individual is interested in',
	'text',
	VOC,
	at(5, 303, 61.3, { maxWidth: 196 }),
	{
		mark: box(5, 104.4, 61.0)
	}
);
put((d) => any(d, where, duties, hours, wage, wageExplain, vesid, workType), box(5, 68.4, 171.4));

// ---------- Page 7: volunteering, IV, services requested ----------

const vWhere = blank(
	'vol.where',
	'Where the individual volunteers',
	'text',
	VOC,
	at(6, 321, 683.2, { maxWidth: 178 })
);
const vDuties = blank(
	'vol.duties',
	'Volunteer duties',
	'text',
	VOC,
	at(6, 347, 669.4, { maxWidth: 152 })
);
const vHours = blank(
	'vol.hours',
	'Average volunteer hours per week',
	'text',
	VOC,
	at(6, 344, 655.6, { maxWidth: 155 })
);
const vVia = ticks(VOC, 6, [
	[
		'vol.faith',
		'Volunteering supported through: local faith community or civic group',
		320.4,
		641.5
	],
	['vol.informal', 'Volunteering supported through: informal supports', 320.4, 627.7],
	['vol.sdp', 'Volunteering supported through: Structured Day Program', 320.4, 613.9]
]);
const vOther = blank(
	'vol.other',
	'Volunteering supported through: other',
	'text',
	VOC,
	at(6, 368, 600.4, { maxWidth: 131 }),
	{
		mark: box(6, 320.4, 600.1)
	}
);
put((d) => any(d, vWhere, vDuties, vHours, ...vVia, vOther), box(6, 104.4, 696.7));
const vType = blank(
	'vol.type',
	'Type of volunteer duties interested in',
	'text',
	VOC,
	at(6, 304, 586.6, { maxWidth: 195 }),
	{
		mark: box(6, 104.4, 586.3)
	}
);
put((d) => any(d, vWhere, vDuties, vHours, ...vVia, vOther, vType), box(6, 68.4, 710.5));

const story = (name: string, label: string, y: number, lines: number) =>
	blank(name, label, 'longtext', IV, at(6, 69, y, { maxWidth: 465, lines, lineHeight: 12 }), {
		optional: false
	});
story('successes', "Successes this reporting period (in the individual's words)", 476, 3);
story('barriers', "Barriers this reporting period (in the individual's words)", 421, 4);
story('concerns', "Concerns this reporting period (in the individual's words)", 352, 3);
blank(
	'serviceBarriers',
	'Barriers to service provision under the last plan (explain)',
	'longtext',
	IV,
	at(6, 69, 297, { maxWidth: 465, lines: 4, lineHeight: 12 })
);

// Waiver services requested: ticked from the shared services table.
const hasService = (type: string) => (d: CaseData) =>
	Array.from(
		{ length: rowCount(d, 'services') },
		(_, r) => d[cell('services', r, 'type')]
	).includes(type);
(
	[
		['Service Coordination', 68.4, 186.1],
		['Home and Community Support Services (HCSS)', 284.4, 186.1],
		['Structured Day Program', 68.4, 172.3],
		['Independent Living Skills Training (ILST)', 284.4, 172.3],
		['Community Integration Counseling (CIC)', 68.4, 158.5],
		['Substance Abuse Program', 284.4, 158.5],
		['Transportation', 68.4, 144.7],
		['Respite', 284.0, 144.7],
		['Positive Behavioral Interventions and Supports (PBIS)', 68.0, 130.9]
	] as const
).forEach(([type, l, b]) => put(hasService(type), box(6, l, b)));

// ---------- Page 8: risk of placement, other community services ----------

blank(
	'whyNeeded',
	'Why, without these waiver services, the individual would be at risk of nursing home / RHCF placement',
	'longtext',
	REQ,
	at(7, 69, 682, { maxWidth: 465, lines: 7, lineHeight: 12 }),
	{ optional: false }
);
ticks(REQ, 7, [
	['other.vesid', 'Other services researched / used: VESID (ACCES-VR)', 68.4, 572.5],
	['other.omrdd', 'Other services researched / used: OMRDD (OPWDD)', 212.4, 572.5],
	['other.va', "Other services researched / used: Veterans' Administration", 320.4, 572.5],
	['other.cbvh', 'Other services researched / used: Commission for the Blind (CBVH)', 68.4, 558.7],
	['other.ilc', 'Other services researched / used: Independent Living Center', 68.4, 544.9]
]);
blank(
	'other.other',
	'Other community services researched / used',
	'text',
	REQ,
	at(7, 103, 531.4, { maxWidth: 360 })
);

// ---------- Page 9: income, resources, insurance ----------

const STATUS = ['Receiving', 'Denied', 'N/A', 'Pending'];
const sourceTable = (name: string, label: string, sources: string[]) =>
	ask(name, label, 'table', INC, {
		optional: true,
		rows: sources.length,
		help: 'One row per source. Leave out sources that do not apply.',
		columns: [
			{ id: 'source', label: 'Source', type: 'select', options: sources },
			...(sources.includes('Other')
				? [{ id: 'otherSource', label: 'If Other: which source' } as Column]
				: []),
			{ id: 'amount', label: 'Amount', type: 'money' },
			{ id: 'status', label: 'Status', type: 'select', options: STATUS },
			{ id: 'change', label: 'Change from last plan' }
		]
	});
/** Fill a printed grid whose rows are fixed sources. */
function sourceGrid(
	table: string,
	sources: string[],
	ys: number[],
	cols: {
		amount: number;
		amountWidth: number;
		denied: number;
		na: number;
		pending: number;
		change: number;
		changeWidth: number;
	}
) {
	const rowOf = (d: CaseData, source: string) => {
		for (let r = 0; r < rowCount(d, table); r++)
			if (d[cell(table, r, 'source')] === source) return r;
		return -1;
	};
	const val =
		(source: string, col: string, f: (s: string) => string = (s) => s) =>
		(d: CaseData) => {
			const r = rowOf(d, source);
			const s = r < 0 ? '' : str(d, cell(table, r, col));
			return s ? f(s) : undefined;
		};
	sources.forEach((source, i) => {
		const y = ys[i];
		put(
			val(source, 'amount', formatMoney),
			at(8, cols.amount, y, { maxWidth: cols.amountWidth, size: 7.5 }),
			{ label: `${source}: amount` }
		);
		for (const [status, cx] of [
			['Denied', cols.denied],
			['N/A', cols.na],
			['Pending', cols.pending]
		] as const) {
			put((d) => val(source, 'status')(d) === status, {
				page: 8,
				x: cx - 2.3,
				y,
				mark: true,
				size: 7
			});
		}
		put(val(source, 'change'), at(8, cols.change, y, { maxWidth: cols.changeWidth, size: 7 }), {
			label: `${source}: change from last plan`
		});
		if (source === 'Other')
			put(val(source, 'otherSource'), at(8, 124, y, { maxWidth: 124, size: 8 }), {
				label: 'Other income source'
			});
	});
}
const INCOME = [
	'Social Security',
	'Social Security Disability Insurance',
	'Supplemental Security Income',
	'Public Assistance',
	'Supplemental Needs Trust',
	"Worker's Compensation",
	'Wages from employment',
	'Alimony / child support',
	'Other'
];
sourceGrid(
	sourceTable('income', 'Income sources', INCOME),
	INCOME,
	[660.6, 646.3, 632.0, 617.7, 603.4, 589.1, 574.8, 560.5, 546.2],
	{
		amount: 253.5,
		amountWidth: 49,
		denied: 327.6,
		na: 373.5,
		pending: 424.2,
		change: 454.5,
		changeWidth: 71
	}
);
blank(
	'noIncome',
	'If no income: how daily living expenses will be paid',
	'longtext',
	INC,
	at(8, 92, 504, { maxWidth: 435, lines: 4, lineHeight: 12 })
);
const RESOURCES = [
	'HUD / Section 8',
	'HEAP',
	'Telephone Lifeline',
	'Food Stamps (SNAP)',
	'Crime Victims funding',
	"Worker's Compensation",
	'TBI Waiver housing: rent',
	'TBI Waiver housing: utilities',
	'TBI Waiver housing: household goods'
];
sourceGrid(
	sourceTable('resources', 'Federal, State and private resources', RESOURCES),
	RESOURCES,
	[392.9, 378.6, 364.3, 350.0, 322.0, 307.6, 279.0, 264.7, 250.4],
	{
		amount: 225,
		amountWidth: 52,
		denied: 303.5,
		na: 346.3,
		pending: 398,
		change: 434,
		changeWidth: 92
	}
);

put('participant.medicareNumber', at(8, 167, 181.2, { maxWidth: 138 }));
put((d) => any(d, 'participant.medicareNumber'), box(8, 90.9, 180.9));
ticks(INS, 8, [
	['medicare.a', 'Medicare Part A', 315.9, 180.9],
	['medicare.b', 'Medicare Part B', 352.8, 180.9]
]);
const partD = tick('medicare.d', 'Medicare Part D', INS, 8, 315.9, 167.1);
blank(
	'medicare.rxPlan',
	'Medicare Part D prescription plan name',
	'text',
	INS,
	at(8, 430, 167.4, { maxWidth: 92, size: 8 }),
	{
		mark: box(8, 315.9, 167.1),
		also: [partD]
	}
);
const noInsurance = (d: CaseData) =>
	/^(none|n\/?a|no)$/i.test(str(d, 'participant.otherInsurance'));
put(
	(d) => (noInsurance(d) ? undefined : str(d, 'participant.otherInsurance') || undefined),
	at(8, 251, 153.6, { maxWidth: 235 }),
	{
		label: 'Private insurance company',
		needs: ['participant.otherInsurance']
	}
);
put((d) => !noInsurance(d) && any(d, 'participant.otherInsurance'), box(8, 90.9, 153.3));
blank('insurance.other', 'Other insurance', 'text', INS, at(8, 139, 139.8, { maxWidth: 347 }), {
	mark: box(8, 90.9, 139.5)
});

// ---------- Page 10: non-Medicaid services, spend-down, medications ----------

const NONMED = ask(
	'nonMedicaidServices',
	'Services paid by a non-Medicaid source (Medicare, private pay, etc.)',
	'table',
	INS,
	{
		optional: true,
		rows: 4,
		help: 'Include doctor, pharmacy, dentist and other services paid by non-Medicaid sources.',
		columns: [
			{ id: 'service', label: 'Service' },
			{ id: 'vendor', label: 'Vendor (name and address)' },
			{ id: 'payer', label: 'Payer source' },
			{ id: 'change', label: 'Change from last plan' }
		]
	}
);
[646.5, 632.2, 617.9, 603.6].forEach((y, r) => {
	put(cell(NONMED, r, 'service'), at(9, 87, y, { maxWidth: 99, size: 7.5 }));
	put(cell(NONMED, r, 'vendor'), at(9, 191.5, y, { maxWidth: 134, size: 7.5 }));
	put(cell(NONMED, r, 'payer'), at(9, 331, y, { maxWidth: 98, size: 7.5 }));
	put(cell(NONMED, r, 'change'), at(9, 434.5, y, { maxWidth: 89, size: 7.5 }));
});
choose(
	'spenddownStatus',
	'Spend-down / Supplemental Needs Trust status',
	INS,
	9,
	[
		['No spend-down', 90.9, 548.2],
		['Spend-down; securing a Supplemental Needs Trust', 90.9, 534.4],
		['No Supplemental Needs Trust, but the option was discussed', 90.9, 506.8],
		['Spend-down; chose not to pursue a Supplemental Needs Trust', 90.9, 465.4]
	],
	{ optional: false }
);
put((d) => (num(d, 'participant.spenddown') ?? 0) > 0, box(9, 90.9, 451.6));
put(
	(d) => {
		const n = num(d, 'participant.spenddown');
		return n ? plain(n) : undefined;
	},
	at(9, 288, 452, { maxWidth: 88 }),
	{ label: 'Spend-down amount per month', needs: ['participant.spenddown'] }
);
choose('spenddownPayer', 'Who makes sure the spend-down is paid', INS, 9, [
	['Individual', 140.4, 424.0],
	['Representative payee', 270.9, 424.0],
	['Family', 140.4, 410.2],
	['Other', 270.9, 410.2]
]);
blank(
	'spenddownPayerOther',
	'Spend-down paid by: other (who)',
	'text',
	INS,
	at(9, 316, 410.5, { maxWidth: 132 })
);

const MEDX = ask('medications', 'Medications: route and change from last plan', 'table', MED, {
	optional: true,
	rows: 8,
	help: 'Row N here adds to row N of "Current medications".',
	columns: [
		{ id: 'route', label: 'Route' },
		{ id: 'change', label: 'Change from last plan' }
	]
});
[315, 300.7, 286.4, 272.1].forEach((y, r) => {
	put(cell('medications', r, 'name'), at(9, 87, y, { maxWidth: 122, size: 7.5 }));
	put(cell('medications', r, 'dose'), at(9, 214, y, { maxWidth: 65, size: 7 }));
	put(cell(MEDX, r, 'route'), at(9, 284.5, y, { maxWidth: 52, size: 7.5 }));
	put(cell('medications', r, 'purpose'), at(9, 342, y, { maxWidth: 90, size: 7.5 }));
	put(cell(MEDX, r, 'change'), at(9, 437.5, y, { maxWidth: 88, size: 7.5 }));
});
put(
	(d) => {
		const out: string[] = [];
		for (let r = 4; r < rowCount(d, 'medications'); r++) {
			out.push(
				[
					cell('medications', r, 'name'),
					cell('medications', r, 'dose'),
					cell(MEDX, r, 'route'),
					cell('medications', r, 'purpose'),
					cell(MEDX, r, 'change')
				]
					.map((c) => str(d, c))
					.filter(Boolean)
					.join(', ')
			);
		}
		return out.length ? `More medications: ${list(out)}` : undefined;
	},
	at(9, 92, 257, { maxWidth: 430, size: 7 }),
	{ label: 'Medications (more rows)' }
);

tick('med.selfMedicating', 'Self-medicating; needs no assistance or cueing', MED, 9, 90.9, 216.3);
tick('med.caddy', 'Needs assistance to fill a medication bar / caddy', MED, 9, 90.9, 188.7);
who(
	'med.caddyPhysical',
	'Caddy, physical support',
	MED,
	9,
	[
		['cdpap', 'CDPAP', 323.1, 174.9],
		['visitingNurse', 'visiting nurse', 321.9, 161.1],
		['informal', 'informal supports', 321.9, 147.3]
	],
	{ l: 321.9, b: 133.5, x: 370, maxWidth: 116 }
);
who(
	'med.caddyVerbal',
	'Caddy, verbal support',
	MED,
	9,
	[
		['waiverStaff', 'TBI Waiver staff', 319.0, 105.9],
		['cdpap', 'CDPAP', 423.2, 105.9],
		['hha', 'HHA', 481.1, 105.9],
		['informal', 'informal supports', 318.9, 92.1]
	],
	{ l: 318.9, b: 78.3, x: 367, maxWidth: 119 }
);

// ---------- Page 11: medication administration (cont.) ----------

tick('med.verbalCues', 'Needs verbal cues to take own medication', MED, 10, 90.9, 703.0);
who(
	'med.verbalCuesBy',
	'Verbal cues by',
	MED,
	10,
	[
		['waiverStaff', 'TBI Waiver staff', 300.4, 689.2],
		['cdpap', 'CDPAP', 404.5, 689.2],
		['hha', 'HHA', 462.5, 689.2],
		['informal', 'informal supports', 300.9, 675.4]
	],
	{ l: 300.9, b: 661.6, x: 349, maxWidth: 137 }
);
tick('med.physical', 'Needs physical support to take medications', MED, 10, 90.9, 634.0);
who(
	'med.physicalBy',
	'Physical support by',
	MED,
	10,
	[
		['cdpap', 'CDPAP', 300.4, 620.2],
		['hha', 'HHA', 385.3, 620.2],
		['informal', 'informal supports', 300.9, 606.4],
		['visitingNurse', 'visiting nurse', 300.9, 592.6]
	],
	{ l: 300.9, b: 578.8, x: 346, maxWidth: 140 }
);
const auditory = tick(
	'med.auditory',
	'Strategy: auditory cues (watch that beeps, clock that rings)',
	MED,
	10,
	90.9,
	523.6
);
blank(
	'med.auditoryExplain',
	'Auditory cues: explain',
	'text',
	MED,
	at(10, 183, 510.1, { maxWidth: 267 }),
	{ mark: box(10, 90.9, 523.6), also: [auditory] }
);
const visual = tick(
	'med.visual',
	'Strategy: visual cues (poster of meds and times, pictures)',
	MED,
	10,
	90.9,
	496.0
);
blank(
	'med.visualExplain',
	'Visual cues: explain',
	'text',
	MED,
	at(10, 183, 482.5, { maxWidth: 267 }),
	{ mark: box(10, 90.9, 496.0), also: [visual] }
);
blank(
	'med.otherStrategy',
	'Other medication strategy (be specific)',
	'text',
	MED,
	at(10, 200, 468.7, { maxWidth: 214 }),
	{ mark: box(10, 90.9, 468.4) }
);
who(
	'med.injection',
	'Injections handled by',
	MED,
	10,
	[
		['individual', 'individual', 140.4, 427.0],
		['informal', 'informal supports', 234.9, 427.0],
		['privateDuty', 'private duty nursing', 348.1, 427.0],
		['doctor', 'doctor', 140.4, 413.2],
		['cdpap', 'CDPAP', 234.9, 413.2]
	],
	{ l: 348.9, b: 413.2, x: 400, maxWidth: 122 }
);
tick('med.bloodTesting', 'Needs routine blood testing / lab work', MED, 10, 90.9, 385.6);
who(
	'med.bloodTestingBy',
	'Blood testing handled by',
	MED,
	10,
	[
		['individual', 'individual', 140.4, 316.6],
		['informal', 'informal supports', 234.9, 316.6],
		['privateDuty', 'private duty nursing', 351.9, 316.6],
		['doctor', 'doctor', 140.4, 302.8],
		['cdpap', 'CDPAP', 234.9, 302.8]
	],
	{ l: 351.9, b: 302.8, x: 400, maxWidth: 122 }
);
ticks(
	MED,
	10,
	[
		[
			'diet.independent',
			'Special diet: individual completes menu, meals and shopping independently',
			140.4,
			247.6
		],
		['diet.instructsStaff', 'Special diet: individual instructs waiver staff', 140.4, 233.8],
		[
			'diet.nonWaiver',
			'Special diet: non-waiver supports (HHA, CDPAP) do these tasks',
			140.4,
			220.0
		],
		['diet.informal', 'Special diet: informal supports help', 140.4, 206.2]
	].map(([n, l, x, y]) => [`med.${n}`, l, x, y] as [string, string, number, number])
);

// ---------- Page 12 (landscape): State Plan Medicaid services ----------

const SPX = ask('statePlan', 'State Plan services: units, rate and cost', 'table', COST, {
	optional: true,
	rows: 8,
	help: 'Row N here adds to row N of "Medicaid State Plan and other services". Annual cost is rate × monthly units × 12 if left blank.',
	columns: [
		{ id: 'monthlyUnits', label: 'Units per month', type: 'number' },
		{ id: 'rate', label: 'Rate', type: 'money' },
		{ id: 'cost', label: 'Total projected annual cost', type: 'money' }
	]
});
const statePlanCost = (d: CaseData, r: number) => {
	const own = num(d, cell(SPX, r, 'cost'));
	if (own !== undefined) return own;
	const rate = num(d, cell(SPX, r, 'rate'));
	const units = num(d, cell(SPX, r, 'monthlyUnits'));
	return rate !== undefined && units !== undefined ? rate * units * 12 : undefined;
};
const sum = (d: CaseData, table: string, cost: (d: CaseData, r: number) => number | undefined) => {
	let total: number | undefined;
	for (let r = 0; r < rowCount(d, table); r++) {
		const c = cost(d, r);
		if (c !== undefined) total = (total ?? 0) + c;
	}
	return total;
};
const statePlanTotal = (d: CaseData) => sum(d, 'services.statePlan', statePlanCost);
const waiverTotal = (d: CaseData) =>
	sum(d, 'services', (d, r) => num(d, cell('services', r, 'cost')));

const SP_ROWS = [201.1, 229.5, 243.8, 258.1, 272.4, 286.7];
const SP_COLS = {
	type: [45, 185.4],
	provider: [185.4, 325.8],
	units: [325.8, 466.2],
	rate: [466.2, 606.6],
	cost: [606.6, 747]
};
for (let r = 0; r < 5; r++) {
	const c = (col: keyof typeof SP_COLS) =>
		land(11, SP_ROWS[r], SP_ROWS[r + 1], SP_COLS[col][0], SP_COLS[col][1]);
	put(cell('services.statePlan', r, 'type'), c('type'));
	put(cell('services.statePlan', r, 'provider'), c('provider'));
	put(
		(d) =>
			str(d, cell(SPX, r, 'monthlyUnits')) ||
			str(d, cell('services.statePlan', r, 'frequency')) ||
			undefined,
		c('units'),
		{
			label: `State Plan service ${r + 1}: units per month`
		}
	);
	put(cell(SPX, r, 'rate'), c('rate'));
	put(
		(d) => {
			const n = statePlanCost(d, r);
			return n === undefined ? undefined : formatMoney(String(n));
		},
		c('cost'),
		{ label: `State Plan service ${r + 1}: annual cost` }
	);
}
put(
	(d) => {
		const out: string[] = [];
		for (let r = 5; r < rowCount(d, 'services.statePlan'); r++) {
			const n = statePlanCost(d, r);
			out.push(
				[
					str(d, cell('services.statePlan', r, 'type')),
					str(d, cell('services.statePlan', r, 'provider')),
					n === undefined ? '' : formatMoney(String(n))
				]
					.filter(Boolean)
					.join(', ')
			);
		}
		return out.length ? `More State Plan services: ${list(out)}` : undefined;
	},
	{ page: 11, x: 300, y: 50, rotate: 90, size: 7, maxWidth: 640 },
	{ label: 'State Plan services (more rows)' }
);
put(
	(d) => {
		const n = statePlanTotal(d);
		return n === undefined ? undefined : plain(n);
	},
	{ page: 11, x: 325.5, y: 581, rotate: 90, maxWidth: 115 },
	{
		label: 'Projected annual cost of all State Plan Medicaid services',
		needs: ['services.statePlan']
	}
);

// ---------- Pages 13-14 (landscape): TBI Waiver services, one printed row per service ----------

const WX = ask('services', 'Waiver services: last period and rates', 'table', COST, {
	optional: true,
	rows: 10,
	help: 'Row N here adds to row N of "Waiver services" (which supplies the service, next provider, units and annual cost).',
	columns: [
		{ id: 'lastProvider', label: 'Provider during the last reporting period' },
		{ id: 'lastUnits', label: 'Bi-weekly units approved in last plan / addendum' },
		{ id: 'biweeklyUnits', label: 'Bi-weekly units requested for the next period' },
		{ id: 'rate', label: 'Rate', type: 'money' }
	]
});
const WAIVER_GRID: [string, number, number, number][] = [
	['Service Coordination', 12, 228.5, 242.8],
	['Home and Community Support Services (HCSS)', 12, 242.8, 312.3],
	['Independent Living Skills Training (ILST)', 12, 312.3, 354.2],
	['Community Integration Counseling (CIC)', 12, 354.2, 396.1],
	['Positive Behavioral Interventions and Supports (PBIS)', 12, 396.1, 438.0],
	['Structured Day Program', 12, 438.0, 466.1],
	['Substance Abuse Program', 12, 466.1, 494.2],
	['Respite', 12, 494.2, 508.5],
	['Environmental Modifications (E-Mods)', 13, 90.0, 118.1],
	['Assistive Technology', 13, 118.1, 132.4],
	['Community Transitional Services (CTS)', 13, 132.4, 160.5],
	['Transportation', 13, 160.5, 188.6]
];
const W_COLS = {
	lastProvider: [153.9, 261.9],
	lastUnits: [261.9, 351.9],
	provider: [351.9, 459.9],
	units: [459.9, 545.4],
	rate: [545.4, 599.4],
	cost: [599.4, 743.4]
} as const;
const rowsOf = (d: CaseData, type: string) =>
	Array.from({ length: rowCount(d, 'services') }, (_, r) => r).filter(
		(r) => d[cell('services', r, 'type')] === type
	);
for (const [type, page, x0, x1] of WAIVER_GRID) {
	const c = (col: keyof typeof W_COLS) => land(page, x0, x1, W_COLS[col][0], W_COLS[col][1], 6.5);
	const each = (f: (d: CaseData, r: number) => string) => (d: CaseData) =>
		list(rowsOf(d, type).map((r) => f(d, r))) || undefined;
	const short = type.replace(/ \(.*\)$/, '');
	put(
		each((d, r) => str(d, cell(WX, r, 'lastProvider'))),
		c('lastProvider'),
		{ label: `${short}: provider last period` }
	);
	put(
		each((d, r) => str(d, cell(WX, r, 'lastUnits'))),
		c('lastUnits'),
		{ label: `${short}: bi-weekly units approved` }
	);
	put(
		each((d, r) => str(d, cell('services', r, 'provider'))),
		c('provider'),
		{ label: `${short}: provider next period` }
	);
	put(
		each((d, r) => str(d, cell(WX, r, 'biweeklyUnits')) || str(d, cell('services', r, 'units'))),
		c('units'),
		{
			label: `${short}: bi-weekly units requested`
		}
	);
	put(
		each((d, r) => (str(d, cell(WX, r, 'rate')) ? formatMoney(str(d, cell(WX, r, 'rate'))) : '')),
		c('rate'),
		{ label: `${short}: rate` }
	);
	put(
		(d) => {
			const costs = rowsOf(d, type)
				.map((r) => num(d, cell('services', r, 'cost')))
				.filter((n) => n !== undefined);
			return costs.length ? formatMoney(String(costs.reduce((a, b) => a + b, 0))) : undefined;
		},
		c('cost'),
		{ label: `${short}: projected annual cost` }
	);
}
put(
	(d) => {
		const listed = new Set(WAIVER_GRID.map(([t]) => t));
		const out: string[] = [];
		for (let r = 0; r < rowCount(d, 'services'); r++) {
			const type = str(d, cell('services', r, 'type'));
			if (!type || listed.has(type)) continue;
			out.push(
				[
					type,
					str(d, cell('services', r, 'provider')),
					str(d, cell('services', r, 'units')),
					formatMoney(str(d, cell('services', r, 'cost')))
				]
					.filter(Boolean)
					.join(', ')
			);
		}
		return out.length ? `Other waiver services: ${list(out)}` : undefined;
	},
	{ page: 13, x: 200, y: 45, rotate: 90, size: 7, maxWidth: 210 },
	{ label: 'Other waiver services' }
);
put(
	(d) => {
		const n = waiverTotal(d);
		return n === undefined ? undefined : plain(n);
	},
	{ page: 13, x: 213.5, y: 566, rotate: 90, maxWidth: 130 },
	{ label: 'Projected annual cost of all TBI Waiver services', needs: ['services'] }
);

// Projected Total Annual Costs 1-7 (line 6 is the printed "365").
const totals = (d: CaseData) => {
	const sp = statePlanTotal(d);
	const w = waiverTotal(d);
	if (sp === undefined && w === undefined) return undefined;
	const both = (sp ?? 0) + (w ?? 0);
	const spend = (num(d, 'participant.spenddown') ?? 0) * 12;
	return { sp, w, both, spend, net: both - spend, daily: (both - spend) / 365 };
};
(
	[
		[
			310.5,
			(t) => (t.sp === undefined ? undefined : plain(t.sp)),
			'1. Total projected annual State Plan Medicaid costs'
		],
		[
			338.1,
			(t) => (t.w === undefined ? undefined : plain(t.w)),
			'2. Total projected annual TBI Waiver costs'
		],
		[379.5, (t) => plain(t.both), '3. Total projected annual State Plan and Waiver costs'],
		[407.1, (t) => plain(t.spend), '4. Total projected annual Medicaid spend-down'],
		[434.7, (t) => plain(t.net), '5. Total projected annual Medicaid costs minus spend-down'],
		[489.9, (t) => plain(t.daily), '7. Total projected daily rate for Medicaid costs']
	] as [number, (t: NonNullable<ReturnType<typeof totals>>) => string | undefined, string][]
).forEach(([x, f, label]) =>
	put(
		(d) => {
			const t = totals(d);
			return t ? f(t) : undefined;
		},
		{ page: 13, x, y: 473, rotate: 90, maxWidth: 180 },
		{ label }
	)
);

// Page 15: signatures and the RRDS determination are completed by hand.

// ---------- Page 16 (landscape): proposed weekly schedule ----------

const periodFrom = ask('periodFrom', 'New plan period: from', 'date', WEEK);
const periodTo = ask('periodTo', 'New plan period: to', 'date', WEEK);
put('participant.name', { page: 15, x: 96.5, y: 162, rotate: 90, maxWidth: 125 });
put(
	(d) =>
		str(d, periodFrom) || str(d, periodTo)
			? `${dateOf(d, periodFrom)} to ${dateOf(d, periodTo)}`
			: undefined,
	{
		page: 15,
		x: 96.5,
		y: 381,
		rotate: 90,
		maxWidth: 158
	},
	{ label: 'Reporting period', needs: [periodFrom, periodTo] }
);

const HOURS = [
	'7:00 am',
	'8:00 am',
	'9:00 am',
	'10:00 am',
	'11:00 am',
	'12 noon',
	'1:00 pm',
	'2:00 pm',
	'3:00 pm',
	'4:00 pm',
	'5:00 pm',
	'6:00 pm',
	'7:00 pm',
	'8:00 pm',
	'9:00 pm',
	'10:00 pm',
	'11:00 pm',
	'12 midnight',
	'1:00 am',
	'2:00 am',
	'3:00 am',
	'4:00 am',
	'5:00 am',
	'6:00 am'
];
// The printed header reads "Sunday ... Friday Sunday": the last column is Saturday.
const DAYS: [string, string][] = [
	['sun', 'Sunday'],
	['mon', 'Monday'],
	['tue', 'Tuesday'],
	['wed', 'Wednesday'],
	['thu', 'Thursday'],
	['fri', 'Friday'],
	['sat', 'Saturday']
];
const SCHEDULE = ask('schedule', 'Proposed weekly schedule', 'table', WEEK, {
	optional: true,
	rows: 24,
	help: 'One row per hour that has an activity. The form\'s last column is printed "Sunday" by mistake; it is Saturday.',
	columns: [
		{ id: 'hour', label: 'Hour', type: 'select', options: HOURS },
		...DAYS.map(([id, label]): Column => ({ id, label }))
	]
});
HOURS.forEach((hour, h) => {
	const top = 127.7 + 12 * h;
	DAYS.forEach(([day, label], i) => {
		const y0 = 147.6 + 81 * i;
		put(
			(d) => {
				for (let r = 0; r < rowCount(d, SCHEDULE); r++) {
					if (d[cell(SCHEDULE, r, 'hour')] === hour)
						return str(d, cell(SCHEDULE, r, day)) || undefined;
				}
				return undefined;
			},
			{ page: 15, x: top + 8.7, y: y0 + 2, rotate: 90, size: 6.5, maxWidth: 77 },
			{ label: `Weekly schedule: ${label} ${hour}` }
		);
	});
});

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

export const tbiC41: FormDef = {
	id: ID,
	code: 'TBI C-4.1',
	title: 'Revised Service Plan',
	file: 'tbi-c4-1-2009.pdf',
	revision: 'Rev. March 2009',
	sourceUrl: 'https://www.health.ny.gov/health_care/medicaid/reference/tbi/docs/c4_1.pdf',
	legacy2009: true,
	stage: 'ongoing',
	roles: ['sc'],
	signers: [
		'Waiver participant',
		'Legal guardian / advocate (if any)',
		'Service coordinator',
		'Service coordinator supervisor',
		'RRDS'
	],
	when: 'Every year, for the next service plan period. The full packet goes to the RRDC at least 60 days before the current plan ends.',
	questions,
	fields: withCellLabels(fields, questions)
};
