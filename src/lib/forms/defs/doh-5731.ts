import type { CaseData, FormDef } from '../types.ts';

/** "Name\nphone" for the two-line table cells, skipping whichever part is blank. */
const nameAndPhone = (d: CaseData, name: string, phone: string) =>
	[d[name], d[phone]].filter((v) => typeof v === 'string' && v.trim() !== '').join('\n') ||
	undefined;

export const doh5731: FormDef = {
	id: 'doh-5731',
	code: 'DOH-5731',
	title: 'Change of Service Coordination Agency Request',
	file: 'doh-5731.pdf',
	revision: '12/20',
	sourceUrl: 'https://www.health.ny.gov/forms/doh-5731.pdf',
	stage: 'ongoing',
	roles: ['sc'],
	signers: [
		'Participant',
		'Legal guardian (if any)',
		'Authorized representative (if any)',
		'Current Service Coordinator',
		'Current SC Supervisor',
		'Requested Service Coordinator and Supervisor',
		'RRDS'
	],
	when: 'Completed with the RRDS whenever the participant asks to change service coordination agencies. Service coordination changes take effect on the first of a month, with at least 30 days notice.',
	questions: [
		{
			key: 'doh-5731.requestedAgency',
			label: 'Requested service coordination agency',
			type: 'text',
			group: 'Changes'
		},
		{
			key: 'doh-5731.requestedAgencyPhone',
			label: 'Requested agency phone',
			type: 'phone',
			group: 'Changes'
		}
	],
	fields: [
		{ src: () => true, to: { acro: 'TBI box' } },
		{ src: 'participant.name', to: { acro: 'I Participant Name' } },
		{ src: 'participant.cin', to: { acro: 'CIN' } },
		// The change table; current = the agency on file now.
		{
			src: (d) => nameAndPhone(d, 'serviceCoordinator.name', 'serviceCoordinator.phone'),
			label: 'Current Service Coordinator',
			needs: ['serviceCoordinator.name', 'serviceCoordinator.phone'],
			to: { acro: 'Current Service Coordinator Name and TelephoneRow1' }
		},
		{
			src: (d) => nameAndPhone(d, 'scAgency.name', 'scAgency.phone'),
			label: 'Current service coordination agency',
			needs: ['scAgency.name', 'scAgency.phone'],
			to: { acro: 'Current Service Coordination Agency and TelephoneRow1' }
		},
		{
			src: (d) => nameAndPhone(d, 'doh-5731.requestedAgency', 'doh-5731.requestedAgencyPhone'),
			label: 'Requested service coordination agency',
			needs: ['doh-5731.requestedAgency', 'doh-5731.requestedAgencyPhone'],
			to: { acro: 'Requested Service Coordination Agency Name and TelephoneRow1' }
		}
		// The requested agency's box and the RRDS box are left for them.
	],
	// The blank PDF ships "10:00" in the RRDS transition-meeting time.
	clearFields: ['at']
};
