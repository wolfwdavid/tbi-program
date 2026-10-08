import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { decryptCase, encryptCase } from './casefile.ts';
import { doh5729 } from './defs/doh-5729.ts';
import { buildPacket, fillForm, wrap } from './fill.ts';
import type { FormDef } from './types.ts';
import {
	completeness,
	formatDate,
	formatMoney,
	formatTime,
	questionIndex,
	rowCount
} from './values.ts';

const load = (file: string) => readFile(path.join('static', 'forms', file));

describe('formatting', () => {
	it('formats dates, times and money for print', () => {
		expect(formatDate('2026-10-08')).toBe('10/08/2026');
		expect(formatDate('next week')).toBe('next week');
		expect(formatTime('00:05')).toBe('12:05 AM');
		expect(formatTime('19:40')).toBe('7:40 PM');
		expect(formatMoney('18720')).toBe('$18,720.00');
		expect(formatMoney('')).toBe('');
	});

	it('counts table rows by the last filled row', () => {
		expect(
			rowCount(
				{ 'services.0.type': 'A', 'services.3.cost': '5', 'services.4.type': '' },
				'services'
			)
		).toBe(4);
		expect(rowCount({}, 'services')).toBe(0);
	});
});

describe('wrap', () => {
	it('wraps words, keeps newlines and splits words longer than a line', async () => {
		const font = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
		const lines = wrap('alpha beta gamma\ndelta ' + 'x'.repeat(80), font, 10, 60);
		expect(lines[0]).toBe('alpha beta');
		expect(lines).toContain('gamma');
		expect(lines).toContain('delta');
		for (const l of lines) expect(font.widthOfTextAtSize(l, 10)).toBeLessThanOrEqual(60);
	});
});

describe('fillForm', () => {
	const data = {
		'participant.name': 'Jordan Rivera',
		'participant.cin': 'AB12345C',
		'participant.dob': '1984-03-17',
		'doh-5729.medicaidStatus': 'Medicaid application is pending'
	};

	it('fills AcroForm fields with formatted values and checks boxes', async () => {
		const { doc, missingFields, overflow } = await fillForm(doh5729, data, load);
		expect(missingFields).toEqual([]);
		expect(overflow).toEqual([]);
		const form = doc.getForm();
		expect(form.getTextField('Applicant Name').getText()).toBe('Jordan Rivera');
		expect(form.getTextField('Date of Birth').getText()).toBe('03/17/1984');
		expect(form.getCheckBox('TBI box').isChecked()).toBe(true);
		expect(form.getCheckBox('Medicaid application is pending').isChecked()).toBe(true);
		expect(form.getCheckBox('Not enrolled in Medicaid').isChecked()).toBe(false);
	});

	it('reports field names the PDF does not have', async () => {
		const broken: FormDef = {
			...doh5729,
			fields: [{ src: 'participant.name', to: { acro: 'No Such Field' } }]
		};
		const { missingFields } = await fillForm(broken, data, load);
		expect(missingFields).toEqual(['No Such Field']);
	});

	it('moves text that does not fit to a continuation page instead of cutting it', async () => {
		const long = 'word '.repeat(200).trim();
		const { doc, overflow } = await fillForm(
			doh5729,
			{ ...data, 'participant.address': long },
			load
		);
		expect(overflow).toHaveLength(1);
		expect(overflow[0].text).toBe(long);
		expect(doc.getPageCount()).toBe(6); // 5 form pages + 1 continuation
		expect(doc.getForm().getTextField('Current Residence').getText()).toMatch(/\(cont\.\)$/);
	});

	it('draws overlay text and marks on flat pages', async () => {
		const flat: FormDef = {
			...doh5729,
			fields: [
				{ src: 'participant.name', to: { page: 1, x: 72, y: 700 } },
				{ src: () => true, to: { page: 1, x: 72, y: 680, mark: true } },
				{
					src: 'doh-5729.notes',
					label: 'Notes',
					to: { page: 1, x: 72, y: 660, maxWidth: 100, lines: 2 }
				}
			]
		};
		const { doc, overflow } = await fillForm(
			flat,
			{
				...data,
				'doh-5729.notes': 'one two three four five six seven eight nine ten eleven twelve thirteen'
			},
			load
		);
		expect(overflow.map((o) => o.label)).toEqual(['Notes']);
		expect(doc.getPageCount()).toBe(6);
	});

	it('replaces characters the PDF font cannot encode', async () => {
		const { doc } = await fillForm(doh5729, { ...data, 'participant.name': 'Zoë 李 🙂' }, load);
		expect(doc.getForm().getTextField('Applicant Name').getText()).toBe('Zoë ? ?');
	});
});

describe('completeness', () => {
	it('counts required answers only', () => {
		const index = questionIndex([doh5729]);
		expect(completeness(doh5729, {}, index)).toBe(0);
		const full = {
			'participant.name': 'a',
			'participant.cin': 'b',
			'participant.dob': '2000-01-01',
			'participant.address': 'c',
			'participant.phone': 'd',
			'intake.interviewDate': '2026-01-01',
			'doh-5729.medicaidStatus': 'Enrolled',
			'rrds.name': 'e'
		};
		expect(completeness(doh5729, full, index)).toBe(1);
	});
});

describe('buildPacket', () => {
	it('merges filled forms into one flattened PDF', async () => {
		const { bytes } = await buildPacket([doh5729, doh5729], { 'participant.name': 'A' }, load);
		const merged = await PDFDocument.load(bytes);
		expect(merged.getPageCount()).toBe(10);
		expect(merged.getForm().getFields()).toHaveLength(0);
	});
});

describe('case file', () => {
	const state = {
		data: { 'participant.name': 'Jordan', 'participant.ssn': '000-00-0000' },
		role: 'sc' as const,
		selected: ['doh-5729']
	};

	it('round-trips with the right passphrase and never contains plaintext', async () => {
		const file = await encryptCase(state, 'correct horse battery');
		expect(file).not.toContain('Jordan');
		expect(file).not.toContain('000-00-0000');
		expect(await decryptCase(file, 'correct horse battery')).toEqual(state);
	});

	it('rejects a wrong passphrase, a short passphrase and non-case files', async () => {
		const file = await encryptCase(state, 'correct horse battery');
		await expect(decryptCase(file, 'wrong passphrase!')).rejects.toThrow(/Wrong passphrase/);
		await expect(encryptCase(state, 'short')).rejects.toThrow(/at least/);
		await expect(decryptCase('{"hello":1}', 'whatever123')).rejects.toThrow(/not a TBI case file/);
	});
});
