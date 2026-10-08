import type {
	CaseData,
	FieldDef,
	FormDef,
	MarkTarget,
	Question,
	QuestionType,
	TextTarget
} from '../types.ts';
import { cell, formatDate, formatMoney, isAnswered } from '../values.ts';

// DOH-5726 is a flat PDF (no AcroForm fields): everything is drawn at measured positions.
// Coordinates come from the blank's content stream (rules, boxes and 9pt checkboxes).
// Page numbers below are 0-based; pages 15-19 of the printout (indices 14-18) are landscape.

const ID = 'doh-5726';
const k = (name: string) => `${ID}.${name}`;

const G = {
	id: 'Service plan: Identification',
	history: 'Service plan: Personal history',
	mental: 'Service plan: Mental health history',
	substance: 'Service plan: Substance use history',
	justice: 'Service plan: Criminal justice history',
	medical: 'Service plan: Diagnoses and medical needs',
	communication: 'Service plan: Communication',
	cognitive: 'Service plan: Cognitive status',
	senses: 'Service plan: Vision and hearing',
	physical: 'Service plan: Diet and physical ability',
	behavior: 'Service plan: Behavioral status',
	goals: 'Service plan: Strengths, goals and interests',
	living: 'Service plan: Community living',
	supports: 'Service plan: Informal supports',
	formal: 'Service plan: Formal supports',
	meds: 'Service plan: Medications',
	need: 'Service plan: Alternatives and need for waiver',
	services: 'Service plan: Requested waiver services',
	costs: 'Service plan: Cost projection',
	schedule: 'Service plan: Weekly schedule'
};

const questions: Question[] = [];
const fields: FieldDef[] = [];

// ---- geometry -------------------------------------------------------------------------------

/** Text sitting on a printed rule that runs from x0 to x1 at height y. */
const line = (page: number, x0: number, x1: number, y: number, size = 9): TextTarget => ({
	page,
	x: x0 + 2,
	y: y + 2.5,
	maxWidth: x1 - x0 - 4,
	size
});

/** Wrapped text inside a printed box (x0,y0)-(x1,y1); as many lines as fit. */
function box(page: number, x0: number, x1: number, y0: number, y1: number, size = 9): TextTarget {
	const lineHeight = size * 1.2;
	// Cap height ~0.72em plus 3pt below the top edge; descenders ~0.22em plus 2pt above the bottom edge.
	const first = y1 - size * 0.72 - 3;
	const lines = Math.max(1, Math.floor((first - y0 - size * 0.22 - 2) / lineHeight) + 1);
	return { page, x: x0 + 4, y: first, maxWidth: x1 - x0 - 8, size, lines, lineHeight };
}

/** Table cell whose `lines` lines stack up from the rule at y (last line sits on the rule). */
function above(
	page: number,
	x0: number,
	x1: number,
	y: number,
	lines: number,
	size: number
): TextTarget {
	const lineHeight = size + 0.5;
	return {
		page,
		x: x0 + 1.5,
		y: y + 2.5 + (lines - 1) * lineHeight,
		maxWidth: x1 - x0 - 3,
		size,
		lines,
		lineHeight
	};
}

/** "X" centred in a 9pt printed checkbox whose lower-left corner is (x, y). */
const mark = (page: number, x: number, y: number): MarkTarget => ({
	page,
	x: x + 1.2,
	y: y + 1,
	mark: true
});

// ---- questions and fields -------------------------------------------------------------------

type Extra = Partial<Omit<Question, 'key' | 'label' | 'type' | 'group'>>;

function ask(
	name: string,
	label: string,
	type: QuestionType,
	group: string,
	extra: Extra = {}
): string {
	questions.push({ key: k(name), label, type, group, ...extra });
	return k(name);
}

const put = (src: FieldDef['src'], to: FieldDef['to'], extra: Omit<FieldDef, 'src' | 'to'> = {}) =>
	void fields.push({ src, to, ...extra });

/** Form-local question printed at one target. */
function say(
	name: string,
	label: string,
	group: string,
	to: TextTarget,
	type: QuestionType = 'longtext',
	extra: Extra = {}
) {
	put(ask(name, label, type, group, extra), to);
}

/** Optional form-local narrative box. */
const note = (name: string, label: string, group: string, to: TextTarget) =>
	say(name, label, group, to, 'longtext', { optional: true });

/** One checkbox question per printed box ("check all that apply"). Boxes: [name, label, x, y]. */
function tick(group: string, page: number, boxes: [string, string, number, number][]) {
	for (const [name, label, x, y] of boxes)
		put(ask(name, label, 'checkbox', group), mark(page, x, y));
}

/** One select question; each option with a printed box gets an X there. Boxes: [option, x, y]. */
function pick(
	name: string,
	label: string,
	group: string,
	page: number,
	boxes: [string, number, number][],
	extra: Extra & { more?: string[] } = {}
): string {
	const { more = [], ...rest } = extra;
	const key = ask(name, label, 'select', group, {
		options: [...boxes.map((b) => b[0]), ...more],
		...rest
	});
	for (const [option, x, y] of boxes)
		put((d) => d[key] === option, mark(page, x, y), { needs: [key] });
	return key;
}

const yesNo = (
	name: string,
	label: string,
	group: string,
	page: number,
	yesX: number,
	noX: number,
	y: number,
	extra: Extra = {}
) =>
	pick(
		name,
		label,
		group,
		page,
		[
			['Yes', yesX, y],
			['No', noX, y]
		],
		extra
	);

/** Mark a box when another answer is filled in (e.g. "Other (specify): ____"). */
const markIf = (key: string, page: number, x: number, y: number) =>
	put((d) => isAnswered(d[key]), mark(page, x, y));

// ---- value helpers --------------------------------------------------------------------------

const str = (d: CaseData, key: string) =>
	typeof d[key] === 'string' ? (d[key] as string).trim() : '';

/** "418 Maple Ave, Apt 2B, Albany, NY 12208" → street / city / state / ZIP (everything in street if it doesn't parse). */
function splitAddress(v: string) {
	const m = /^(.+),\s*([^,]+),\s*([A-Za-z]{2})\.?,?\s+(\d{5}(?:-\d{4})?)$/.exec(v.trim());
	return m
		? { street: m[1], city: m[2], state: m[3].toUpperCase(), zip: m[4] }
		: { street: v.trim(), city: '', state: '', zip: '' };
}

const amount = (v: unknown) => {
	const n = Number(String(v ?? '').replace(/[$,\s]/g, ''));
	return Number.isFinite(n) ? n : 0;
};

/** Sum of a money column, or null when no row has a value. */
function total(d: CaseData, table: string, col: string, rows: number): number | null {
	let sum: number | null = null;
	for (let r = 0; r < rows; r++) {
		const v = d[cell(table, r, col)];
		if (isAnswered(v)) sum = (sum ?? 0) + amount(v);
	}
	return sum;
}

const add = (...xs: (number | null)[]) =>
	xs.every((x) => x === null) ? null : xs.reduce<number>((a, x) => a + (x ?? 0), 0);
const usd = (n: number | null) => (n === null ? '' : formatMoney(n.toFixed(2)));

// =============================================================================================
// Page 1: 1. Identification, 2. Individuals participating
// =============================================================================================
{
	const p = 0;
	put(ask('planDate', 'Date of Initial Service Plan', 'date', G.id), [
		line(p, 54, 159, 678),
		line(18, 679, 757, 525)
	]);
	put('intake.referralNumber', line(p, 462, 576, 678));
	const title = pick(
		'title',
		'Applicant title',
		G.id,
		p,
		[
			['Mr.', 99, 627],
			['Mrs.', 129, 627],
			['Ms.', 162, 627]
		],
		{
			optional: true
		}
	);
	for (const [option, x] of [
		['Mr.', 36],
		['Mrs.', 66],
		['Ms.', 99]
	] as const) {
		put((d) => d[title] === option, mark(19, x, 600));
	}
	put('participant.name', line(p, 189, 576, 627));
	put('participant.dob', line(p, 36, 138, 594));
	put('participant.cin', line(p, 150, 252, 594));
	put(
		(d) => str(d, 'participant.countyFiscalResponsibility') || str(d, 'participant.county'),
		line(p, 264, 477, 594),
		{ label: 'County of fiscal responsibility', needs: ['participant.county'] }
	);
	yesNo('medicaidVerified', 'Medicaid eligibility verified (attach proof)', G.id, p, 522, 552, 594);

	const addr = (
		key: string,
		x0: number,
		y1: number,
		y2: number,
		label: string,
		county: (d: CaseData) => string
	) => {
		const part = (f: 'street' | 'city' | 'state' | 'zip') => (d: CaseData) =>
			splitAddress(str(d, key))[f];
		put(part('street'), line(p, x0, 576, y1), { label, needs: [key] });
		put(part('city'), line(p, 51, 216, y2), { label: `${label}: city` });
		put(county, line(p, 252, 408, y2), { label: `${label}: county` });
		put(part('state'), line(p, 438, 468, y2), { label: `${label}: state` });
		put(part('zip'), line(p, 492, 576, y2), { label: `${label}: ZIP` });
	};
	addr('participant.address', 90, 540, 513, 'Street address', (d) => str(d, 'participant.county'));
	ask('mailingAddress', 'Mailing address, if different (street, city, state ZIP)', 'text', G.id, {
		optional: true
	});
	const mailCounty = ask('mailingCounty', 'Mailing address county', 'text', G.id, {
		optional: true
	});
	addr(k('mailingAddress'), 171, 486, 459, 'Mailing address', (d) => str(d, mailCounty));

	put('participant.phone', line(p, 60, 225, 432));
	say('phoneWork', 'Work phone', G.id, line(p, 237, 399, 432), 'phone', { optional: true });
	say('phoneCell', 'Cell phone', G.id, line(p, 411, 576, 432), 'phone', { optional: true });
	pick(
		'pathway',
		'Transition or diversion',
		G.id,
		p,
		[
			['Transition', 147, 396],
			['Diversion', 219, 396]
		],
		{
			help: 'Transition: moving out of a nursing facility. Diversion: preventing a nursing facility placement.'
		}
	);
	pick(
		'facility',
		'Facility location (transitions only)',
		G.id,
		p,
		[
			['In-State', 291, 396],
			['Out of State', 363, 396]
		],
		{
			optional: true
		}
	);

	const team = ask(
		'team',
		'Individuals the applicant selected to help develop this plan',
		'table',
		G.id,
		{
			rows: 6,
			columns: [
				{ id: 'name', label: 'Name' },
				{ id: 'relationship', label: 'Relationship to applicant' },
				{ id: 'phone', label: 'Phone', type: 'phone' }
			]
		}
	);
	for (let r = 0; r < 6; r++) {
		const y = 306 - 27 * r;
		put(cell(team, r, 'name'), line(p, 36, 318, y));
		put(cell(team, r, 'relationship'), line(p, 330, 453, y));
		put(cell(team, r, 'phone'), line(p, 465, 576, y));
	}
}

// =============================================================================================
// Page 2: 3.A Personal history (developmental, education, work, mental health)
// =============================================================================================
{
	const p = 1;
	tick(G.history, p, [
		['developmentalNormal', 'Developmental history within normal limits', 271, 699]
	]);
	const dev = ask('developmental', 'Developmental concerns (describe)', 'longtext', G.history, {
		optional: true
	});
	markIf(dev, p, 40, 678);
	put(dev, box(p, 40, 577, 603, 669));
	say(
		'education',
		'Educational history (highest level, degrees, special education)',
		G.history,
		box(p, 40, 577, 534, 573)
	);
	say(
		'work',
		'Work history (significant employment, volunteer positions)',
		G.history,
		box(p, 40, 577, 468, 507)
	);

	pick(
		'mhHistory',
		'Mental health history',
		G.mental,
		p,
		[
			['No history of mental health issues or concerns', 40, 429],
			['History indicated, declined to give details', 40, 417]
		],
		{ more: ['History described below'] }
	);
	note('psychDiagnoses', 'Current psychiatric diagnoses', G.mental, box(p, 40, 577, 342, 390));
	note(
		'psychHistory',
		'History of psychiatric intervention (treatments and hospitalizations, in order)',
		G.mental,
		box(p, 40, 577, 270, 318)
	);
	note(
		'psychConcerns',
		'Current psychiatric concerns and best methods of support',
		G.mental,
		box(p, 40, 577, 201, 249)
	);
	const freq = pick(
		'mhCounseling',
		'Psychiatric concerns managed by counseling: how often',
		G.mental,
		p,
		[
			['Weekly', 208, 171],
			['Monthly', 271, 171],
			['Quarterly', 325, 171],
			['Other', 385, 171]
		],
		{ optional: true }
	);
	markIf(freq, p, 49, 171);
	say(
		'mhCounselingOther',
		'Counseling frequency (other)',
		G.mental,
		line(p, 451, 577, 171),
		'text',
		{ optional: true }
	);
	const rx = pick(
		'mhPrescriber',
		'Psychiatric concerns managed by medication: prescribed by',
		G.mental,
		p,
		[
			['Psychiatrist', 208, 153],
			['Primary Care Physician', 271, 153],
			['Other', 385, 153]
		],
		{ optional: true }
	);
	markIf(rx, p, 49, 153);
	say(
		'mhPrescriberOther',
		'Medication prescribed by (other)',
		G.mental,
		line(p, 451, 577, 153),
		'text',
		{ optional: true }
	);
	tick(G.mental, p, [
		['psychDeferred', 'Psychiatric intervention recommended but deferred by the applicant', 40, 129]
	]);
	note(
		'mhOther',
		'Other mental health information (impact on daily living)',
		G.mental,
		box(p, 40, 577, 54, 102)
	);
}

// =============================================================================================
// Page 3: substance use and criminal justice history
// =============================================================================================
{
	const p = 2;
	pick(
		'saHistory',
		'Substance use history',
		G.substance,
		p,
		[
			['No history of substance abuse issues or concerns', 35, 723],
			['History indicated, declined to give details', 35, 711]
		],
		{ more: ['History described below'] }
	);
	tick(G.substance, p, [
		['saAlcohol', 'History with alcohol', 44, 675],
		['saPrescription', 'History with prescription drugs', 92, 675],
		['saOtc', 'History with over-the-counter legal drugs', 176, 675]
	]);
	const illegal = ask('saIllegal', 'History with illegal drugs (specify)', 'text', G.substance, {
		optional: true
	});
	markIf(illegal, p, 44, 657);
	put(illegal, line(p, 131, 317, 657));
	const other = ask('saOther', 'History with other substances (specify)', 'text', G.substance, {
		optional: true
	});
	markIf(other, p, 326, 657);
	put(other, line(p, 392, 572, 657));
	note(
		'saTreatment',
		'History of substance abuse treatment (in order)',
		G.substance,
		box(p, 35, 572, 600, 630)
	);
	tick(G.substance, p, [
		['saCounseling', 'Current substance use managed by counseling', 224, 585],
		['saMedication', 'Current substance use managed by medication', 290, 585]
	]);
	const outpatient = pick(
		'saOutpatient',
		'Attends outpatient treatment: how often',
		G.substance,
		p,
		[
			['Daily', 224, 570],
			['Weekly', 269, 570],
			['Other', 326, 570]
		],
		{ optional: true }
	);
	markIf(outpatient, p, 125, 570);
	say(
		'saOutpatientOther',
		'Outpatient treatment frequency (other)',
		G.substance,
		line(p, 392, 572, 570),
		'text',
		{ optional: true }
	);
	tick(G.substance, p, [
		['saNA', 'Attends Narcotics Anonymous', 125, 552],
		['saAA', 'Attends Alcoholics Anonymous', 224, 552]
	]);
	const group = ask('saGroupOther', 'Attends other support group (specify)', 'text', G.substance, {
		optional: true
	});
	markIf(group, p, 326, 552);
	put(group, line(p, 392, 572, 552));
	yesNo('saMentor', 'Has an AA/NA mentor', G.substance, p, 179, 212, 534, { optional: true });
	say('saSobriety', 'Length of sobriety/abstinence', G.substance, line(p, 392, 572, 534), 'text', {
		optional: true
	});
	note(
		'saImpact',
		'Other substance use information (impact on daily living)',
		G.substance,
		box(p, 35, 572, 474, 504)
	);

	pick(
		'cjHistory',
		'Criminal justice history',
		G.justice,
		p,
		[
			['No history of involvement in the criminal justice system', 35, 420],
			['History indicated, declined to give details', 35, 408]
		],
		{ more: ['History described below'] }
	);
	note(
		'cjDetails',
		'History of criminal justice involvement (arrests and incarcerations, in order)',
		G.justice,
		box(p, 35, 572, 342, 381)
	);
	pick(
		'cjSupervision',
		'Currently on probation or parole',
		G.justice,
		p,
		[
			['Probation', 146, 321],
			['Parole', 200, 321]
		],
		{
			optional: true,
			more: ['Neither']
		}
	);
	say('cjCharge', 'Probation/parole charge', G.justice, line(p, 320, 572, 321), 'text', {
		optional: true
	});
	note('cjConditions', 'Conditions of probation/parole', G.justice, box(p, 35, 572, 267, 297));
	say('cjEnds', 'Probation/parole expected to end on', G.justice, line(p, 192, 572, 249), 'date', {
		optional: true
	});
	note('cjOther', 'Other criminal justice information', G.justice, box(p, 35, 572, 195, 225));
}

// =============================================================================================
// Page 4: 3.B Medical/functional information, a. communication
// =============================================================================================
{
	const p = 3;
	put('participant.diagnosis', line(p, 108, 573, 690), { label: 'Primary diagnosis' });
	say('otherDiagnoses', 'Other diagnoses', G.medical, line(p, 102, 573, 669), 'text', {
		optional: true
	});
	say('allergies', 'Known allergies', G.medical, line(p, 117, 573, 648), 'text', {
		help: 'Write "None known" if none.'
	});
	const summary = ask(
		'medicalSummary',
		'Summary of significant diagnosis/injury/illness (onset, rehab, treatments, surgeries)',
		'longtext',
		G.medical,
		{ help: 'The date of injury, age at onset and cause are printed before this automatically.' }
	);
	put(
		(d) => {
			const onset = str(d, 'participant.injury.onsetDate');
			const age = str(d, 'participant.injury.ageAtOnset');
			const cause = str(d, 'participant.injury.cause');
			return [
				onset && `Date of injury: ${formatDate(onset)}${age ? ` (age ${age})` : ''}.`,
				cause && `Cause: ${cause}.`,
				str(d, summary)
			]
				.filter(Boolean)
				.join(' ');
		},
		box(p, 36, 573, 552, 606),
		{
			label: 'Summary of diagnosis/injury/illness',
			needs: [summary, 'participant.injury.onsetDate', 'participant.injury.ageAtOnset']
		}
	);
	say(
		'skilledCare',
		'Skilled care needs, ADL supports needed, and who will provide them',
		G.medical,
		box(p, 36, 573, 456, 510)
	);
	say(
		'tools',
		'Tools, strategies, equipment, E-mods or assistive technology used or wanted',
		G.medical,
		box(p, 36, 573, 366, 420)
	);

	pick('language', 'Primary language', G.communication, p, [
		['English', 126, 297],
		['Other', 177.3, 297]
	]);
	say(
		'languageOther',
		'Primary language (other)',
		G.communication,
		line(p, 243.3, 369.3, 297),
		'text',
		{ optional: true }
	);
	say('commMode', 'Primary mode of communication', G.communication, line(p, 162, 369, 276), 'text');
	say(
		'otherLanguages',
		'Other languages spoken/understood',
		G.communication,
		line(p, 177, 573, 255),
		'text',
		{ optional: true }
	);
	tick(G.communication, p, [
		['commEffective', 'Effectively communicates wants/needs', 105, 237],
		['commConversation', 'Can carry on a conversation', 105, 225]
	]);
	const alt = ask(
		'commAlternative',
		'Uses alternative communication (specify)',
		'text',
		G.communication,
		{ optional: true }
	);
	markIf(alt, p, 105, 213);
	put(alt, line(p, 270, 573, 213));
	const translator = ask(
		'commTranslator',
		'Needs a translator (person/agency)',
		'text',
		G.communication,
		{ optional: true }
	);
	markIf(translator, p, 105, 201);
	put(translator, line(p, 267, 573, 201));
	tick(G.communication, p, [
		['commPromptInitiate', 'Needs prompting/cueing to initiate communication', 105, 189],
		['commArticulation', 'Has difficulties with articulation/speech', 105, 177],
		['commPromptEngage', 'Needs prompting/cueing to engage in conversation', 105, 165]
	]);
	note(
		'commPreferences',
		'Preferences for effective communication',
		G.communication,
		box(p, 36, 573, 105, 138)
	);
	note(
		'commSupports',
		'Communication supports requested',
		G.communication,
		box(p, 36, 573, 51, 84)
	);
}

// =============================================================================================
// Page 5: b. cognitive status, vision, hearing
// =============================================================================================
{
	const p = 4;
	tick(G.cognitive, p, [
		['orientTime', 'Oriented to time', 139, 720],
		['orientPerson', 'Oriented to person', 187, 720],
		['orientDay', 'Oriented to day/week', 235, 720],
		['orientConfused', 'Easily confused', 394, 720],
		['orientPlace', 'Oriented to place', 139, 708],
		['orientActivities', 'Oriented to activities', 187, 708],
		['orientPrompting', 'Needs prompting/cueing for orientation', 235, 708],
		['orientNot', 'Not oriented', 394, 708],
		['attnIndependent', 'Able to stay on task independently', 139, 681],
		['attnOccasional', 'Needs occasional verbal cues to stay on task', 289, 681],
		['attnDistracted', 'Easily distracted', 139, 669],
		['attnConstant', 'Requires constant cueing/prompting', 289, 669],
		['initInitiates', 'Initiates activities', 139, 642],
		['initCues', 'Needs cues/prompts to initiate tasks', 289, 642],
		['initRequests', 'Requests assistance when needed', 139, 630],
		['initCannot', 'Cannot initiate tasks/activities', 289, 630],
		['initVaries', 'Initiation ability varies for ADLs', 139, 618],
		['memFunctional', 'Memory is functional for day-to-day activities', 139, 591],
		['memShort', 'Short-term memory difficulties', 139, 579],
		['memLong', 'Long-term memory difficulties', 139, 567],
		['orgGood', 'Good organizational skills', 139, 543],
		['orgPrompting', 'Needs prompting/cueing for organization', 289, 543],
		['orgVaries', 'Organization varies by task/activity', 139, 531],
		['orgOthers', 'Needs others to provide organization', 289, 531],
		['psAware', 'Aware of current skills/limitations', 139, 507],
		['psCues', 'Needs cues/prompts for problem-solving', 289, 507],
		['psReasonable', 'Makes reasonable decisions', 139, 495],
		['psUnable', 'Unable to engage in problem-solving', 289, 495]
	]);
	note(
		'cogOther',
		'Other information about cognitive status',
		G.cognitive,
		box(p, 37, 574, 426, 465)
	);
	pick('cogOverall', 'Overall cognitive status', G.cognitive, p, [
		['Self-directing', 139, 411],
		['Needs periodic oversight/supervision', 139, 399],
		['Needs constant oversight/supervision', 139, 387]
	]);

	tick(G.senses, p, [['visionAdequate', 'Vision is adequate for daily activities', 188.9, 354]]);
	// Eye conditions: one select per condition, marking the condition box and its right/left eye boxes.
	const eyes = (name: string, label: string, y: number) => {
		const key = ask(name, label, 'select', G.senses, {
			options: ['Right eye', 'Left eye', 'Both eyes'],
			optional: true
		});
		markIf(key, p, 139.9, y);
		put((d) => d[key] === 'Right eye' || d[key] === 'Both eyes', mark(p, 227.9, y));
		put((d) => d[key] === 'Left eye' || d[key] === 'Both eyes', mark(p, 284.9, y));
	};
	eyes('visionImpaired', 'Visually impaired', 336);
	eyes('cataracts', 'Cataracts', 321);
	eyes('blind', 'Blind', 306);
	eyes('eyeProsthesis', 'Eye prosthesis', 291);
	tick(G.senses, p, [
		['glasses', 'Wears glasses', 335.9, 336],
		['largePrint', 'Needs large print', 407.9, 336],
		['braille', 'Uses Braille', 335.9, 306],
		['guideDog', 'Guide dog', 139.9, 276]
	]);
	const visionOther = ask('visionOther', 'Other vision need (specify)', 'text', G.senses, {
		optional: true
	});
	markIf(visionOther, p, 335.9, 276);
	put(visionOther, line(p, 369, 574.9, 273));
	note('visionInfo', 'Other information about vision', G.senses, box(p, 37.9, 574.9, 216, 255));
	tick(G.senses, p, [
		['hearsAdequately', 'Hears adequately', 188.9, 195],
		['hearingDifficulty', 'Hearing difficulty', 139.9, 177]
	]);
	const aid = ask('hearingAid', 'Uses hearing aid', 'select', G.senses, {
		options: ['Right ear', 'Left ear', 'Both ears'],
		optional: true
	});
	markIf(aid, p, 139.9, 162);
	put((d) => d[aid] === 'Right ear' || d[aid] === 'Both ears', mark(p, 227.9, 162));
	put((d) => d[aid] === 'Left ear' || d[aid] === 'Both ears', mark(p, 284.9, 162));
	tick(G.senses, p, [['signLanguage', 'Uses sign language', 139.9, 147]]);
	const devices = ask('hearingDevices', 'Other hearing devices used', 'text', G.senses, {
		optional: true
	});
	markIf(devices, p, 139.9, 132);
	put(devices, line(p, 218, 574.9, 129));
	note('hearingOther', 'Other hearing methods used', G.senses, box(p, 37.9, 574.9, 75, 114));
}

// =============================================================================================
// Page 6: c. physical status: diet, ADL/IADL
// =============================================================================================
{
	const p = 5;
	tick(G.physical, p, [
		['dietRegular', 'Regular diet', 188, 711],
		['dietLowSodium', 'Low sodium', 139, 696],
		['dietCardiac', 'Cardiac diet', 218, 696],
		['dietSupplement', 'Nutritional supplement', 287, 696],
		['dietGround', 'Ground consistency', 392, 696],
		['dietThickened', 'Thickened liquids', 494, 696],
		['dietLowFat', 'Low fat', 139, 684],
		['dietDiabetic', 'Diabetic diet', 218, 684],
		['dietSwallowing', 'Swallowing difficulties', 287, 684],
		['dietChopped', 'Chopped consistency', 392, 684],
		['dietTube', 'Tube feeding', 494, 684],
		['dietLowCholesterol', 'Low cholesterol', 139, 672],
		['dietRenal', 'Renal diet', 218, 672],
		['dietPureed', 'Pureed foods', 287, 672],
		['dietAspiration', 'Aspiration precautions', 392, 672],
		['dietAdaptive', 'Adaptive eating equipment', 494, 672],
		['denturesUpper', 'Dentures: upper', 139, 651],
		['denturesLower', 'Dentures: lower', 218, 651],
		['denturesPartial', 'Dentures: partial', 287, 651]
	]);
	say(
		'dietSpecial',
		'Special dietary considerations (e.g. vegan, kosher)',
		G.physical,
		line(p, 275, 574, 621),
		'text',
		{
			optional: true
		}
	);
	note(
		'eating',
		'Other information about eating and drinking',
		G.physical,
		box(p, 37, 574, 564, 594)
	);

	tick(G.physical, p, [
		['adlIndependent', 'Independent in all ADLs/IADLs', 200, 546],
		['ambCane', 'Ambulates with a cane', 138, 528],
		['ambWalker', 'Ambulates with a walker', 191, 528],
		['ambWheelchair', 'Uses a wheelchair', 248, 528],
		['ambScooter', 'Uses a scooter', 311, 528],
		['ambUnable', 'Unable to ambulate', 368, 528]
	]);
	pick(
		'ambulate',
		'Ability to ambulate',
		G.physical,
		p,
		[
			['Independent', 138, 507],
			['Needs periodic supervision/oversight', 138, 495],
			['Needs ongoing supervision/oversight', 138, 483],
			['One person assist', 286, 507],
			['Two person assist', 286, 495],
			['Unable', 286, 483]
		],
		{ optional: true }
	);
	pick(
		'transfer',
		'Ability to transfer',
		G.physical,
		p,
		[
			['Independent', 138, 462],
			['Needs periodic supervision/oversight', 138, 450],
			['Needs ongoing supervision/oversight', 138, 438],
			['One person assist', 286, 462],
			['Two person assist', 286, 450],
			['Unable', 286, 438],
			['Mechanical lift', 371, 462],
			['Other', 371, 438]
		],
		{ optional: true }
	);
	say('transferOther', 'Ability to transfer (other)', G.physical, line(p, 404, 572, 438), 'text', {
		optional: true
	});
	const levels = (y: number): [string, number, number][] => [
		['Independent', 138, y],
		['Needs verbal cues/prompts', 138, y - 12],
		['Needs physical cues/prompts', 138, y - 24],
		['Needs hands-on assistance', 286, y],
		['Must be completed by others', 286, y - 12]
	];
	pick('adlBasic', 'Basic ADLs (eating, dressing, toileting, etc.)', G.physical, p, levels(417), {
		optional: true
	});
	pick(
		'adlInstrumental',
		'Instrumental ADLs (shopping, banking, etc.)',
		G.physical,
		p,
		levels(372),
		{ optional: true }
	);
	pick(
		'endurance',
		'Endurance/strength',
		G.physical,
		p,
		[
			['Able to engage in routine activities', 138, 327],
			['Experiences periodic fatigue', 138, 315],
			['Fatigues easily', 138, 303],
			['Requires frequent rest periods', 286, 327],
			['Needs physical assistance to engage in routine activities', 286, 315]
		],
		{ optional: true }
	);
	note(
		'physicalOther',
		'Other information about physical ability',
		G.physical,
		box(p, 38, 575, 240, 276)
	);
}

// =============================================================================================
// Page 7: d. behavioral status; present strengths, goals, interests
// =============================================================================================
{
	const p = 6;
	const b = (name: string, label: string, group: string, top: number, optional = false) =>
		say(name, label, group, box(p, 39, 573, top - 36, top), 'longtext', { optional });
	b(
		'behaviors',
		'Behaviors that may not be accepted in the community (frequency, duration, effective interventions)',
		G.behavior,
		702,
		true
	);
	b('strategies', 'Interest in and willingness to use available strategies/tools', G.behavior, 645);
	b(
		'adjustment',
		'How the applicant describes their emotional adjustment to the disability',
		G.behavior,
		588
	);
	b('adjustmentGoals', 'Applicant goals related to adjustment to the disability', G.behavior, 531);
	b(
		'familyImpact',
		'Impact of the disability on significant family members and informal supports',
		G.behavior,
		474,
		true
	);
	b(
		'familyGoals',
		'Goals for significant family members and informal supports',
		G.behavior,
		417,
		true
	);
	b(
		'strengths',
		'Strengths and challenges identified by the applicant or their supports',
		G.goals,
		336
	);
	b(
		'goals',
		'Long-term and short-term goals for the waiver (living at home, work, education, volunteering)',
		G.goals,
		264
	);
	b('hobbies', 'Hobbies and interests (how the disability has affected them)', G.goals, 207);
	b('activities', 'Activities the applicant would like to resume or start', G.goals, 150);
	b('culture', 'Culture and/or religion: assistance needed to follow practices', G.goals, 81, true);
}

// =============================================================================================
// Page 8: 4. Plans for community living
// =============================================================================================
{
	const p = 7;
	say(
		'currentLiving',
		'Current living situation (location, setting, dwelling, household; nursing home name if any)',
		G.living,
		box(p, 40, 574, 630.4, 684)
	);
	note(
		'proposedLiving',
		'Proposed living situation, if different (location, setting, layout, household)',
		G.living,
		box(p, 40, 574, 541.6, 595.2)
	);
	const rows: [string, string, number][] = [
		[
			'resIntegrated',
			'Residence is integrated in and supports full access to the greater community',
			504
		],
		[
			'resSelected',
			'Residence was selected from options by the individual and ensures privacy, dignity, respect and freedom from coercion and restraint',
			477
		],
		['resAutonomy', 'Residence optimizes autonomy and independence in making life choices', 450],
		['resChoice', 'Residence facilitates choice about services and who provides them', 429],
		['resSmall', 'Community-based residence with no more than 4 unrelated individuals', 408]
	];
	for (const [name, label, y] of rows) yesNo(name, label, G.living, p, 514, 550, y);
	say(
		'dailyActivities',
		'Anticipated daily activities (social, recreational, leisure, vocational, educational)',
		G.living,
		box(p, 40, 576.1, 318, 363)
	);
	note(
		'barriers',
		'Barriers to participating in those activities',
		G.living,
		box(p, 40, 576.1, 252, 297)
	);
}

// =============================================================================================
// Page 9: 5.A Family/friend/community supports (12 rows)
// =============================================================================================
{
	const p = 8;
	const extra = ask(
		'supports',
		'Informal supports: age and how often support is given',
		'table',
		G.supports,
		{
			rows: 12,
			help: 'Rows line up with the informal supports listed under Supports.',
			columns: [
				{ id: 'age', label: 'Age', type: 'number' },
				{
					id: 'frequency',
					label: 'Support is',
					type: 'select',
					options: ['Intermittent/periodic', 'Consistent/ongoing', 'Emergency only']
				}
			]
		}
	);
	const S = 'supports.informal';
	for (let r = 0; r < 12; r++) {
		const top = 684 - 45 * r;
		put(
			(d) => [str(d, cell(S, r, 'name')), str(d, cell(S, r, 'phone'))].filter(Boolean).join('\n'),
			box(p, 38, 170, top - 33, top, 8),
			{ label: `Informal support ${r + 1}: name and phone` }
		);
		put(cell(extra, r, 'age'), box(p, 174, 199, top - 33, top, 8));
		put(cell(S, r, 'relationship'), box(p, 203, 293, top - 33, top, 8));
		put(cell(S, r, 'support'), box(p, 299, 476, top - 33, top, 8));
		const freq = cell(extra, r, 'frequency');
		['Intermittent/periodic', 'Consistent/ongoing', 'Emergency only'].forEach((option, i) =>
			put((d) => d[freq] === option, mark(p, 485, top - 9 - 12 * i))
		);
	}
	note(
		'supportsInfo',
		'Additional information about informal supports',
		G.supports,
		box(p, 38, 574.1, 51, 129)
	);
}

// =============================================================================================
// Page 10: 5.B Formal supports, payors, physicians
// =============================================================================================
{
	const p = 9;
	const benefit = (name: string, label: string, x: number, bx0: number) => {
		const key = ask(name, `${label} monthly amount`, 'money', G.formal, { optional: true });
		markIf(key, p, x, 681);
		put(key, box(p, bx0, bx0 + 63, 678, 693));
	};
	benefit('ssi', 'SSI', 36, 102);
	benefit('ssdi', 'SSDI', 207, 273);
	benefit('ssa', 'SSA', 360, 426);
	const medicare: [string, string, number][] = [
		['medicareA', 'Medicare Part A', 126],
		['medicareB', 'Medicare Part B', 207],
		['medicareManaged', 'Medicare managed care', 279],
		['medicareD', 'Medicare Part D', 360],
		['qmb', 'QMB (Qualified Medicare Beneficiary)', 432],
		['slmb', 'SLMB (Specified Low-Income Medicare Beneficiary)', 504]
	];
	tick(
		G.formal,
		p,
		medicare.map(([n, l, x]) => [n, l, x, 663])
	);
	put((d) => medicare.some(([n]) => d[k(n)] === true), mark(p, 36, 663));
	tick(G.formal, p, [
		['vaPension', 'VA pension', 36, 648],
		['vaMedical', 'VA medical', 126, 648],
		['vaAide', 'VA aide and attendant services', 207, 648],
		['vaEquipment', 'VA equipment', 360, 648],
		['section8', 'HUD Section 8', 126, 630]
	]);
	const housing = ask('housingOther', 'Other subsidized housing (specify)', 'text', G.formal, {
		optional: true
	});
	markIf(housing, p, 207, 630);
	put(housing, box(p, 342, 576, 627, 642));
	put((d) => d[k('section8')] === true || isAnswered(d[housing]), mark(p, 36, 630));
	tick(G.formal, p, [['epic', 'EPIC (prescription program)', 36, 606]]);
	const pharmacy = ask('pharmacyProgram', 'Other pharmacy program (specify)', 'text', G.formal, {
		optional: true
	});
	markIf(pharmacy, p, 126, 606);
	put(pharmacy, box(p, 258, 576, 606, 621));
	tick(G.formal, p, [
		['foodStamps', 'Food Stamps (SNAP)', 36, 588],
		['heap', 'HEAP', 36, 567],
		['mealsOnWheels', 'Meals-on-Wheels', 126, 567]
	]);
	const ofa = ask('officeForAging', 'Office for the Aging services (specify)', 'text', G.formal, {
		optional: true
	});
	markIf(ofa, p, 36, 546);
	put(ofa, box(p, 150, 576, 543, 558));
	const otherSupport = ask(
		'formalOther',
		'Other non-Medicaid support (specify)',
		'text',
		G.formal,
		{ optional: true }
	);
	markIf(otherSupport, p, 36, 525);
	put(otherSupport, box(p, 126, 576, 522, 537));

	const payors = ['Private Health Insurance', 'Medicare', 'VA Medical', 'Medicaid', 'Other'];
	const payor = (name: string, label: string, y: number, optional: boolean) => {
		const xs = [104.6, 209.6, 263.6, 323.6];
		pick(
			name,
			label,
			G.formal,
			p,
			[
				...payors.slice(0, 4).map((o, i): [string, number, number] => [o, xs[i], y]),
				['Other', 104.6, y - 18]
			],
			{
				optional
			}
		);
		say(`${name}Other`, `${label} (other)`, G.formal, box(p, 176.6, 575.6, y - 21, y - 6), 'text', {
			optional: true
		});
	};
	payor('payorPrimary', 'Primary payor', 468, false);
	payor('payorSecondary', 'Secondary payor', 429, true);
	payor('payorTertiary', 'Tertiary payor', 390, true);

	const doctor = (name: string, label: string, y0: number, optional: boolean) => {
		say(name, label, G.formal, box(p, 137.6, 431.6, y0, y0 + 15), 'text', { optional });
		say(`${name}Phone`, `${label}: phone`, G.formal, box(p, 467.6, 575.6, y0, y0 + 15), 'phone', {
			optional
		});
	};
	doctor('pcp', 'Primary physician name', 327, false);
	doctor('specialist1', 'Physician name/specialty (1)', 306, true);
	doctor('specialist2', 'Physician name/specialty (2)', 285, true);
	doctor('dentist', 'Dentist name', 264, true);
	yesNo('referrals', 'Referrals to other doctors indicated now', G.formal, p, 467.6, 503.6, 246);
	say(
		'referralReason',
		'Referral type and reason',
		G.formal,
		box(p, 167.6, 575.6, 207, 237),
		'text',
		{ optional: true }
	);
	yesNo(
		'schedulesOwn',
		'Applicant can schedule their own appointments',
		G.formal,
		p,
		467.6,
		503.6,
		189
	);
	say(
		'schedulingHelp',
		'Who will help with scheduling appointments',
		G.formal,
		box(p, 293.6, 575.6, 165, 180),
		'text',
		{ optional: true }
	);
	yesNo(
		'needsPhysicianHelp',
		"Needs the Service Coordinator's help finding physicians",
		G.formal,
		p,
		467.6,
		503.6,
		147
	);
	yesNo(
		'needsEscort',
		'Needs someone to accompany them to medical appointments',
		G.formal,
		p,
		467.6,
		503.6,
		126
	);
	say(
		'escort',
		'Who will accompany the applicant to medical appointments',
		G.formal,
		box(p, 293.6, 575.6, 90, 105),
		'text',
		{ optional: true }
	);
	pick('transportBy', 'Who sets up transportation', G.formal, p, [
		['Applicant', 158.6, 72],
		['Other', 221.6, 72]
	]);
	say(
		'transportOther',
		'Who sets up transportation (other)',
		G.formal,
		box(p, 293.6, 575.6, 69, 84),
		'text',
		{ optional: true }
	);
}

// =============================================================================================
// Page 11: 5.C Medications, 6. Alternatives considered, 7. Need for waiver services
// =============================================================================================
{
	const p = 10;
	tick(G.meds, p, [
		['medsPrivate', 'Medications funded by private health insurance', 106, 699],
		['medsMedicare', 'Medications funded by Medicare', 211, 699],
		['medsVA', 'Medications funded by VA Medical', 265, 699],
		['medsMedicaid', 'Medications funded by Medicaid', 325, 699]
	]);
	const funding = ask('medsFundingOther', 'Medications funded by (other)', 'text', G.meds, {
		optional: true
	});
	markIf(funding, p, 106, 681);
	put(funding, box(p, 178, 574, 675, 693));
	yesNo(
		'medsIndependent',
		'Fully independent with medication setup and administration',
		G.meds,
		p,
		511,
		547,
		657
	);
	yesNo(
		'medsAssistance',
		'Requesting help obtaining and/or administering medications',
		G.meds,
		p,
		511,
		547,
		636
	);
	note(
		'medsSupports',
		'Medication supports requested by the applicant',
		G.meds,
		box(p, 37, 574, 579, 609)
	);
	note(
		'medsSupportsBy',
		'Who will provide the requested medication supports',
		G.meds,
		box(p, 37, 574, 528, 558)
	);

	say(
		'alternatives',
		'Alternatives considered (supplies, DME, assistive technology) and where explained',
		G.need,
		box(p, 37, 574, 420, 450)
	);
	yesNo('serviceAnimal', 'Uses a service animal', G.need, p, 224, 260, 402, { optional: true });
	say('serviceAnimalType', 'Service animal type', G.need, box(p, 344, 574, 399, 414), 'text', {
		optional: true
	});
	yesNo('animalNeeds', 'Service animal has special needs', G.need, p, 224, 260, 381, {
		optional: true
	});
	say(
		'animalNeedsType',
		'Service animal special needs',
		G.need,
		box(p, 344, 574, 378, 393),
		'text',
		{ optional: true }
	);
	say(
		'animalCare',
		'Where the animal receives care/treatment',
		G.need,
		box(p, 260, 574, 357, 372),
		'text',
		{ optional: true }
	);
	say(
		'animalBoarding',
		'Where the animal is boarded if the participant is hospitalized',
		G.need,
		box(p, 290, 574, 336, 351),
		'text',
		{
			optional: true
		}
	);
	say(
		'needForWaiver',
		'Why waiver services are needed to prevent or end nursing home placement',
		G.need,
		box(p, 37, 574, 108, 255)
	);
}

// =============================================================================================
// Pages 12-14: 8. Requested waiver services (9 blocks, one per row of the services table)
// =============================================================================================
{
	const blocks: [
		page: number,
		header: number,
		boxes: [number, number][],
		x0: number,
		x1: number
	][] = [
		[
			11,
			624,
			[
				[576, 618],
				[513, 555],
				[453, 492]
			],
			37,
			574
		],
		[
			11,
			423,
			[
				[375, 417],
				[312, 354],
				[252, 291]
			],
			37,
			574
		],
		[
			11,
			222,
			[
				[174, 216],
				[111, 153],
				[51, 90]
			],
			38,
			575
		],
		...[12, 13].flatMap((page) => [
			[
				page,
				681,
				[
					[627, 675],
					[561, 609],
					[498, 543]
				],
				37,
				574
			] as [number, number, [number, number][], number, number],
			[
				page,
				459,
				[
					[405, 453],
					[339, 387],
					[276, 321]
				],
				37,
				574
			] as [number, number, [number, number][], number, number],
			[
				page,
				239,
				[
					[185, 233],
					[119, 167],
					[56, 101]
				],
				37,
				574
			] as [number, number, [number, number][], number, number]
		])
	];
	const parts = [
		['need', 'why this service is needed'],
		['goals', 'desired goals, including frequency/amount'],
		['activities', 'activities targeted for the next six months']
	] as const;
	blocks.forEach(([page, header, boxes, x0, x1], i) => {
		// No blank for the service name: print it after "Explain the need for this service:".
		put(cell('services', i, 'type'), line(page, 205, x1, header - 2.5, 9), {
			label: `Requested service ${i + 1}`
		});
		parts.forEach(([id, label], j) => {
			const [y0, y1] = boxes[j];
			note(
				`service${i + 1}.${id}`,
				`Service ${i + 1}: ${label}`,
				G.services,
				box(page, x0, x1, y0, y1)
			);
		});
	});
}

// =============================================================================================
// Page 15: 9. Medications, medical supplies and DME
// =============================================================================================
const MEDS = k('meds');
const SUPPLIES = k('supplies');
const STATE = k('statePlan');
const WAIVER = k('waiver');
const medsMonthly = (d: CaseData) => total(d, MEDS, 'monthlyCost', 8);
const suppliesMonthly = (d: CaseData) => total(d, SUPPLIES, 'monthlyCost', 4);
const medsAnnual = (d: CaseData) => {
	const m = add(medsMonthly(d), suppliesMonthly(d));
	return m === null ? null : m * 12;
};
const statePlanAnnual = (d: CaseData) => add(medsAnnual(d), total(d, STATE, 'cost', 8));
const waiverAnnual = (d: CaseData) => total(d, 'services', 'cost', 10);
const spenddownAnnual = (d: CaseData) =>
	isAnswered(d['participant.spenddown']) ? amount(d['participant.spenddown']) * 12 : null;
const allMedicaid = (d: CaseData) => {
	const sum = add(statePlanAnnual(d), waiverAnnual(d));
	return sum === null ? null : sum - (spenddownAnnual(d) ?? 0);
};
{
	const p = 14;
	ask('meds', 'Medications: route, pharmacy and monthly Medicaid cost', 'table', G.meds, {
		rows: 8,
		help: 'Rows line up with the current medications list.',
		columns: [
			{ id: 'route', label: 'Route (oral, injection, etc.)' },
			{ id: 'pharmacy', label: 'Pharmacy and phone' },
			{ id: 'monthlyCost', label: 'Projected Medicaid monthly cost', type: 'money' }
		]
	});
	for (let r = 0; r < 6; r++) {
		const y = 462 - 24 * r;
		put(cell('medications', r, 'name'), above(p, 33, 168, y, 2, 8));
		put(cell('medications', r, 'dose'), above(p, 177, 210, y, 3, 6.5));
		put(cell(MEDS, r, 'route'), above(p, 219, 282, y, 2, 8));
		put(cell('medications', r, 'purpose'), above(p, 291, 357, y, 2, 8));
		put(cell('medications', r, 'prescriber'), above(p, 366, 501, y, 2, 8));
		put(cell(MEDS, r, 'pharmacy'), above(p, 510, 690, y, 2, 8));
		put(cell(MEDS, r, 'monthlyCost'), above(p, 699, 759, y, 1, 9));
	}
	ask('supplies', 'Medical supplies and durable medical equipment', 'table', G.meds, {
		rows: 4,
		optional: true,
		columns: [
			{ id: 'item', label: 'Supply or equipment item' },
			{ id: 'prescriber', label: 'Prescribed by and phone' },
			{ id: 'supplier', label: 'Pharmacy/DME company and phone' },
			{ id: 'monthlyCost', label: 'Projected Medicaid monthly cost', type: 'money' }
		]
	});
	for (let r = 0; r < 4; r++) {
		const y = 228 - 24 * r;
		put(cell(SUPPLIES, r, 'item'), above(p, 33, 201, y, 2, 8));
		put(cell(SUPPLIES, r, 'prescriber'), above(p, 210, 405, y, 2, 8));
		put(cell(SUPPLIES, r, 'supplier'), above(p, 414, 690, y, 2, 8));
		put(cell(SUPPLIES, r, 'monthlyCost'), above(p, 699, 759, y, 1, 9));
	}
	put((d) => usd(medsMonthly(d)), line(p, 699, 759, 318), {
		label: 'A. Medications monthly total'
	});
	put((d) => usd(suppliesMonthly(d)), line(p, 699, 759, 132), {
		label: 'B. Supplies/DME monthly total'
	});
	put((d) => usd(medsAnnual(d)), line(p, 699, 759, 108), {
		label: 'Medications, supplies and DME annual total'
	});
}

// =============================================================================================
// Page 16: 10. Medicaid State Plan services and cost projection
// =============================================================================================
{
	const p = 15;
	ask(
		'statePlan',
		'Medicaid State Plan services: annual units, rate and annual cost',
		'table',
		G.costs,
		{
			rows: 8,
			help: 'Rows line up with the Medicaid State Plan services list.',
			columns: [
				{ id: 'units', label: 'Annual amount of units' },
				{ id: 'rate', label: 'Rate', type: 'money' },
				{ id: 'cost', label: 'Projected Medicaid annual cost', type: 'money' }
			]
		}
	);
	put((d) => usd(medsAnnual(d)), line(p, 665, 760, 438), {
		label: 'Medications, supplies and DME (annual)'
	});
	const SP = 'services.statePlan';
	for (let r = 0; r < 6; r++) {
		const y = 396 - 42 * r;
		put(
			(d) =>
				[
					str(d, cell(SP, r, 'type')),
					str(d, cell(SP, r, 'frequency')) && `(${str(d, cell(SP, r, 'frequency'))})`
				]
					.filter(Boolean)
					.join('\n'),
			above(p, 33, 168, y, 3, 8),
			{ label: `State Plan service ${r + 1}` }
		);
		put(cell(SP, r, 'provider'), above(p, 178, 517, y, 3, 8));
		put(cell(STATE, r, 'units'), above(p, 526, 591, y, 1, 9));
		put(cell(STATE, r, 'rate'), above(p, 604, 653, y, 1, 9));
		put(cell(STATE, r, 'cost'), above(p, 665, 760, y, 1, 9));
	}
	put((d) => usd(statePlanAnnual(d)), line(p, 664, 759, 144), {
		label: 'Total Medicaid State Plan services (annual)'
	});
}

// =============================================================================================
// Page 17: 11. Waiver services and cost projection
// =============================================================================================
{
	const p = 16;
	ask('waiver', 'Waiver services: effective date, annual units and rate', 'table', G.costs, {
		rows: 10,
		help: 'Rows line up with the waiver services list. Effective date is usually "Upon NOD authorization".',
		columns: [
			{ id: 'effective', label: 'Effective date' },
			{ id: 'units', label: 'Annual amount of units' },
			{ id: 'rate', label: 'Rate', type: 'money' }
		]
	});
	// The first printed row carries a stray "Medications, Medical Supplies and DME from page 6" label,
	// so waiver services start on the second row.
	for (let r = 0; r < 6; r++) {
		const y = 390 - 48 * r;
		put(
			(d) =>
				[
					str(d, cell('services', r, 'type')),
					str(d, cell('services', r, 'units')) && `(${str(d, cell('services', r, 'units'))})`
				]
					.filter(Boolean)
					.join('\n'),
			above(p, 33, 168, y, 4, 8),
			{ label: `Waiver service ${r + 1}` }
		);
		put(cell('services', r, 'provider'), above(p, 178, 424, y, 4, 8));
		put(cell(WAIVER, r, 'effective'), above(p, 436, 514, y, 2, 8));
		put(cell(WAIVER, r, 'units'), above(p, 526, 591, y, 1, 9));
		put(cell(WAIVER, r, 'rate'), above(p, 604, 653, y, 1, 9));
		put(cell('services', r, 'cost'), above(p, 665, 760, y, 1, 9));
	}
	put((d) => usd(waiverAnnual(d)), line(p, 664, 759, 108), {
		label: 'Total waiver services (annual)'
	});
}

// =============================================================================================
// Page 18: 12. Projected total annual costs (all computed)
// =============================================================================================
{
	const p = 17;
	put((d) => usd(statePlanAnnual(d)), line(p, 664, 759, 486), {
		label: '1. State Plan services (annual)'
	});
	put((d) => usd(waiverAnnual(d)), line(p, 661, 756, 450), {
		label: '2. Waiver services (annual)'
	});
	put((d) => usd(add(statePlanAnnual(d), waiverAnnual(d))), line(p, 661, 756, 414), {
		label: 'Total of #1 and #2'
	});
	put((d) => usd(spenddownAnnual(d)), line(p, 661, 756, 378), { label: '3. Spend-down (annual)' });
	put((d) => usd(allMedicaid(d)), line(p, 661, 756, 342), {
		label: '4. All Medicaid services (annual)'
	});
	put(
		(d) => {
			const all = allMedicaid(d);
			return usd(all === null ? null : all / 365);
		},
		line(p, 661, 756, 306),
		{ label: '5. Daily rate' }
	);
}

// =============================================================================================
// Page 19: 13. Projected weekly schedule
// =============================================================================================
{
	const p = 18;
	put('participant.name', line(p, 268, 568, 525));
	const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	const slots = [
		'7 AM',
		'8',
		'9',
		'10',
		'11',
		'Noon',
		'1 PM',
		'2',
		'3',
		'4',
		'5',
		'6',
		'7',
		'8',
		'9',
		'10',
		'11',
		'Midnight',
		'1-7 AM'
	];
	const schedule = ask(
		'schedule',
		'Weekly schedule of all services and supports',
		'table',
		G.schedule,
		{
			rows: slots.length,
			optional: true,
			help: `One row per hour: ${slots.join(', ')}. Include informal supports, waiver and non-waiver services; mark shared services with * and the staff-to-applicant ratio.`,
			columns: days.map((day) => ({ id: day.slice(0, 3).toLowerCase(), label: day }))
		}
	);
	slots.forEach((_, r) => {
		const top = 495 - 24 * r;
		days.forEach((day, c) =>
			put(
				cell(schedule, r, day.slice(0, 3).toLowerCase()),
				box(p, 109 + 93 * c, 202 + 93 * c, top - 24, top, 7)
			)
		);
	});
}

// =============================================================================================
// Page 20: 14. Signatures (names only; signatures and dates are by hand)
// =============================================================================================
{
	const p = 19;
	put('participant.name', line(p, 117, 576, 582));
	put('guardian.name', line(p, 117, 576, 522));
	put('authRep.name', line(p, 117, 576, 453));
	put('serviceCoordinator.name', line(p, 36, 246, 321));
	put('scSupervisor.name', line(p, 36, 246, 288));
	put(
		(d) => [str(d, 'scAgency.name'), str(d, 'scAgency.address')].filter(Boolean).join(', '),
		line(p, 36, 462, 255),
		{
			label: 'Service coordination agency name and address',
			needs: ['scAgency.name', 'scAgency.address']
		}
	);
	put('scAgency.phone', line(p, 477, 576, 255));
	put('rrds.name', line(p, 36, 246, 72));
}

export const doh5726: FormDef = {
	id: ID,
	code: 'DOH-5726',
	title: 'Initial Service Plan',
	file: 'doh-5726.pdf',
	revision: '6/21',
	sourceUrl: 'https://www.health.ny.gov/forms/doh-5726.pdf',
	stage: 'plan',
	roles: ['sc'],
	signers: [
		'Applicant',
		'Legal guardian (if any)',
		'Other / representative (if any)',
		'Service Coordinator',
		'Service Coordinator Supervisor',
		'RRDS (approval)'
	],
	when: 'Written by the Service Coordinator with the applicant and sent to the RRDC as the core of the application packet within 60 days of the approved Service Coordinator selection. A packet older than 120 days is denied.',
	questions,
	fields
};
