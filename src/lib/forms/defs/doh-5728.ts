import type { FormDef } from '../types.ts';

const CHOICES = [
	'Apply for the TBI waiver',
	'Apply for Medicaid State Plan services and/or another HCBS waiver',
	'Not apply for an HCBS waiver at this time'
];

export const doh5728: FormDef = {
	id: 'doh-5728',
	code: 'DOH-5728',
	title: 'Freedom of Choice',
	file: 'doh-5728.pdf',
	revision: '12/20',
	sourceUrl: 'https://www.health.ny.gov/forms/doh-5728.pdf',
	stage: 'intake',
	roles: ['sc'],
	signers: ['Applicant', 'Legal guardian (if any)', 'Authorized representative (if any)', 'RRDS'],
	when: 'Reviewed and signed with the RRDS at the intake meeting, before the meeting closes. The RRDC keeps the original; a copy goes in the Application Packet.',
	questions: [
		{
			key: 'doh-5728.choice',
			label: "Applicant's choice (Freedom of Choice)",
			type: 'select',
			group: 'Intake',
			options: CHOICES
		}
	],
	fields: [
		{ src: () => true, to: { acro: 'TBI box' } },
		// The "I, ____ have been informed..." line; the field is named after the text beside it.
		{
			src: 'participant.name',
			to: {
				acro: 'provided through either a nursing facility or a Home and Community Based Services Medicaid Waiver'
			}
		},
		{
			src: (d) => d['doh-5728.choice'] === CHOICES[0],
			needs: ['doh-5728.choice'],
			to: {
				acro: 'I have chosen to apply for the Nursing Home Transition  and Diversion or Traumatic Brain InjuryMedicaid Waiver'
			}
		},
		{
			src: (d) => d['doh-5728.choice'] === CHOICES[1],
			to: {
				acro: 'I have chosen to apply for Medicaid State Plan Services andor another Home and Community Based Services Medicaid Waiver'
			}
		},
		{
			src: (d) => d['doh-5728.choice'] === CHOICES[2],
			to: {
				acro: 'I have chosen NOT to apply for services through a Home and Community Based Services Medicaid waiver at this time'
			}
		},
		// Printed names beside the signature lines (all labelled "Applicant Signature" on the form).
		{ src: 'guardian.name', to: { acro: 'Legal Guardian Name as applicable' } },
		{ src: 'authRep.name', to: { acro: 'Authorized Representative as applicable' } },
		{ src: 'rrds.name', to: { acro: 'Regional Resource Development Specialist' } }
	]
};
