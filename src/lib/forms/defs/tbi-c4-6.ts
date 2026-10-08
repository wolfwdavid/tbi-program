import type { CaseData, FieldDef, FormDef } from '../types.ts';
import { cell, rowCount } from '../values.ts';

const TM = 'Team meeting';
const ISR = 'ISRs received';

// Ruled lines are 20.7pt apart; text sits 2pt above each rule.
const RULE = 20.7;
const ruled = (
	key: string,
	page: number,
	x: number,
	y: number,
	lines: number,
	maxWidth: number
): FieldDef => ({
	src: `tbi-c4-6.${key}`,
	to: { page, x, y, lines, lineHeight: RULE, maxWidth, size: 10 }
});

// Page 3 is landscape (/Rotate 90). A point that reads at (X, Y) on the turned page is
// drawn at x = 612 - Y, y = X in the page's own space, with the text rotated 90°.
const land = (X: number, Y: number) => ({ page: 2, x: 612 - Y, y: X, rotate: 90 });

// Attendance grid rows on page 3, top to bottom, with the shared service name each row stands for.
const ROWS: { label: string; abbr: string; service?: string }[] = [
	{ label: 'Service Coordinator', abbr: 'sc' },
	{ label: 'Assistive Technology', abbr: 'at', service: 'Assistive Technology' },
	{
		label: 'Community Integration Counseling',
		abbr: 'cic',
		service: 'Community Integration Counseling (CIC)'
	},
	{
		label: 'Community Transitional Services',
		abbr: 'cts',
		service: 'Community Transitional Services (CTS)'
	},
	{
		label: 'Environmental Modifications',
		abbr: 'emods',
		service: 'Environmental Modifications (E-Mods)'
	},
	{
		label: 'Home and Community Support Services',
		abbr: 'hcss',
		service: 'Home and Community Support Services (HCSS)'
	},
	{
		label: 'Independent Living Skills Training',
		abbr: 'ilst',
		service: 'Independent Living Skills Training (ILST)'
	},
	{
		label: 'Positive Behavioral Interventions and Supports',
		abbr: 'pbis',
		service: 'Positive Behavioral Interventions and Supports (PBIS)'
	},
	{ label: 'Respite', abbr: 'respite', service: 'Respite' },
	{ label: 'Structured Day Program', abbr: 'sdp', service: 'Structured Day Program' }
];
// Bottom rule of each grid row (landscape Y).
const ROW_BOTTOM = [428.7, 411.0, 393.2, 375.5, 357.7, 340.0, 322.3, 304.5, 286.7, 269.0];

/** Provider agencies in the service plan for one service, from the shared services table. */
function agenciesFor(d: CaseData, service: string): string {
	const names = new Set<string>();
	for (let i = 0; i < rowCount(d, 'services'); i++) {
		const provider = d[cell('services', i, 'provider')];
		if (
			d[cell('services', i, 'type')] === service &&
			typeof provider === 'string' &&
			provider.trim()
		) {
			names.add(provider.trim());
		}
	}
	return [...names].join('; ');
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const datePart = (d: CaseData, i: number) => {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(d['tbi-c4-6.meetingDate']));
	return m ? [m[2], m[3], m[1]][i] : '';
};

export const tbiC46: FormDef = {
	id: 'tbi-c4-6',
	code: 'TBI C-4.6',
	title: 'Team Meeting Summary',
	file: 'tbi-c4-6-2009.pdf',
	revision: '7/09',
	sourceUrl: 'https://www.health.ny.gov/health_care/medicaid/reference/tbi/docs/c4_6.pdf',
	legacy2009: true,
	stage: 'ongoing',
	roles: ['sc'],
	signers: ['Each attendee', 'Participant (and/or legal guardian)', 'Service coordinator / agency'],
	when: 'The service coordinator holds a team meeting within 30 days of service plan approval and every six months, and sends this summary to the RRDC within 14 days of the meeting.',
	questions: [
		{ key: 'tbi-c4-6.meetingDate', label: 'Date of the team meeting', type: 'date', group: TM },
		{ key: 'tbi-c4-6.meetingTime', label: 'Time of the team meeting', type: 'time', group: TM },
		{ key: 'tbi-c4-6.location', label: 'Meeting location', type: 'text', group: TM },
		{
			key: 'tbi-c4-6.participantComments',
			label: "Participant's comments",
			type: 'longtext',
			group: TM
		},
		{
			key: 'tbi-c4-6.recommendations',
			label: 'Recommendations for changes in the service plan',
			type: 'longtext',
			group: TM
		},
		{ key: 'tbi-c4-6.issuesAddressed', label: 'Issues addressed', type: 'longtext', group: TM },
		{
			key: 'tbi-c4-6.outstandingIssues',
			label: 'Outstanding issues / health and welfare concerns',
			type: 'longtext',
			group: TM
		},
		{ key: 'tbi-c4-6.nextSteps', label: 'Next steps', type: 'longtext', group: TM },
		{
			key: 'tbi-c4-6.nextMeeting',
			label: 'Anticipated time frame for the next team meeting',
			type: 'text',
			group: TM
		},
		...ROWS.filter((r) => r.service).map((r) => ({
			key: `tbi-c4-6.isr.${r.abbr}`,
			label: `${r.label}: ISR submitted?`,
			type: 'select' as const,
			group: ISR,
			options: ['Y', 'N', 'N/A'],
			optional: true,
			help: 'Leave blank if the service is not in the plan.'
		}))
	],
	fields: [
		// Page 1
		{ src: 'participant.name', to: { page: 0, x: 203, y: 635, maxWidth: 318 } },
		{
			src: (d) => datePart(d, 0),
			needs: ['tbi-c4-6.meetingDate'],
			label: 'Date of the team meeting',
			to: { page: 0, x: 215.5, y: 607 }
		},
		{ src: (d) => datePart(d, 1), to: { page: 0, x: 239, y: 607 } },
		{ src: (d) => datePart(d, 2), to: { page: 0, x: 258.5, y: 607, size: 9 } },
		// "10:30 AM" fits in the time blank, just left of the printed "am/pm".
		{ src: 'tbi-c4-6.meetingTime', to: { page: 0, x: 296, y: 607, size: 8, maxWidth: 35 } },
		{ src: 'tbi-c4-6.location', to: { page: 0, x: 145, y: 580, maxWidth: 376 } },
		{
			src: 'serviceCoordinator.name',
			label: 'Facilitator',
			to: { page: 0, x: 152, y: 552, maxWidth: 369 }
		},
		ruled('participantComments', 0, 92, 478.2, 5, 428),
		ruled('recommendations', 0, 92, 340.2, 5, 428),
		ruled('issuesAddressed', 0, 92, 202.2, 7, 428),

		// Page 2
		{ src: 'participant.name', to: { page: 1, x: 203, y: 671.5, maxWidth: 210 } },
		{ src: 'tbi-c4-6.meetingDate', to: { page: 1, x: 461, y: 671.5, maxWidth: 60 } },
		ruled('outstandingIssues', 1, 92, 609.5, 7, 428),
		ruled('nextSteps', 1, 92, 430.1, 6, 428),
		{ src: 'tbi-c4-6.nextMeeting', to: { page: 1, x: 355, y: 292, maxWidth: 166 } },

		// Page 3 (landscape): attendance
		{ src: 'participant.name', to: { ...land(166, 514.5), maxWidth: 264 } },
		{ src: 'tbi-c4-6.meetingDate', to: { ...land(572, 514.5), maxWidth: 182 } },
		...ROWS.flatMap((r, i): FieldDef[] => {
			const Y = ROW_BOTTOM[i] + 6;
			const agency: FieldDef = r.service
				? {
						src: (d) => agenciesFor(d, r.service!),
						needs: ['services'],
						label: `${r.label}: agency`,
						to: { ...land(489, Y), size: 8, maxWidth: 192 }
					}
				: { src: 'scAgency.name', to: { ...land(489, Y), size: 8, maxWidth: 192 } };
			if (!r.service) return [agency];
			return [
				agency,
				{ src: `tbi-c4-6.isr.${r.abbr}`, to: { ...land(716, Y), size: 8, maxWidth: 46 } }
			];
		})
		// Attendee signatures, participant/guardian and service coordinator signatures and dates:
		// signed by hand at the meeting.
	]
};
