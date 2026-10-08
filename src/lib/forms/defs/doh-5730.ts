import type { CaseData, FormDef } from '../types.ts';
import { cell, rowCount } from '../values.ts';

const SLOTS = ['1', '2', '3', '4', '5', '6'];

/** Services in the services table that this provider delivers (Service Coordination excluded). */
function requested(d: CaseData): string[] {
	const provider = String(d['provider.name'] ?? '')
		.trim()
		.toLowerCase();
	const out: string[] = [];
	for (let i = 0; i < rowCount(d, 'services'); i++) {
		const type = String(d[cell('services', i, 'type')] ?? '').trim();
		const by = String(d[cell('services', i, 'provider')] ?? '')
			.trim()
			.toLowerCase();
		if (type && type !== 'Service Coordination' && provider && by === provider) out.push(type);
	}
	return out;
}

export const doh5730: FormDef = {
	id: 'doh-5730',
	code: 'DOH-5730',
	title: 'Provider Selection',
	file: 'doh-5730.pdf',
	revision: '12/20',
	sourceUrl: 'https://www.health.ny.gov/forms/doh-5730.pdf',
	stage: 'intake',
	roles: ['sc'],
	signers: [
		'Applicant',
		'Legal guardian (if any)',
		'Authorized representative (if any)',
		'Service Coordinator',
		'RRDS'
	],
	when: 'One per chosen provider, signed while the Initial Service Plan is developed; the provider completes its section and returns it to the Service Coordinator. The original goes in the Application Packet.',
	fields: [
		// Both boxes are pre-checked in the blank PDF: clear NHTD, keep TBI.
		{ src: () => false, to: { acro: 'Check Box3' } },
		{ src: () => true, to: { acro: 'Check Box4' } },
		{ src: 'provider.name', to: { acro: 'Name of Provider Agency' } },
		{ src: 'provider.phone', to: { acro: 'Telephone' } },
		// No field on the Provider Address line.
		{ src: 'provider.address', to: { page: 0, x: 38, y: 508, size: 10, maxWidth: 540 } },
		// Requested services: the rows of the services table assigned to this provider.
		// A seventh or later service shares slot 6 (and spills to the continuation page).
		...SLOTS.map((acro, i) => ({
			src: (d: CaseData) => (i < 5 ? requested(d)[i] : requested(d).slice(5).join('; ')),
			label: `Requested service ${acro}`,
			...(i === 0 ? { needs: ['services', 'provider.name'] } : {}),
			to: { acro }
		})),
		{ src: 'participant.name', to: { acro: 'Applicant Name' } },
		// No field on the Applicant Address line.
		{ src: 'participant.address', to: { page: 0, x: 38, y: 348.5, size: 10, maxWidth: 540 } },
		// Provider box: only the agency name is prefilled; the provide / unable / will-not
		// choice and reasons are the provider's. ("Because 2" is really the SC signature field.)
		{ src: 'provider.name', to: { acro: 'Provider Agency' } }
	]
};
