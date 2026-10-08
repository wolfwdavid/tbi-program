import type { CaseData, FormDef } from '../types.ts';
import { formatMoney } from '../values.ts';

const G = 'Environmental modification';
const ENV = 'Environmental modification (home)';
const VEH = 'Vehicle modification';

/** "ABC Contracting, $9,800.00" from the selected-bid answers. */
function selectedBid(d: CaseData): string {
	const vendor = String(d['doh-5753.selectedBid'] ?? '').trim();
	const amount = String(d['doh-5753.selectedBidAmount'] ?? '').trim();
	const parts = [vendor, amount && formatMoney(amount)].filter(Boolean);
	return parts.length ? `Selected bid: ${parts.join(', ')}` : '';
}

export const doh5753: FormDef = {
	id: 'doh-5753',
	code: 'DOH-5753',
	title: 'Environmental Modification (E-Mod) Description and Initial Cost Projection',
	file: 'doh-5753.pdf',
	revision: '12/20',
	sourceUrl: 'https://www.health.ny.gov/forms/doh-5753.pdf',
	stage: 'plan',
	roles: ['sc', 'provider'],
	signers: [
		'Applicant/participant',
		'Legal guardian / representative (if any)',
		'RRDS',
		'DOH Waiver staff (if over $15,000)'
	],
	when: 'With the service plan or an addendum when a home or vehicle modification is requested. Attach all assessments and bids (and landlord authorization for a rental); RRDS approves, and DOH too if over $15,000.',
	questions: [
		{
			key: 'doh-5753.modType',
			label: 'Type of modification',
			type: 'select',
			group: G,
			options: [ENV, VEH]
		},
		{
			key: 'doh-5753.modAddress',
			label: 'Address of the proposed modification (if not the current residence)',
			type: 'text',
			group: G,
			optional: true,
			help: "Leave blank to use the participant's current residence."
		},
		{
			key: 'doh-5753.description',
			label: 'Describe the modification being requested',
			type: 'longtext',
			group: G
		},
		{
			key: 'doh-5753.healthWelfare',
			label: "How the modification will contribute to the participant's health and welfare",
			type: 'longtext',
			group: G
		},
		{
			key: 'doh-5753.selectedBid',
			label: 'Selected bid (contractor)',
			type: 'text',
			group: G,
			help: 'Attach all assessments and bids to the printed form.'
		},
		{ key: 'doh-5753.selectedBidAmount', label: 'Selected bid amount', type: 'money', group: G },
		{ key: 'doh-5753.contractor', label: 'Contractor / supplier', type: 'text', group: G },
		{
			key: 'doh-5753.contractorPhone',
			label: 'Contractor telephone',
			type: 'phone',
			group: G,
			optional: true
		}
	],
	fields: [
		// TBI waiver (not NHTD).
		{ src: () => true, to: { page: 0, x: 151.2, y: 682, mark: true } },
		{
			src: (d) => d['doh-5753.modType'] === ENV,
			needs: ['doh-5753.modType'],
			to: { page: 0, x: 442.2, y: 682, mark: true }
		},
		{ src: (d) => d['doh-5753.modType'] === VEH, to: { page: 0, x: 538.2, y: 682, mark: true } },
		{ src: 'participant.name', to: { page: 0, x: 129, y: 656.5, maxWidth: 295 } },
		{ src: 'participant.cin', to: { page: 0, x: 459, y: 656.5, maxWidth: 121 } },
		{
			src: (d) => d['doh-5753.modAddress'] || d['participant.address'],
			needs: ['participant.address'],
			label: 'Address of proposed modification',
			to: { page: 0, x: 201, y: 629.5, maxWidth: 379 }
		},
		{
			src: 'doh-5753.description',
			to: { page: 0, x: 40, y: 584, lines: 3, lineHeight: 10.5, maxWidth: 534 }
		},
		{
			src: 'doh-5753.healthWelfare',
			to: { page: 0, x: 40, y: 524, lines: 3, lineHeight: 10.5, maxWidth: 534 }
		},
		{
			src: selectedBid,
			needs: ['doh-5753.selectedBid', 'doh-5753.selectedBidAmount'],
			label: 'Selected bid',
			to: { page: 0, x: 292, y: 477, maxWidth: 290 }
		},
		{
			src: (d) => d['guardian.name'] || d['authRep.name'],
			label: 'Legal guardian / representative',
			to: { page: 0, x: 38, y: 383.5, maxWidth: 242 }
		},
		{ src: 'provider.name', to: { page: 0, x: 38, y: 356.5, maxWidth: 428 } },
		{ src: 'provider.medicaidId', to: { page: 0, x: 482, y: 356.5, maxWidth: 98 } },
		{ src: 'provider.contact.name', to: { page: 0, x: 38, y: 326.5, maxWidth: 542 } },
		{ src: 'doh-5753.contractor', to: { page: 0, x: 38, y: 299.5, maxWidth: 428 } },
		{ src: 'doh-5753.contractorPhone', to: { page: 0, x: 482, y: 299.5, maxWidth: 98 } },
		{ src: 'serviceCoordinator.name', to: { page: 0, x: 38, y: 269.5, maxWidth: 542 } }
	]
};
