import type { CaseData, FormDef } from '../types.ts';
import { formatMoney } from '../values.ts';

const G = 'Final cost';
const AT = 'Assistive Technology (AT)';
const CTS = 'Community Transition Services (CTS)';

/** Baseline of each printed cost row (AT, CTS). */
const ROW = { [AT]: 572, [CTS]: 548 };

export const doh5755: FormDef = {
	id: 'doh-5755',
	code: 'DOH-5755',
	title: 'Waiver Services Final Cost and RRDS Approval of Final Cost',
	file: 'doh-5755.pdf',
	revision: '12/20',
	sourceUrl: 'https://www.health.ny.gov/forms/doh-5755.pdf',
	stage: 'plan',
	roles: ['sc', 'provider'],
	signers: [
		'Applicant/participant',
		'Legal guardian / representative (if any)',
		'Service coordinator',
		'Service provider'
	],
	when: 'After the Assistive Technology or Community Transition Service is delivered. Attach itemized receipts; the RRDS reviews the final cost (DOH too if it exceeds the service cap). E-mods use DOH-5754.',
	questions: [
		{
			key: 'doh-5755.service',
			label: 'Final cost for',
			type: 'select',
			group: G,
			options: [AT, CTS]
		},
		{
			key: 'doh-5755.expenditure',
			label: 'One-time or ongoing expenditure',
			type: 'select',
			group: G,
			options: ['One-time', 'Ongoing']
		},
		{
			key: 'doh-5755.initialCost',
			label: 'Initial cost (from the approved cost projection)',
			type: 'money',
			group: G
		},
		{ key: 'doh-5755.finalCost', label: 'Final cost', type: 'money', group: G },
		{
			key: 'doh-5755.explanation',
			label: 'Explanation if the final cost differs from the initial projection',
			type: 'longtext',
			group: G,
			optional: true
		}
	],
	fields: [
		// TBI waiver (not NHTD).
		{ src: () => true, to: { page: 0, x: 553.2, y: 649, mark: true } },
		{ src: 'participant.name', to: { page: 0, x: 129, y: 620.5, maxWidth: 295 } },
		{ src: 'participant.cin', to: { page: 0, x: 459, y: 620.5, maxWidth: 121 } },
		{
			src: (d) => d['doh-5755.service'] === AT,
			needs: ['doh-5755.service'],
			to: { page: 0, x: 165.6, y: 569.4, mark: true }
		},
		{ src: (d) => d['doh-5755.service'] === CTS, to: { page: 0, x: 165.6, y: 548.4, mark: true } },
		...([AT, CTS] as const).flatMap((svc) => [
			{
				src: (d: CaseData) =>
					d['doh-5755.service'] === svc ? formatOrEmpty(d['doh-5755.initialCost']) : '',
				needs: ['doh-5755.initialCost'],
				label: 'Initial cost',
				to: { page: 0, x: 347, y: ROW[svc], maxWidth: 98 }
			},
			{
				src: (d: CaseData) =>
					d['doh-5755.service'] === svc ? formatOrEmpty(d['doh-5755.finalCost']) : '',
				needs: ['doh-5755.finalCost'],
				label: 'Final cost',
				to: { page: 0, x: 482, y: ROW[svc], maxWidth: 98 }
			}
		]),
		{
			src: (d) => (d['doh-5755.expenditure'] ? `${d['doh-5755.expenditure']} expenditure` : ''),
			needs: ['doh-5755.expenditure'],
			label: 'One-time or ongoing expenditure',
			to: { page: 0, x: 36, y: 551, size: 8, maxWidth: 118 }
		},
		{
			src: 'doh-5755.explanation',
			to: { page: 0, x: 40, y: 481, lines: 5, lineHeight: 11, maxWidth: 534 }
		},
		// Printed names beside the signature lines; signatures and dates are left blank.
		{ src: 'participant.name', to: { page: 0, x: 38, y: 374.5, maxWidth: 242 } },
		{
			src: (d) => d['guardian.name'] || d['authRep.name'],
			label: 'Legal guardian / representative',
			to: { page: 0, x: 38, y: 347.5, maxWidth: 242 }
		},
		{ src: 'serviceCoordinator.name', to: { page: 0, x: 38, y: 320.5, maxWidth: 242 } },
		{ src: 'provider.name', to: { page: 0, x: 38, y: 293.5, maxWidth: 242 } }
		// "For RRDS use only" and "For DOH use only" are left blank.
	]
};

function formatOrEmpty(v: unknown): string {
	return typeof v === 'string' && v.trim() !== '' ? formatMoney(v) : '';
}
