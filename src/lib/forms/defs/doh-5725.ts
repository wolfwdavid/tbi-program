import type { FormDef } from '../types.ts';

export const doh5725: FormDef = {
	id: 'doh-5725',
	code: 'DOH-5725',
	title: 'Initial Applicant Interview and Acknowledgement',
	file: 'doh-5725.pdf',
	revision: '12/20',
	sourceUrl: 'https://www.health.ny.gov/forms/doh-5725.pdf',
	stage: 'intake',
	roles: ['sc'],
	signers: ['Applicant, legal guardian or authorized representative', 'RRDS'],
	when: 'Reviewed and signed with the RRDS at the intake meeting, held within 30 days of referral; all intake forms must be signed before the meeting closes.',
	fields: [
		{ src: () => true, to: { acro: 'TBI Waiver' } },
		{ src: 'intake.referralNumber', to: { acro: 'Referral' } },
		{ src: 'participant.name', to: { acro: 'Applicant Name' } },
		{ src: 'intake.interviewDate', to: { acro: 'Date of Interview' } },
		{ src: 'participant.cin', to: { acro: 'CIN' } },
		{ src: 'rrds.name', to: { acro: 'Regional Resource Development Specialist RRDS' } }
	]
};
