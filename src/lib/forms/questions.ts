import type { Question } from './types.ts';

// Shared questions: facts that appear on more than one form. Ask once, fill everywhere.
// Groups are the headings the wizard shows, in this order.

export const GROUPS = [
	'Participant',
	'Injury and health',
	'Benefits and finances',
	'Guardian and representatives',
	'Service coordination',
	'Waiver service provider',
	'Regional office (RRDC / RRDS)',
	'Supports',
	'Services',
	'Incident'
] as const;

const P = 'Participant';
const H = 'Injury and health';
const B = 'Benefits and finances';
const G = 'Guardian and representatives';
const SC = 'Service coordination';
const PR = 'Waiver service provider';
const R = 'Regional office (RRDC / RRDS)';
const SU = 'Supports';
const SV = 'Services';
const I = 'Incident';

export const sharedQuestions: Question[] = [
	// Participant
	{ key: 'participant.name', label: 'Participant full name', type: 'text', group: P },
	{
		key: 'participant.cin',
		label: 'Medicaid CIN',
		type: 'text',
		group: P,
		help: 'Client Identification Number: 2 letters, 5 digits, 1 letter (e.g. AB12345C).'
	},
	{ key: 'participant.dob', label: 'Date of birth', type: 'date', group: P },
	{
		key: 'participant.address',
		label: 'Current residence (street, city, ZIP)',
		type: 'text',
		group: P
	},
	{ key: 'participant.phone', label: 'Telephone', type: 'phone', group: P },
	{ key: 'participant.county', label: 'County of residence', type: 'text', group: P },
	{
		key: 'participant.countyFiscalResponsibility',
		label: 'County of fiscal responsibility',
		type: 'text',
		group: P,
		help: 'The local DSS that pays for Medicaid, if different from the county of residence.',
		optional: true
	},
	{
		key: 'participant.currentLocation',
		label: 'Current living situation',
		type: 'select',
		group: P,
		options: ['Home / community', 'Nursing facility', 'Hospital', 'Other'],
		optional: true
	},
	{
		key: 'participant.proposedResidence',
		label: 'Proposed residence after enrollment (if different)',
		type: 'text',
		group: P,
		optional: true
	},
	{
		key: 'participant.emergencyContact.name',
		label: 'Emergency contact name',
		type: 'text',
		group: P
	},
	{
		key: 'participant.emergencyContact.phone',
		label: 'Emergency contact phone',
		type: 'phone',
		group: P
	},

	// Injury and health
	{
		key: 'participant.diagnosis',
		label: 'Diagnosis (TBI and related)',
		type: 'longtext',
		group: H
	},
	{ key: 'participant.injury.onsetDate', label: 'Date of injury (onset)', type: 'date', group: H },
	{ key: 'participant.injury.ageAtOnset', label: 'Age at onset', type: 'number', group: H },
	{
		key: 'participant.injury.cause',
		label: 'Cause of injury',
		type: 'text',
		group: H,
		optional: true
	},
	{
		key: 'medications',
		label: 'Current medications',
		type: 'table',
		group: H,
		rows: 8,
		columns: [
			{ id: 'name', label: 'Medication' },
			{ id: 'dose', label: 'Dose / frequency' },
			{ id: 'purpose', label: 'Purpose' },
			{ id: 'prescriber', label: 'Prescriber' }
		]
	},

	// Benefits and finances
	{
		key: 'participant.medicareNumber',
		label: 'Medicare number',
		type: 'text',
		group: B,
		optional: true
	},
	{
		key: 'participant.otherInsurance',
		label: 'Other health insurance',
		type: 'text',
		group: B,
		optional: true
	},
	{
		key: 'participant.ssn',
		label: 'Social Security number',
		type: 'text',
		group: B,
		sensitive: true,
		optional: true,
		help: 'Only asked on the service plan forms. Leave blank to write it in by hand.'
	},
	{
		key: 'participant.income',
		label: 'Monthly income (source and amount)',
		type: 'text',
		group: B,
		optional: true
	},
	{
		key: 'participant.resources',
		label: 'Resources (savings, property)',
		type: 'text',
		group: B,
		optional: true
	},
	{
		key: 'participant.spenddown',
		label: 'Medicaid spenddown amount',
		type: 'money',
		group: B,
		optional: true
	},
	{
		key: 'participant.repPayee',
		label: 'Representative payee (name)',
		type: 'text',
		group: B,
		optional: true
	},

	// Guardian and representatives
	{ key: 'guardian.name', label: 'Legal guardian name', type: 'text', group: G, optional: true },
	{ key: 'guardian.phone', label: 'Legal guardian phone', type: 'phone', group: G, optional: true },
	{
		key: 'authRep.name',
		label: 'Authorized representative name',
		type: 'text',
		group: G,
		optional: true
	},

	// Service coordination
	{ key: 'scAgency.name', label: 'Service coordination agency', type: 'text', group: SC },
	{ key: 'scAgency.address', label: 'Agency address', type: 'text', group: SC },
	{ key: 'scAgency.phone', label: 'Agency phone', type: 'phone', group: SC },
	{ key: 'serviceCoordinator.name', label: 'Service coordinator name', type: 'text', group: SC },
	{ key: 'serviceCoordinator.phone', label: 'Service coordinator phone', type: 'phone', group: SC },
	{
		key: 'serviceCoordinator.email',
		label: 'Service coordinator email',
		type: 'text',
		group: SC,
		optional: true
	},
	{ key: 'scSupervisor.name', label: 'Service coordination supervisor', type: 'text', group: SC },

	// Waiver service provider
	{ key: 'provider.name', label: 'Provider agency name', type: 'text', group: PR },
	{ key: 'provider.medicaidId', label: 'Provider Medicaid ID', type: 'text', group: PR },
	{ key: 'provider.address', label: 'Provider address', type: 'text', group: PR },
	{ key: 'provider.phone', label: 'Provider phone', type: 'phone', group: PR },
	{ key: 'provider.contact.name', label: 'Provider contact person', type: 'text', group: PR },
	{ key: 'provider.contact.title', label: 'Contact title', type: 'text', group: PR },

	// Regional office
	{
		key: 'rrdc.name',
		label: 'Regional Resource Development Center (RRDC)',
		type: 'text',
		group: R
	},
	{ key: 'rrdc.region', label: 'Region', type: 'text', group: R },
	{
		key: 'rrds.name',
		label: 'Regional Resource Development Specialist (RRDS)',
		type: 'text',
		group: R
	},
	{ key: 'rrds.title', label: 'RRDS title', type: 'text', group: R, optional: true },
	{
		key: 'intake.referralNumber',
		label: 'Referral number',
		type: 'text',
		group: R,
		optional: true
	},
	{
		key: 'intake.interviewDate',
		label: 'Date of intake interview with the RRDS',
		type: 'date',
		group: R
	},

	// Supports
	{
		key: 'supports.informal',
		label: 'Informal supports (family, friends, community)',
		type: 'table',
		group: SU,
		rows: 6,
		columns: [
			{ id: 'name', label: 'Name' },
			{ id: 'relationship', label: 'Relationship' },
			{ id: 'phone', label: 'Phone', type: 'phone' },
			{ id: 'support', label: 'Support provided' }
		]
	},

	// Services
	{
		key: 'services',
		label: 'Waiver services',
		type: 'table',
		group: SV,
		rows: 10,
		columns: [
			{
				id: 'type',
				label: 'Service',
				type: 'select',
				options: [
					'Service Coordination',
					'Independent Living Skills Training (ILST)',
					'Structured Day Program',
					'Positive Behavioral Interventions and Supports (PBIS)',
					'Community Integration Counseling (CIC)',
					'Home and Community Support Services (HCSS)',
					'Respite',
					'Substance Abuse Program',
					'Environmental Modifications (E-Mods)',
					'Assistive Technology',
					'Community Transitional Services (CTS)',
					'Transportation',
					'Other'
				]
			},
			{ id: 'provider', label: 'Provider' },
			{ id: 'units', label: 'Units / hours per week' },
			{ id: 'cost', label: 'Annual cost', type: 'money' }
		]
	},
	{
		key: 'services.statePlan',
		label: 'Medicaid State Plan and other services',
		type: 'table',
		group: SV,
		rows: 8,
		columns: [
			{ id: 'type', label: 'Service' },
			{ id: 'provider', label: 'Provider' },
			{ id: 'frequency', label: 'Frequency' }
		]
	},

	// Incident
	{
		key: 'incident.number',
		label: 'Incident number (from RRDC)',
		type: 'text',
		group: I,
		optional: true
	},
	{ key: 'incident.occurredDate', label: 'Date of incident', type: 'date', group: I },
	{ key: 'incident.occurredTime', label: 'Time of incident', type: 'time', group: I },
	{ key: 'incident.discoveredDate', label: 'Date discovered', type: 'date', group: I },
	{ key: 'incident.discoveredTime', label: 'Time discovered', type: 'time', group: I },
	{ key: 'incident.location', label: 'Where it happened', type: 'text', group: I },
	{
		key: 'incident.category',
		label: 'Type of incident',
		type: 'select',
		group: I,
		options: [
			'Abuse',
			'Neglect',
			'Exploitation',
			'Unexpected or unexplained death',
			'Missing person',
			'Hospitalization (unplanned)',
			'Injury requiring medical treatment',
			'Medication error',
			'Police involvement / arrest',
			'Suicide attempt',
			'Other'
		]
	},
	{ key: 'incident.description', label: 'What happened', type: 'longtext', group: I },
	{ key: 'incident.actionsTaken', label: 'Immediate actions taken', type: 'longtext', group: I },
	{ key: 'incident.reporter.name', label: 'Person completing the report', type: 'text', group: I },
	{ key: 'incident.reporter.title', label: 'Their title', type: 'text', group: I },
	{ key: 'incident.reporter.phone', label: 'Their phone', type: 'phone', group: I }
];
