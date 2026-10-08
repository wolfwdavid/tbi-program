import type { FormDef } from '../types.ts';

export const doh5727: FormDef = {
	id: 'doh-5727',
	code: 'DOH-5727',
	title: 'Service Coordination Agency Selection',
	file: 'doh-5727.pdf',
	revision: '12/20',
	sourceUrl: 'https://www.health.ny.gov/forms/doh-5727.pdf',
	stage: 'intake',
	roles: ['sc'],
	signers: [
		'Applicant',
		'Legal guardian (if any)',
		'Service Coordinator',
		'Service Coordination Supervisor',
		'RRDS'
	],
	when: 'Given to the applicant at the intake meeting. The chosen agency signs and returns it to the RRDC within 5 business days of receiving it; the RRDS then approves it.',
	fields: [
		{ src: () => true, to: { acro: 'TBI box' } },
		// Applicant's choice. Field "1" is the Agency Address line, "2" the Applicant Name.
		{ src: 'scAgency.name', to: { acro: 'Service Coordination Provider Agency' } },
		{ src: 'scAgency.phone', to: { acro: 'Telephone' } },
		{ src: 'scAgency.address', to: { acro: '1' } },
		{ src: 'participant.name', to: { acro: '2' } },
		// Agency box: only the agency name is prefilled. "Will / will not provide" and the
		// reason are the agency's decision. ("Reason 2" is really the SC signature field.)
		{ src: 'scAgency.name', to: { acro: 'Service Coordination Provider Agency_2' } }
	]
};
