import type { CaseState } from './casefile.ts';
import type { Answer, CaseData, Role } from './types.ts';

/** The open case. Lives in memory only; see casefile.ts for saving. */
export class CaseStore {
	data = $state<CaseData>({});
	role = $state<Role | null>(null);
	selected = $state<string[]>([]);
	/** True when there are changes that haven't been saved to a case file. */
	dirty = $state(false);

	get(key: string): Answer | undefined {
		return this.data[key];
	}

	set(key: string, value: Answer) {
		if (value === '' || value === false) delete this.data[key];
		else this.data[key] = value;
		this.dirty = true;
	}

	toggle(formId: string, on: boolean) {
		this.selected = on
			? [...new Set([...this.selected, formId])]
			: this.selected.filter((id) => id !== formId);
		this.dirty = true;
	}

	snapshot(): CaseState {
		return { data: $state.snapshot(this.data), role: this.role, selected: [...this.selected] };
	}

	load(state: CaseState) {
		this.data = { ...state.data };
		this.role = state.role;
		this.selected = [...state.selected];
		this.dirty = false;
	}

	clear() {
		this.load({ data: {}, role: null, selected: [] });
	}
}
