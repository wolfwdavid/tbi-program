import { sharedQuestions } from './questions.ts';
import type { FormDef, Question } from './types.ts';
import { formQuestionKeys } from './values.ts';

export interface Step {
	id: string;
	title: string;
	kind: 'forms' | 'questions' | 'review';
	/** Question sections shown on this step, each under its group heading. */
	sections?: { group: string; questions: Question[] }[];
	/** Set on a form's own step. */
	form?: FormDef;
}

// Shared groups are asked first, clustered into a few steps.
const CLUSTERS: { id: string; title: string; groups: string[] }[] = [
	{
		id: 'participant',
		title: 'About the participant',
		groups: [
			'Participant',
			'Injury and health',
			'Benefits and finances',
			'Guardian and representatives'
		]
	},
	{
		id: 'team',
		title: 'Care team',
		groups: ['Service coordination', 'Waiver service provider', 'Regional office (RRDC / RRDS)']
	},
	{ id: 'services', title: 'Supports and services', groups: ['Supports', 'Services'] },
	{ id: 'incident', title: 'The incident', groups: ['Incident'] }
];

const sharedOrder = new Map(sharedQuestions.map((q, i) => [q.key, i]));
const sharedKeys = new Set(sharedQuestions.map((q) => q.key));

export function buildSteps(forms: FormDef[], index: Map<string, Question>): Step[] {
	const used = new Set(forms.flatMap((f) => formQuestionKeys(f, index)));
	const steps: Step[] = [{ id: 'forms', title: 'Choose forms', kind: 'forms' }];

	for (const c of CLUSTERS) {
		const sections = c.groups
			.map((group) => ({
				group,
				questions: sharedQuestions.filter((q) => q.group === group && used.has(q.key))
			}))
			.filter((s) => s.questions.length > 0);
		if (sections.length) steps.push({ id: c.id, title: c.title, kind: 'questions', sections });
	}

	for (const form of forms) {
		const own = (form.questions ?? []).filter((q) => !sharedKeys.has(q.key));
		if (!own.length) continue;
		const groups = [...new Set(own.map((q) => q.group))];
		steps.push({
			id: `form:${form.id}`,
			title: form.code,
			kind: 'questions',
			form,
			sections: groups.map((group) => ({ group, questions: own.filter((q) => q.group === group) }))
		});
	}

	steps.push({ id: 'review', title: 'Review and download', kind: 'review' });
	return steps;
}

/** Sort key: shared questions in registry order, form questions after them. */
export function questionOrder(key: string): number {
	return sharedOrder.get(key) ?? Number.MAX_SAFE_INTEGER;
}
