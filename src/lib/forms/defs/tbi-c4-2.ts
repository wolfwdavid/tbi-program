import type { FieldDef, FormDef } from '../types.ts';

const ISR = 'Individual Service Report';

// The service this report covers, using the shared service names; printed boxes are matched below.
const SERVICES = [
	'Community Integration Counseling (CIC)',
	'Home and Community Support Services (HCSS)',
	'Independent Living Skills Training (ILST)',
	'Positive Behavioral Interventions and Supports (PBIS)',
	'Respite',
	'Substance Abuse Program',
	'Structured Day Program'
];

// Printed check boxes: X position and size of the mark (boxes are 7.2pt squares).
const BOXES: [string, number, number, number?][] = [
	[SERVICES[0], 208.8, 619.6],
	[SERVICES[1], 252.0, 619.6],
	[SERVICES[2], 314.4, 618.6],
	[SERVICES[3], 361.1, 618.6],
	[SERVICES[4], 417.2, 618.6],
	[SERVICES[5], 208.8, 605.2],
	[SERVICES[6], 329.1, 603.9, 5] // a small text glyph, not a drawn box
];

// The five narrative answers each get the single blank line under their question;
// anything longer continues on an attached page.
const narrative = (key: string, y: number): FieldDef => ({
	src: `tbi-c4-2.${key}`,
	to: { page: 0, x: 108, y, size: 8, maxWidth: 414 }
});

export const tbiC42: FormDef = {
	id: 'tbi-c4-2',
	code: 'TBI C-4.2',
	title: 'Individual Service Report (ISR)',
	file: 'tbi-c4-2-2009.pdf',
	revision: '7/09',
	sourceUrl: 'https://www.health.ny.gov/health_care/medicaid/reference/tbi/docs/c4_2.pdf',
	legacy2009: true,
	stage: 'ongoing',
	roles: ['provider'],
	signers: ['Participant', 'Provider', 'Service Coordinator'],
	when: 'Each waiver service provider completes one per service and sends it to the service coordinator before the six-month team meeting / revised service plan.',
	questions: [
		{
			key: 'tbi-c4-2.service',
			label: 'Service this report covers',
			type: 'select',
			group: ISR,
			options: SERVICES
		},
		{
			key: 'tbi-c4-2.staffName',
			label: 'Staff member providing the service',
			type: 'text',
			group: ISR,
			help: 'Printed on the "Waiver Provider" line.'
		},
		{
			key: 'tbi-c4-2.startDate',
			label: 'Date the waiver service was first provided',
			type: 'date',
			group: ISR
		},
		{
			key: 'tbi-c4-2.currentFrequency',
			label: 'Current frequency and hours of service',
			type: 'text',
			group: ISR,
			help: 'e.g. 6 hours per week, 3 visits.'
		},
		{
			key: 'tbi-c4-2.proposedFrequency',
			label: 'Proposed frequency and hours for the next period',
			type: 'text',
			group: ISR
		},
		{
			key: 'tbi-c4-2.goals',
			label: '1. Goals from the Detailed Plan for this service (past six months)',
			type: 'longtext',
			group: ISR
		},
		{
			key: 'tbi-c4-2.progress',
			label: '2. Progress on each goal, with measurable outcomes and functional skill gains',
			type: 'longtext',
			group: ISR
		},
		{
			key: 'tbi-c4-2.strategies',
			label: '3. Compensatory strategies and interventions used',
			type: 'longtext',
			group: ISR
		},
		{
			key: 'tbi-c4-2.barriers',
			label: '4. Barriers to the goals and actions taken',
			type: 'longtext',
			group: ISR
		},
		{
			key: 'tbi-c4-2.goalChanges',
			label: '5. Goal changes for the next six months',
			type: 'longtext',
			group: ISR
		}
	],
	fields: [
		...BOXES.map(([service, x, y, size = 7]): FieldDef => ({
			src: (d) => d['tbi-c4-2.service'] === service,
			needs: ['tbi-c4-2.service'],
			to: { page: 0, x: x + 1.2, y: y + 1.1, size, mark: true }
		})),
		{ src: 'participant.name', to: { page: 0, x: 156, y: 576.5, maxWidth: 252 } },
		// Unlabeled second blank on the Participant line: the CIN.
		{ src: 'participant.cin', to: { page: 0, x: 418, y: 576.5, maxWidth: 102 } },
		{ src: 'tbi-c4-2.staffName', to: { page: 0, x: 184, y: 549, maxWidth: 336 } },
		{ src: 'provider.name', to: { page: 0, x: 184, y: 521, maxWidth: 210 } },
		{ src: 'provider.phone', to: { page: 0, x: 436, y: 521, maxWidth: 85 } },
		{ src: 'tbi-c4-2.startDate', to: { page: 0, x: 302, y: 493.5, maxWidth: 146 } },
		{ src: 'tbi-c4-2.currentFrequency', to: { page: 0, x: 310, y: 465.5, maxWidth: 211 } },
		{ src: 'tbi-c4-2.proposedFrequency', to: { page: 0, x: 416, y: 438, size: 8, maxWidth: 105 } },
		narrative('goals', 350),
		narrative('progress', 295),
		narrative('strategies', 253.5),
		narrative('barriers', 212),
		narrative('goalChanges', 170.5)
		// Participant, provider and service coordinator signatures and dates: signed by hand.
	]
};
