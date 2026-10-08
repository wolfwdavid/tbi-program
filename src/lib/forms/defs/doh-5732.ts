import type { FormDef } from '../types.ts';

export const doh5732: FormDef = {
	id: 'doh-5732',
	code: 'DOH-5732',
	title: 'Waiver Participant Rights and Responsibilities',
	file: 'doh-5732.pdf',
	revision: '12/20',
	sourceUrl: 'https://www.health.ny.gov/forms/doh-5732.pdf',
	stage: 'intake',
	roles: ['sc'],
	signers: [
		'Applicant / participant',
		'Legal guardian / committee (if any)',
		'Authorized representative (if any)',
		'Service Coordinator'
	],
	when: 'Signed during the application process (a copy goes in the Application Packet), then reviewed with the Service Coordinator and re-signed every year.',
	fields: [
		{ src: () => true, to: { acro: 'TBI' } },
		// Printed names in the page 3 signature block.
		{ src: 'participant.name', to: { acro: 'ApplicantParticipant' } },
		{ src: 'guardian.name', to: { acro: 'Legal GuardianCommittee if applicable' } },
		{ src: 'authRep.name', to: { acro: 'Authorized Representative if applicable' } },
		{ src: 'serviceCoordinator.name', to: { acro: 'Service Coordinator Name' } }
	]
};
