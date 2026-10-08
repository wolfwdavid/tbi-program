import type { FormDef } from '../types.ts';

export const doh5729: FormDef = {
	id: 'doh-5729',
	code: 'DOH-5729',
	title: 'Application for Participation, Initial Interview and Acknowledgement',
	file: 'doh-5729.pdf',
	revision: '12/20',
	sourceUrl: 'https://www.health.ny.gov/forms/doh-5729.pdf',
	stage: 'intake',
	roles: ['sc'],
	signers: ['Applicant', 'Legal guardian (if any)', 'Authorized representative (if any)', 'RRDS'],
	when: 'Signed at the intake meeting with the RRDS, held within 30 days of referral.',
	questions: [
		{
			key: 'doh-5729.medicaidStatus',
			label: 'Medicaid status',
			type: 'select',
			group: 'Intake',
			options: ['Enrolled', 'Not enrolled in Medicaid', 'Medicaid application is pending']
		}
	],
	fields: [
		{ src: () => true, to: { acro: 'TBI box' } },
		{ src: 'participant.name', to: { acro: 'Applicant Name' } },
		{ src: 'participant.cin', to: { acro: 'CIN' } },
		{ src: 'participant.dob', to: { acro: 'Date of Birth' } },
		{ src: 'participant.address', to: { acro: 'Current Residence' } },
		{ src: 'participant.phone', to: { acro: 'Telephone' } },
		{ src: 'intake.interviewDate', to: { acro: 'Date of Interview' } },
		{
			src: (d) => d['doh-5729.medicaidStatus'] === 'Not enrolled in Medicaid',
			needs: ['doh-5729.medicaidStatus'],
			to: { acro: 'Not enrolled in Medicaid' }
		},
		{
			src: (d) => d['doh-5729.medicaidStatus'] === 'Medicaid application is pending',
			to: { acro: 'Medicaid application is pending' }
		},
		{ src: 'guardian.name', to: { acro: 'Legal Guardian Name as applicable' } },
		{ src: 'authRep.name', to: { acro: 'Authorized Representative Name as applicable' } },
		{ src: 'rrds.name', to: { acro: 'Regional Resource Development Specialist Name' } }
	]
};
