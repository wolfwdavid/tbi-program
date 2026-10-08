import type { CaseData, Role } from './types.ts';

// Case files hold protected health information, so they are always encrypted:
// AES-256-GCM with a key derived from the user's passphrase (PBKDF2-SHA-256).
// Nothing is stored in the browser; the user keeps the file.

export interface CaseState {
	data: CaseData;
	role: Role | null;
	/** Form ids the user chose to include. */
	selected: string[];
}

interface Envelope {
	format: 'tbicase';
	version: 1;
	kdf: { name: 'PBKDF2'; hash: 'SHA-256'; iterations: number; salt: string };
	cipher: { name: 'AES-GCM'; iv: string };
	payload: string;
}

const ITERATIONS = 600_000;
export const MIN_PASSPHRASE = 10;

function toB64(bytes: Uint8Array) {
	let s = '';
	for (let i = 0; i < bytes.length; i += 0x8000)
		s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	return btoa(s);
}
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number) {
	const base = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(passphrase),
		'PBKDF2',
		false,
		['deriveKey']
	);
	return crypto.subtle.deriveKey(
		{ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
		base,
		{ name: 'AES-GCM', length: 256 },
		false,
		['encrypt', 'decrypt']
	);
}

export async function encryptCase(state: CaseState, passphrase: string): Promise<string> {
	if (passphrase.length < MIN_PASSPHRASE) {
		throw new Error(`Use a passphrase of at least ${MIN_PASSPHRASE} characters.`);
	}
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const key = await deriveKey(passphrase, salt, ITERATIONS);
	const plain = new TextEncoder().encode(
		JSON.stringify({ ...state, savedAt: new Date().toISOString() })
	);
	const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));
	const envelope: Envelope = {
		format: 'tbicase',
		version: 1,
		kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: ITERATIONS, salt: toB64(salt) },
		cipher: { name: 'AES-GCM', iv: toB64(iv) },
		payload: toB64(sealed)
	};
	return JSON.stringify(envelope);
}

export async function decryptCase(file: string, passphrase: string): Promise<CaseState> {
	let env: Envelope;
	try {
		env = JSON.parse(file);
	} catch {
		throw new Error('This is not a TBI case file.');
	}
	if (env?.format !== 'tbicase' || env.version !== 1)
		throw new Error('This is not a TBI case file.');
	const key = await deriveKey(passphrase, fromB64(env.kdf.salt), env.kdf.iterations);
	let plain: ArrayBuffer;
	try {
		plain = await crypto.subtle.decrypt(
			{ name: 'AES-GCM', iv: fromB64(env.cipher.iv) as BufferSource },
			key,
			fromB64(env.payload) as BufferSource
		);
	} catch {
		throw new Error('Wrong passphrase, or the file is damaged.');
	}
	const state = JSON.parse(new TextDecoder().decode(plain));
	return { data: state.data ?? {}, role: state.role ?? null, selected: state.selected ?? [] };
}
