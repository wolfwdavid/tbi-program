import type { CaseData, FormDef } from '../types.ts';

// Flattened 2021 Word form: blanks still show their grey "Click or tap here..." prompt, so
// answers go beside or below the prompt where the cell has room.

const FU = 'Incident follow-up';

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** "Jordan A. Rivera" → ["Jordan A.", "Rivera"]. */
function splitName(full: string): [string, string] {
	const parts = full.trim().split(/\s+/);
	if (parts.length < 2) return [full.trim(), ''];
	return [parts.slice(0, -1).join(' '), parts[parts.length - 1]];
}

/** Joins labelled parts that have an answer: "Findings: ...  Corrective actions: ...". */
const parts = (d: CaseData, items: [string, string][]) =>
	items
		.map(([label, key]) => [label, str(d[key])])
		.filter(([, v]) => v)
		.map(([label, v]) => (label ? `${label}: ${v}` : v))
		.join('\n');

export const sriFollowUp: FormDef = {
	id: 'sri-follow-up',
	code: 'SRI Provider Follow-up Report',
	title: 'Serious Reportable Incident Provider Follow-up Report',
	file: 'sri-follow-up.pdf',
	revision: '7/21',
	sourceUrl:
		'https://www.health.ny.gov/health_care/medicaid/redesign/mrt90/mltc_policy/section_xiv/docs/sri_prov_follow-up_rpt.pdf',
	stage: 'incident',
	roles: ['provider'],
	signers: ['Agency investigator', 'Responsible provider representative'],
	when: 'The investigating provider sends follow-up reports to the RRDC and service coordinator at 7 days, 30 days, then monthly until the incident is closed (no more than 90 days open without the review committee’s approval).',
	questions: [
		{
			key: 'sri-follow-up.reportType',
			label: 'Follow-up report type',
			type: 'select',
			group: FU,
			options: ['7-day', '30-day', 'Monthly']
		},
		{
			key: 'sri-follow-up.reportNumber',
			label: 'Follow-up report number',
			type: 'number',
			group: FU,
			optional: true,
			help: 'e.g. 3 for the third follow-up report on this incident.'
		},
		{ key: 'sri-follow-up.date', label: 'Date this report was completed', type: 'date', group: FU },
		{
			key: 'sri-follow-up.sircReviewDate',
			label: 'Date the Serious Incident Review Committee reviewed the last report',
			type: 'date',
			group: FU,
			optional: true
		},
		{
			key: 'sri-follow-up.sircRecommendations',
			label: 'Recommendations made by the Serious Incident Review Committee',
			type: 'longtext',
			group: FU,
			optional: true
		},
		{
			key: 'sri-follow-up.investigationActions',
			label:
				'Since the last report: actions taken to investigate (interviews, record review, consultations)',
			type: 'longtext',
			group: FU,
			help: 'Attach all supporting documentation.'
		},
		{
			key: 'sri-follow-up.findings',
			label: 'Findings so far',
			type: 'longtext',
			group: FU,
			optional: true
		},
		{
			key: 'sri-follow-up.status',
			label: 'Investigation status',
			type: 'select',
			group: FU,
			options: ['In progress', 'Complete']
		},
		{
			key: 'sri-follow-up.remainingSteps',
			label: 'Further activities needed to complete the investigation',
			type: 'longtext',
			group: FU,
			optional: true
		},
		{
			key: 'sri-follow-up.correctiveActions',
			label: 'Corrective and preventive actions taken',
			type: 'longtext',
			group: FU,
			optional: true
		},
		{
			key: 'sri-follow-up.recommendation',
			label: 'Recommend the incident remain open or be closed',
			type: 'select',
			group: FU,
			options: ['Remain open', 'Close']
		},
		{ key: 'sri-follow-up.reason', label: 'Why', type: 'longtext', group: FU },
		{
			key: 'sri-follow-up.sentToRrdc',
			label: 'Date this report was sent to the RRDC',
			type: 'date',
			group: FU
		},
		{
			key: 'sri-follow-up.sentToSc',
			label: 'Date this report was sent to the service coordinator',
			type: 'date',
			group: FU
		}
	],
	fields: [
		{ src: () => true, to: { page: 0, x: 193.4, y: 638.9, size: 8, mark: true } },
		{
			src: (d) => splitName(str(d['participant.name']))[0],
			needs: ['participant.name'],
			label: 'Participant first name',
			to: { page: 0, x: 46.5, y: 578, maxWidth: 126 }
		},
		{
			src: (d) => splitName(str(d['participant.name']))[1],
			label: 'Participant last name',
			to: { page: 0, x: 181.8, y: 578, maxWidth: 166 }
		},
		{ src: 'participant.cin', to: { page: 0, x: 383, y: 578.2, size: 8, maxWidth: 48 } },
		{ src: 'incident.number', to: { page: 0, x: 439, y: 578, maxWidth: 144 } },
		{
			src: (d) => {
				const type = str(d['sri-follow-up.reportType']);
				const n = str(d['sri-follow-up.reportNumber']);
				return type && n ? `${type} follow-up (report #${n})` : type ? `${type} follow-up` : '';
			},
			needs: ['sri-follow-up.reportType'],
			label: 'Follow-up report type',
			to: { page: 0, x: 232, y: 548.5, maxWidth: 196 }
		},
		{ src: 'sri-follow-up.date', to: { page: 0, x: 46.5, y: 474, maxWidth: 238 } },
		{ src: 'sri-follow-up.sircReviewDate', to: { page: 0, x: 294.8, y: 474, maxWidth: 286 } },
		{ src: 'sri-follow-up.sircRecommendations', to: { page: 0, x: 198, y: 441.2, maxWidth: 382 } },
		{
			src: (d) =>
				parts(d, [
					['', 'sri-follow-up.investigationActions'],
					['Findings', 'sri-follow-up.findings']
				]),
			needs: ['sri-follow-up.investigationActions'],
			label: '1. Actions taken to investigate since the last report',
			to: { page: 0, x: 240, y: 398.8, maxWidth: 340 }
		},
		{
			src: (d) =>
				parts(d, [
					['Status', 'sri-follow-up.status'],
					['', 'sri-follow-up.remainingSteps']
				]),
			needs: ['sri-follow-up.status'],
			label: '2. Further activities needed to complete the investigation',
			to: { page: 0, x: 395, y: 370, maxWidth: 185 }
		},
		{
			src: (d) => {
				const rec = str(d['sri-follow-up.recommendation']);
				const why = parts(d, [
					['', 'sri-follow-up.reason'],
					['Corrective actions', 'sri-follow-up.correctiveActions']
				]);
				return rec && why ? `${rec}. ${why}` : rec || why;
			},
			needs: ['sri-follow-up.recommendation', 'sri-follow-up.reason'],
			label: '3. Should the incident remain open or closed, and why',
			to: { page: 0, x: 198, y: 337.9, maxWidth: 380 }
		},
		{ src: 'provider.name', to: { page: 0, x: 168.2, y: 213, maxWidth: 180 } },
		{ src: 'provider.phone', to: { page: 0, x: 529, y: 216.5, size: 7.5, maxWidth: 54 } },
		{
			src: 'rrdc.name',
			label: 'Copy sent to (RRDC)',
			to: { page: 0, x: 46.5, y: 166.6, maxWidth: 268 }
		},
		{ src: 'sri-follow-up.sentToRrdc', to: { page: 0, x: 502, y: 151.3, size: 8, maxWidth: 81 } },
		{
			src: 'serviceCoordinator.name',
			label: 'Copy sent to (service coordinator)',
			to: { page: 0, x: 46.5, y: 136.2, maxWidth: 196 }
		},
		{ src: 'sri-follow-up.sentToSc', to: { page: 0, x: 502, y: 121.7, size: 8, maxWidth: 81 } }
		// Agency investigator and responsible provider representative names are electronic
		// signatures; they and their dates are left to sign. "For RRDC use only" stays blank.
	]
};
