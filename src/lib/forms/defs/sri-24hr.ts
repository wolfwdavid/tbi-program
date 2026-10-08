import type { CaseData, FieldDef, FormDef } from '../types.ts';
import { cell } from '../values.ts';

// The 2021 form is a flattened Word form: every blank still shows its grey
// "Click or tap here to enter text." prompt. Answers are placed beside or below the
// prompt wherever the cell has room, and over it only where it fills the cell.

const SRI = 'Serious incident (24-hour report)';
const NOTE = 'Notifications';

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** "Jordan A. Rivera" → ["Jordan A.", "Rivera"]. */
function splitName(full: string): [string, string] {
	const parts = full.trim().split(/\s+/);
	if (parts.length < 2) return [full.trim(), ''];
	return [parts.slice(0, -1).join(' '), parts[parts.length - 1]];
}

/** "418 Maple Ave, Apt 2B, Albany, NY 12208" → street, line 2, city, ZIP. Unparsed text stays on line 1. */
function splitAddress(full: string): { line1: string; line2: string; city: string; zip: string } {
	const parts = full
		.split(',')
		.map((p) => p.trim())
		.filter(Boolean);
	const m = /^(?:[A-Z]{2}\s+)?(\d{5}(?:-\d{4})?)$/.exec(parts[parts.length - 1] ?? '');
	if (!m || parts.length < 3) return { line1: full.trim(), line2: '', city: '', zip: '' };
	return {
		line1: parts[0],
		line2: parts.slice(1, -2).join(', '),
		city: parts[parts.length - 2],
		zip: m[1]
	};
}

const address = (d: CaseData) => splitAddress(str(d['participant.address']));

const ABUSE = [
	'Physical abuse',
	'Sexual abuse',
	'Psychological abuse',
	'Neglect',
	'Seclusion',
	'Violation of civil rights',
	'Mistreatment',
	'Exploitation (financial or material)',
	'Unauthorized or inappropriate use of restraint',
	'Use of aversive conditioning'
];

// Rows of the "NOTIFICATIONS" grid on page 2: printed label, box glyph and the cell rows.
const NOTIFY: { who: string; box: number; top: number; bottom: number }[] = [
	{ who: 'Guardian', box: 295.3, top: 305.5, bottom: 270.3 },
	{ who: 'APS', box: 260.1, top: 270.3, bottom: 235.8 },
	{ who: 'Police', box: 224.8, top: 235.8, bottom: 200.6 },
	{ who: 'Other', box: 190.4, top: 200.6, bottom: 165.4 }
];
const NOTIFY_ROWS = 6;

/** Notification table rows for one printed row, joined. */
function notified(d: CaseData, who: string, col: string): string {
	const out: string[] = [];
	for (let i = 0; i < NOTIFY_ROWS; i++) {
		if (d[cell('sri-24hr.notifications', i, 'who')] !== who) continue;
		const v = str(d[cell('sri-24hr.notifications', i, col)]);
		if (v) out.push(v);
	}
	return out.join('; ');
}

// Witness grid on page 2: second text line of each row (the first holds the prompt).
const WITNESS_Y = [574.5, 550.5, 527, 449.5, 425.5];
const WITNESS_PHONE_Y = [573.4, 550.1, 526.1, 448.4, 425.2];

export const sri24hr: FormDef = {
	id: 'sri-24hr',
	code: 'SRI 24-Hour Provider Report',
	title: 'Serious Reportable Incident 24-Hour Provider Report',
	file: 'sri-24hr-provider.pdf',
	revision: '7/21',
	sourceUrl:
		'https://www.health.ny.gov/health_care/medicaid/redesign/mrt90/mltc_policy/section_xiv/docs/sri_24hr_provider_rpt.pdf',
	stage: 'incident',
	roles: ['provider'],
	signers: ['Person completing the report', 'Their supervisor'],
	when: 'The provider who discovers a serious reportable incident sends this to the RRDC by encrypted email within 24 hours of discovery, with a copy to the service coordinator.',
	questions: [
		{
			key: 'sri-24hr.abuseCategory',
			label: 'If an allegation of abuse: which category',
			type: 'select',
			group: SRI,
			options: ABUSE,
			optional: true
		},
		{
			key: 'sri-24hr.incidentAddress',
			label: 'Address where it happened (if not the participant’s home)',
			type: 'text',
			group: SRI,
			optional: true
		},
		{
			key: 'sri-24hr.injury',
			label:
				'If there was an injury: type of injury, response to it and immediate corrective action',
			type: 'longtext',
			group: SRI,
			optional: true
		},
		{
			key: 'sri-24hr.protectiveMeasures',
			label: 'Immediate protective measures put in place',
			type: 'longtext',
			group: SRI
		},
		{
			key: 'sri-24hr.participantComments',
			label: 'Information or comments from the participant, guardian or informal supports',
			type: 'longtext',
			group: SRI,
			optional: true
		},
		{
			key: 'sri-24hr.witnesses',
			label: 'People with direct knowledge of the incident',
			type: 'table',
			group: SRI,
			rows: 5,
			optional: true,
			help: 'Put the person who discovered the incident first and add "(discoverer)" after the name.',
			columns: [
				{ id: 'name', label: 'Name' },
				{ id: 'relationship', label: 'Agency / relationship to participant' },
				{ id: 'phone', label: 'Telephone', type: 'phone' }
			]
		},
		{
			key: 'sri-24hr.notifications',
			label: 'Others notified (guardian, Adult Protective Services, police, other)',
			type: 'table',
			group: NOTE,
			rows: NOTIFY_ROWS,
			optional: true,
			columns: [
				{ id: 'who', label: 'Notified', type: 'select', options: NOTIFY.map((n) => n.who) },
				{ id: 'person', label: 'Person notified, title and agency' },
				{ id: 'phone', label: 'Phone', type: 'phone' },
				{ id: 'byWhom', label: 'Notified by whom' }
			]
		},
		{
			key: 'sri-24hr.rrdcNotifiedDate',
			label: 'Date the RRDC was notified',
			type: 'date',
			group: NOTE
		},
		{ key: 'sri-24hr.rrdcPhone', label: 'RRDC phone', type: 'phone', group: NOTE, optional: true },
		{
			key: 'sri-24hr.scNotifiedDate',
			label: 'Date the service coordinator was notified',
			type: 'date',
			group: NOTE
		},
		{
			key: 'sri-24hr.supervisorPhone',
			label: 'Supervisor’s telephone (if different from the provider’s)',
			type: 'phone',
			group: SRI,
			optional: true
		}
	],
	fields: [
		// Page 1
		{ src: () => true, to: { page: 0, x: 142.5, y: 623.1, size: 8, mark: true } },
		{
			src: (d) => splitName(str(d['participant.name']))[0],
			needs: ['participant.name'],
			label: 'Participant first name',
			to: { page: 0, x: 37.6, y: 561, maxWidth: 156 }
		},
		{
			src: (d) => splitName(str(d['participant.name']))[1],
			label: 'Participant last name',
			to: { page: 0, x: 204.3, y: 561, maxWidth: 140 }
		},
		{ src: 'participant.cin', to: { page: 0, x: 354.9, y: 559, size: 8, maxWidth: 88 } },
		{ src: 'rrdc.region', to: { page: 0, x: 452.6, y: 561, maxWidth: 88 } },
		{
			src: (d) => address(d).line1,
			needs: ['participant.address'],
			label: 'Participant address',
			to: { page: 0, x: 176, y: 516.5, maxWidth: 364 }
		},
		{
			src: (d) => address(d).line2,
			label: 'Participant address 2',
			to: { page: 0, x: 176, y: 483, maxWidth: 364 }
		},
		{
			src: (d) => address(d).city,
			label: 'City',
			to: { page: 0, x: 176, y: 445.2, maxWidth: 168 }
		},
		{ src: (d) => address(d).zip, label: 'ZIP', to: { page: 0, x: 369.3, y: 438, maxWidth: 170 } },
		{ src: 'incident.discoveredDate', to: { page: 0, x: 165, y: 394.8, maxWidth: 180 } },
		{ src: 'incident.discoveredTime', to: { page: 0, x: 492, y: 396.4, maxWidth: 50 } },
		{ src: 'incident.occurredDate', to: { page: 0, x: 165, y: 363.6, maxWidth: 180 } },
		{ src: 'incident.occurredTime', to: { page: 0, x: 492, y: 364.4, maxWidth: 50 } },
		{ src: 'incident.location', to: { page: 0, x: 176, y: 296.3, maxWidth: 364 } },
		{ src: 'sri-24hr.incidentAddress', to: { page: 0, x: 176, y: 271.5, maxWidth: 364 } },
		// The narrative boxes have one line each (Word grew them as you typed); the rest continues.
		{ src: 'incident.description', to: { page: 0, x: 211, y: 164.2, maxWidth: 328 } },
		{ src: 'sri-24hr.injury', to: { page: 0, x: 211, y: 122.5, maxWidth: 328 } },
		{ src: 'incident.category', to: { page: 0, x: 212, y: 80.1, maxWidth: 328 } },

		// Page 2
		{ src: 'sri-24hr.abuseCategory', to: { page: 1, x: 204, y: 684.7, maxWidth: 336 } },
		...WITNESS_Y.flatMap((y, i): FieldDef[] => [
			{
				src: cell('sri-24hr.witnesses', i, 'name'),
				label: `Witness ${i + 1}: name`,
				to: { page: 1, x: 35, y, size: 8, maxWidth: 182 }
			},
			{
				src: cell('sri-24hr.witnesses', i, 'relationship'),
				label: `Witness ${i + 1}: agency / relationship`,
				to: { page: 1, x: 225, y, size: 8, maxWidth: 215 }
			},
			{
				src: cell('sri-24hr.witnesses', i, 'phone'),
				label: `Witness ${i + 1}: telephone`,
				to: { page: 1, x: 498, y: WITNESS_PHONE_Y[i], size: 6.5, maxWidth: 46 }
			}
		]),
		{ src: 'incident.actionsTaken', to: { page: 1, x: 211, y: 400.4, maxWidth: 328 } },
		{ src: 'sri-24hr.protectiveMeasures', to: { page: 1, x: 211, y: 375.6, maxWidth: 328 } },
		{ src: 'sri-24hr.participantComments', to: { page: 1, x: 211, y: 337.9, maxWidth: 328 } },
		...NOTIFY.flatMap(({ who, box, top, bottom }): FieldDef[] => [
			{
				src: (d) => notified(d, who, 'person') !== '' || notified(d, who, 'byWhom') !== '',
				to: { page: 1, x: 58, y: box, size: 8, mark: true }
			},
			{
				src: (d) => notified(d, who, 'person'),
				label: `${who} notified`,
				to: { page: 1, x: 161.8, y: top - 21.5, size: 8, lines: 2, lineHeight: 9, maxWidth: 195 }
			},
			{
				src: (d) => notified(d, who, 'phone'),
				label: `${who} phone`,
				to: { page: 1, x: 390, y: bottom + 2.8, size: 7, maxWidth: 49 }
			},
			{
				src: (d) => notified(d, who, 'byWhom'),
				label: `${who} notified by`,
				to: { page: 1, x: 446, y: bottom + 3, size: 8, maxWidth: 96 }
			}
		]),

		// Page 3: reporter's notification to waiver entities (table continues from page 2)
		{
			src: (d) => !!d['sri-24hr.rrdcNotifiedDate'],
			to: { page: 2, x: 57.7, y: 687.4, size: 8, mark: true }
		},
		// The person cells are filled by their prompts; the name goes after the prompt's last word.
		{
			src: 'rrds.name',
			label: 'RRDC person notified',
			to: { page: 2, x: 200, y: 664.7, size: 7, maxWidth: 54 }
		},
		{ src: 'sri-24hr.rrdcPhone', to: { page: 2, x: 259, y: 665, size: 8, maxWidth: 92 } },
		{ src: 'sri-24hr.rrdcNotifiedDate', to: { page: 2, x: 357, y: 665, size: 8, maxWidth: 68 } },
		{ src: 'incident.reporter.name', to: { page: 2, x: 430, y: 665, size: 8, maxWidth: 112 } },
		{
			src: (d) => !!d['sri-24hr.scNotifiedDate'],
			to: { page: 2, x: 57.7, y: 653, size: 8, mark: true }
		},
		{
			src: 'serviceCoordinator.name',
			to: { page: 2, x: 200, y: 629.4, size: 7, maxWidth: 54 }
		},
		{ src: 'serviceCoordinator.phone', to: { page: 2, x: 259, y: 628, size: 8, maxWidth: 92 } },
		{ src: 'sri-24hr.scNotifiedDate', to: { page: 2, x: 357, y: 628, size: 8, maxWidth: 68 } },
		{
			src: 'incident.reporter.name',
			label: 'Service coordinator notified by',
			to: { page: 2, x: 430, y: 628, size: 8, maxWidth: 112 }
		},
		{ src: 'scAgency.name', to: { page: 2, x: 314, y: 611, maxWidth: 226 } },
		{ src: 'provider.name', to: { page: 2, x: 37.6, y: 466, maxWidth: 314 } },
		{ src: 'incident.reporter.phone', to: { page: 2, x: 362.1, y: 451, maxWidth: 178 } },
		{
			src: 'provider.name',
			label: 'Supervisor provider agency',
			to: { page: 2, x: 175, y: 349.9, maxWidth: 176 }
		},
		{
			src: (d) => str(d['sri-24hr.supervisorPhone']) || str(d['provider.phone']),
			needs: ['provider.phone'],
			label: 'Supervisor telephone',
			to: { page: 2, x: 362.1, y: 335, maxWidth: 178 }
		}
		// Person completing / supervisor names are electronic signatures; they and their dates are
		// left to sign. "Form Sent to DOH Date" is filled by the RRDC.
	]
};
