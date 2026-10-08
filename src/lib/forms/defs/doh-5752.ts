import type { CaseData, FormDef } from '../types.ts';
import { formatMoney } from '../values.ts';

const G = 'Assistive technology';

/** "ABC Medical Supply, $1,250.00" from the selected-bid answers. */
function selectedBid(d: CaseData, form: string): string {
	const vendor = String(d[`${form}.selectedBid`] ?? '').trim();
	const amount = String(d[`${form}.selectedBidAmount`] ?? '').trim();
	const parts = [vendor, amount && formatMoney(amount)].filter(Boolean);
	return parts.length ? `Selected bid: ${parts.join(', ')}` : '';
}

export const doh5752: FormDef = {
	id: 'doh-5752',
	code: 'DOH-5752',
	title: 'Assistive Technology (AT) Description and Initial Cost Projection',
	file: 'doh-5752.pdf',
	revision: '12/20',
	sourceUrl: 'https://www.health.ny.gov/forms/doh-5752.pdf',
	stage: 'plan',
	roles: ['sc', 'provider'],
	signers: [
		'Applicant/participant',
		'Legal guardian / representative (if any)',
		'RRDS',
		'DOH Waiver staff (if over $35,000)'
	],
	when: 'With the service plan or an addendum when Assistive Technology is requested. Attach all assessments and bids; RRDS approves, and DOH too if over $35,000.',
	questions: [
		{
			key: 'doh-5752.description',
			label: 'Describe the Assistive Technology being requested',
			type: 'longtext',
			group: G
		},
		{
			key: 'doh-5752.healthWelfare',
			label: "How the Assistive Technology will contribute to the participant's health and welfare",
			type: 'longtext',
			group: G
		},
		{
			key: 'doh-5752.selectedBid',
			label: 'Selected bid (vendor)',
			type: 'text',
			group: G,
			help: 'Attach all assessments and bids to the printed form.'
		},
		{ key: 'doh-5752.selectedBidAmount', label: 'Selected bid amount', type: 'money', group: G },
		{ key: 'doh-5752.supplier', label: 'Assistive Technology supplier', type: 'text', group: G },
		{
			key: 'doh-5752.supplierPhone',
			label: 'Supplier telephone',
			type: 'phone',
			group: G,
			optional: true
		}
	],
	fields: [
		// TBI waiver (not NHTD).
		{ src: () => true, to: { page: 0, x: 553.2, y: 682, mark: true } },
		{ src: 'participant.name', to: { page: 0, x: 129, y: 659.5, maxWidth: 295 } },
		{ src: 'participant.cin', to: { page: 0, x: 459, y: 659.5, maxWidth: 121 } },
		{
			src: 'doh-5752.description',
			to: { page: 0, x: 40, y: 610, lines: 3, lineHeight: 11, maxWidth: 534 }
		},
		{
			src: 'doh-5752.healthWelfare',
			to: { page: 0, x: 40, y: 541, lines: 3, lineHeight: 11, maxWidth: 534 }
		},
		{
			src: (d) => selectedBid(d, 'doh-5752'),
			needs: ['doh-5752.selectedBid', 'doh-5752.selectedBidAmount'],
			label: 'Selected bid',
			to: { page: 0, x: 292, y: 489, maxWidth: 290 }
		},
		{
			src: (d) => d['guardian.name'] || d['authRep.name'],
			label: 'Legal guardian / representative',
			to: { page: 0, x: 38, y: 392.5, maxWidth: 242 }
		},
		{ src: 'provider.name', to: { page: 0, x: 38, y: 365.5, maxWidth: 428 } },
		{ src: 'provider.medicaidId', to: { page: 0, x: 482, y: 365.5, maxWidth: 98 } },
		{ src: 'provider.contact.name', to: { page: 0, x: 38, y: 335.5, maxWidth: 542 } },
		{ src: 'doh-5752.supplier', to: { page: 0, x: 38, y: 308.5, maxWidth: 428 } },
		{ src: 'doh-5752.supplierPhone', to: { page: 0, x: 482, y: 308.5, maxWidth: 98 } },
		{ src: 'serviceCoordinator.name', to: { page: 0, x: 38, y: 278.5, maxWidth: 542 } }
	]
};
