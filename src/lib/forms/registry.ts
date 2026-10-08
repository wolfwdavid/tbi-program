import type { FormDef, Role, Stage } from './types.ts';
import { doh5725 } from './defs/doh-5725.ts';
import { doh5727 } from './defs/doh-5727.ts';
import { doh5728 } from './defs/doh-5728.ts';
import { doh5729 } from './defs/doh-5729.ts';
import { doh5730 } from './defs/doh-5730.ts';
import { doh5731 } from './defs/doh-5731.ts';
import { doh5732 } from './defs/doh-5732.ts';
import { doh5750 } from './defs/doh-5750.ts';
import { doh5726 } from './defs/doh-5726.ts';
import { doh5752 } from './defs/doh-5752.ts';
import { doh5753 } from './defs/doh-5753.ts';
import { doh5755 } from './defs/doh-5755.ts';
import { tbiC13 } from './defs/tbi-c1-3.ts';
import { tbiC15 } from './defs/tbi-c1-5.ts';
import { tbiC42 } from './defs/tbi-c4-2.ts';
import { tbiC46 } from './defs/tbi-c4-6.ts';
import { sri24hr } from './defs/sri-24hr.ts';
import { sriFollowUp } from './defs/sri-follow-up.ts';
import { tbiC41 } from './defs/tbi-c4-1.ts';
import { tbiC43 } from './defs/tbi-c4-3.ts';

export const STAGES: { id: Stage; title: string; blurb: string }[] = [
	{
		id: 'intake',
		title: 'Intake and application',
		blurb: 'Signed at or soon after the intake meeting with the RRDS.'
	},
	{
		id: 'plan',
		title: 'Initial service plan',
		blurb: 'The application packet the service coordinator sends to the RRDC.'
	},
	{
		id: 'ongoing',
		title: 'Ongoing: reviews and changes',
		blurb: 'Revised plans, addendums, team meetings, progress reports and changes of agency.'
	},
	{
		id: 'incident',
		title: 'Serious reportable incidents',
		blurb: 'Provider reports to the RRDC. The 24-hour report is due within 24 hours.'
	}
];

/** Every supported form, in the order they appear in the program. */
export const FORMS: FormDef[] = [
	// Intake
	doh5725,
	doh5729,
	doh5728,
	doh5727,
	doh5730,
	doh5732,
	// Initial service plan
	doh5726,
	tbiC13,
	tbiC15,
	doh5752,
	doh5753,
	doh5755,
	// Ongoing
	tbiC41,
	tbiC43,
	tbiC42,
	tbiC46,
	doh5731,
	doh5750,
	// Incidents
	sri24hr,
	sriFollowUp
];

export const formById = new Map(FORMS.map((f) => [f.id, f]));

/** Forms pre-selected for a new case, by role. */
export function defaultSelection(role: Role): string[] {
	const stages: Stage[] = role === 'sc' ? ['intake', 'plan'] : ['incident'];
	return FORMS.filter((f) => f.roles.includes(role) && stages.includes(f.stage)).map((f) => f.id);
}
