// Core types for the TBI forms assistant.
//
// A case is a flat map of answers keyed by dotted paths ("participant.cin").
// Shared keys live in questions.ts; a form's own one-off questions are keyed
// "<formId>.<name>" and declared on the form itself.

export type Role = 'sc' | 'provider';

export type Stage = 'intake' | 'plan' | 'ongoing' | 'incident';

export type QuestionType =
	| 'text'
	| 'longtext'
	| 'date'
	| 'time'
	| 'phone'
	| 'number'
	| 'money'
	| 'checkbox'
	| 'select'
	| 'table';

export interface Column {
	id: string;
	label: string;
	type?: Exclude<QuestionType, 'table' | 'longtext'>;
	options?: string[];
}

export interface Question {
	/** Dotted key. Table questions are a prefix: rows are stored as `${key}.${row}.${column}`. */
	key: string;
	label: string;
	type: QuestionType;
	/** Heading the wizard groups this question under. */
	group: string;
	help?: string;
	options?: string[];
	/** Hidden by default in the UI and never shown in previews (e.g. SSN). */
	sensitive?: boolean;
	/** Not counted toward a form's completeness (checkboxes, "if applicable" fields). */
	optional?: boolean;
	/** For type 'table'. */
	columns?: Column[];
	rows?: number;
}

export type Answer = string | boolean;
export type CaseData = Record<string, Answer>;
export type Value = string | boolean | undefined | null;

/** Fill an AcroForm field by name (text, checkbox, radio or dropdown). */
export interface AcroTarget {
	acro: string;
	/** Radio/dropdown option to select when the value is truthy (defaults to the value itself). */
	option?: string;
}

/**
 * Draw text on the page. Coordinates are PDF points in the page's unrotated user space,
 * origin bottom-left; `y` is the text baseline.
 */
export interface TextTarget {
	page: number;
	x: number;
	y: number;
	size?: number;
	/** Wrap width in points. Defaults to the space left on the page. */
	maxWidth?: number;
	/** Max lines that fit here; extra text goes to a continuation page. Default 1. */
	lines?: number;
	lineHeight?: number;
	/** Rotation in degrees for text on landscape (rotated) pages. */
	rotate?: number;
}

/** Draw an "X" when the value is truthy (checkbox printed on a flat form). */
export interface MarkTarget {
	page: number;
	x: number;
	y: number;
	mark: true;
	size?: number;
}

export type Target = AcroTarget | TextTarget | MarkTarget;

export interface FieldDef {
	/** A question key, or a function computing the value from the case. */
	src: string | ((d: CaseData) => Value);
	to: Target | Target[];
	/** Label used on continuation pages. Defaults to the question label. */
	label?: string;
	/** Keys a computed field depends on (counted toward completeness). */
	needs?: string[];
}

export interface FormDef {
	id: string;
	/** Official code, e.g. "DOH-5729" or "TBI C-4.1". */
	code: string;
	title: string;
	/** File name under static/forms. */
	file: string;
	/** Revision printed on the form, e.g. "12/20". */
	revision: string;
	sourceUrl: string;
	/** 2009 form with no current DOH version found. */
	legacy2009?: boolean;
	stage: Stage;
	roles: Role[];
	/** Who signs by hand after printing. */
	signers: string[];
	/** When the form is used and its deadline, from the 2025 program manual. */
	when: string;
	questions?: Question[];
	fields: FieldDef[];
	/** Text fields the blank PDF ships with a default value in, to empty before filling. */
	clearFields?: string[];
}

export interface Overflow {
	label: string;
	text: string;
}
