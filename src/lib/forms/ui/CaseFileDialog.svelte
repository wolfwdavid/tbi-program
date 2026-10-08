<script lang="ts">
	import X from '@lucide/svelte/icons/x';
	import { MIN_PASSPHRASE } from '../casefile.ts';

	let {
		mode,
		open = $bindable(false),
		onsave,
		onopen
	}: {
		mode: 'save' | 'open';
		open?: boolean;
		onsave: (passphrase: string) => Promise<void>;
		onopen: (file: File, passphrase: string) => Promise<void>;
	} = $props();

	let dialog: HTMLDialogElement;
	let passphrase = $state('');
	let confirm = $state('');
	let file = $state<File | null>(null);
	let error = $state('');
	let busy = $state(false);

	$effect(() => {
		if (open && !dialog.open) {
			passphrase = confirm = error = '';
			file = null;
			dialog.showModal();
		} else if (!open && dialog.open) dialog.close();
	});

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		if (mode === 'save') {
			if (passphrase.length < MIN_PASSPHRASE)
				return (error = `Use at least ${MIN_PASSPHRASE} characters.`);
			if (passphrase !== confirm) return (error = 'The two passphrases do not match.');
		} else if (!file) return (error = 'Choose a case file.');
		busy = true;
		try {
			if (mode === 'save') await onsave(passphrase);
			else await onopen(file!, passphrase);
			open = false;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong.';
		} finally {
			busy = false;
		}
	}
</script>

<dialog bind:this={dialog} onclose={() => (open = false)} aria-labelledby="cf-title">
	<form onsubmit={submit} novalidate>
		<header>
			<h2 id="cf-title">{mode === 'save' ? 'Save encrypted case file' : 'Open a case file'}</h2>
			<button type="button" class="close" aria-label="Close" onclick={() => (open = false)}>
				<X size={20} />
			</button>
		</header>

		{#if mode === 'save'}
			<p>
				The file is locked with your passphrase. Without it, nobody can read the file, including
				you, so store the passphrase safely and separately from the file.
			</p>
		{:else}
			<label class="field">
				<span>Case file (.tbicase)</span>
				<input
					type="file"
					accept=".tbicase,application/json"
					onchange={(e) => (file = e.currentTarget.files?.[0] ?? null)}
				/>
			</label>
		{/if}

		<label class="field">
			<span>Passphrase</span>
			<input
				type="password"
				bind:value={passphrase}
				autocomplete={mode === 'save' ? 'new-password' : 'current-password'}
			/>
		</label>
		{#if mode === 'save'}
			<label class="field">
				<span>Type it again</span>
				<input type="password" bind:value={confirm} autocomplete="new-password" />
			</label>
		{/if}

		<p class="error" role="alert">{error}</p>

		<div class="actions">
			<button type="button" class="btn secondary" onclick={() => (open = false)}>Cancel</button>
			<button type="submit" class="btn primary" disabled={busy}>
				{busy ? 'Working…' : mode === 'save' ? 'Save file' : 'Open'}
			</button>
		</div>
	</form>
</dialog>

<style>
	dialog {
		width: min(28rem, calc(100vw - 2rem));
		padding: 0;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--text);
		box-shadow: var(--shadow-hover);
	}
	dialog::backdrop {
		background: rgb(0 0 0 / 0.5);
	}
	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.5rem;
	}
	header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}
	h2 {
		font-size: 1.25rem;
	}
	p {
		color: var(--text-muted);
		font-size: 0.9375rem;
	}
	.close {
		flex-shrink: 0;
		width: 44px;
		height: 44px;
		margin: -0.625rem -0.625rem 0 0;
		display: grid;
		place-items: center;
		border: 0;
		border-radius: var(--radius-sm);
		background: none;
		color: var(--text-muted);
		cursor: pointer;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		font-weight: 600;
		font-size: 0.9375rem;
	}
	.field input {
		min-height: 44px;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-sm);
		background: var(--surface);
		color: var(--text);
		font: inherit;
		font-weight: 400;
	}
	.error {
		min-height: 1.25rem;
		color: var(--danger);
		font-weight: 600;
	}
	.error:empty {
		display: none;
	}
	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
	}
</style>
