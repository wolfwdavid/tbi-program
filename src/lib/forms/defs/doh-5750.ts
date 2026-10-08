import type { CaseData, FormDef } from '../types.ts';

/** Name and phone on two lines for the change-table cells, skipping whichever part is blank. */
const nameAndPhone = (d: CaseData, name: string, phone: string) =>
	[d[name], d[phone]].filter((v) => typeof v === 'string' && v.trim() !== '').join('\n') ||
	undefined;

export const doh5750: FormDef = {
	id: 'doh-5750',
	code: 'DOH-5750',
	title: 'Change of Provider Request',
	file: 'doh-5750.pdf',
	revision: '12/20',
	sourceUrl: 'https://www.health.ny.gov/forms/doh-5750.pdf',
	stage: 'ongoing',
	roles: ['sc'],
	signers: [
		'Participant',
		'Legal guardian (if any)',
		'Authorized representative (if any)',
		'Current Service Coordinator',
		'Requested provider contact',
		'RRDS'
	],
	when: 'Completed by the Service Coordinator with the participant and sent to the requested provider, who returns it within 5 business days; the SC then sends it to the RRDS, who sets the effective date (normally at least 30 days notice).',
	questions: [
		{
			key: 'doh-5750.waiverService',
			label: 'Waiver service being changed',
			type: 'text',
			group: 'Changes'
		},
		{
			key: 'doh-5750.currentProvider',
			label: 'Current provider agency (or staff name)',
			type: 'text',
			group: 'Changes'
		},
		{
			key: 'doh-5750.currentProviderPhone',
			label: 'Current provider phone',
			type: 'phone',
			group: 'Changes'
		},
		{
			key: 'doh-5750.requestedProvider',
			label: 'Requested provider agency (or staff name)',
			type: 'text',
			group: 'Changes'
		},
		{
			key: 'doh-5750.requestedProviderPhone',
			label: 'Requested provider phone',
			type: 'phone',
			group: 'Changes'
		},
		{
			key: 'doh-5750.transitionDate',
			label: 'Transition meeting date',
			type: 'date',
			group: 'Changes',
			optional: true
		},
		{
			key: 'doh-5750.transitionTime',
			label: 'Transition meeting time',
			type: 'time',
			group: 'Changes',
			optional: true
		}
	],
	fields: [
		{ src: () => true, to: { acro: 'TBI' } },
		{ src: 'participant.name', to: { acro: 'I Participant Name' } },
		{ src: 'participant.cin', to: { acro: 'CIN' } },
		{ src: 'doh-5750.waiverService', to: { acro: 'Waiver ServiceRow1' } },
		{
			src: (d) => nameAndPhone(d, 'doh-5750.currentProvider', 'doh-5750.currentProviderPhone'),
			label: 'Current provider',
			needs: ['doh-5750.currentProvider', 'doh-5750.currentProviderPhone'],
			to: { acro: 'Current Provider Agency Name or Provider Agency Staff Name  and TelephoneRow1' }
		},
		{
			src: (d) => nameAndPhone(d, 'doh-5750.requestedProvider', 'doh-5750.requestedProviderPhone'),
			label: 'Requested provider',
			needs: ['doh-5750.requestedProvider', 'doh-5750.requestedProviderPhone'],
			to: { acro: 'Requested Provider Agency Name or Provider Agency Staff Name and TelephoneRow1' }
		},
		// Service Coordinator's lines under the SC signature.
		{ src: 'scAgency.name', to: { acro: 'Agency Name' } },
		{ src: 'doh-5750.transitionDate', to: { acro: 'Transition Meeting to be held on mmddyyyy' } },
		{ src: 'doh-5750.transitionTime', to: { acro: 'at' } }
		// The requested provider's box and the RRDS box are left for them.
	]
};
