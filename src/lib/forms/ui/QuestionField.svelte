<script lang="ts">
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import type { CaseStore } from '../case.svelte.ts';
	import type { Question } from '../types.ts';
	import TableField from './TableField.svelte';

	let { q, store }: { q: Question; store: CaseStore } = $props();

	const id = $derived(`q-${q.key.replace(/[^a-z0-9]+/gi, '-')}`);
	const value = $derived(store.get(q.key));
	const text = $derived(typeof value === 'string' ? value : '');
	let reveal = $state(false);

	const inputType = $derived(
		q.type === 'date'
			? 'date'
			: q.type === 'time'
				? 'time'
				: q.type === 'phone'
					? 'tel'
					: q.sensitive && !reveal
						? 'password'
						: 'text'
	);
	const inputMode = $derived(
		q.type === 'number' ? 'numeric' : q.type === 'money' ? 'decimal' : undefined
	);
</script>

{#if q.type === 'table'}
	<TableField {q} {store} />
{:else if q.type === 'checkbox'}
	<div class="field check">
		<input
			{id}
			type="checkbox"
			checked={value === true}
			onchange={(e) => store.set(q.key, e.currentTarget.checked)}
		/>
		<label for={id}>{q.label}</label>
		{#if q.help}<p class="help" id="{id}-help">{q.help}</p>{/if}
	</div>
{:else}
	<div class="field" class:wide={q.type === 'longtext'}>
		<label for={id}>
			{q.label}
			{#if q.optional}<span class="opt">optional</span>{/if}
		</label>
		{#if q.type === 'longtext'}
			<textarea
				{id}
				rows="4"
				value={text}
				aria-describedby={q.help ? `${id}-help` : undefined}
				oninput={(e) => store.set(q.key, e.currentTarget.value)}></textarea>
		{:else if q.type === 'select'}
			<select
				{id}
				value={text}
				aria-describedby={q.help ? `${id}-help` : undefined}
				onchange={(e) => store.set(q.key, e.currentTarget.value)}
			>
				<option value="">Choose…</option>
				{#each q.options ?? [] as opt (opt)}
					<option value={opt}>{opt}</option>
				{/each}
			</select>
		{:else}
			<div class="input-wrap">
				{#if q.type === 'money'}<span class="prefix" aria-hidden="true">$</span>{/if}
				<input
					{id}
					type={inputType}
					inputmode={inputMode}
					value={text}
					class:has-prefix={q.type === 'money'}
					class:has-toggle={q.sensitive}
					autocomplete="off"
					spellcheck={q.sensitive ? false : undefined}
					aria-describedby={q.help ? `${id}-help` : undefined}
					oninput={(e) => store.set(q.key, e.currentTarget.value)}
				/>
				{#if q.sensitive}
					<button
						type="button"
						class="toggle"
						aria-label={reveal ? `Hide ${q.label}` : `Show ${q.label}`}
						aria-pressed={reveal}
						onclick={() => (reveal = !reveal)}
					>
						{#if reveal}<EyeOff size={18} />{:else}<Eye size={18} />{/if}
					</button>
				{/if}
			</div>
		{/if}
		{#if q.help}<p class="help" id="{id}-help">{q.help}</p>{/if}
	</div>
{/if}

<style>
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}
	.wide {
		grid-column: 1 / -1;
	}
	label {
		font-weight: 600;
		font-size: 0.9375rem;
	}
	.opt {
		margin-left: 0.375rem;
		font-weight: 500;
		font-size: 0.8125rem;
		color: var(--text-muted);
	}
	input:not([type='checkbox']),
	select,
	textarea {
		width: 100%;
		min-height: 44px;
		padding: 0.625rem 0.75rem;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-sm);
		background: var(--surface);
		color: var(--text);
		font: inherit;
		font-size: 1rem;
		transition:
			border-color 150ms var(--ease),
			box-shadow 150ms var(--ease);
	}
	textarea {
		resize: vertical;
		line-height: 1.5;
	}
	input:focus-visible,
	select:focus-visible,
	textarea:focus-visible {
		outline: none;
		border-color: var(--ring);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--ring) 30%, transparent);
	}
	.input-wrap {
		position: relative;
	}
	.prefix {
		position: absolute;
		left: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		color: var(--text-muted);
	}
	.has-prefix {
		padding-left: 1.5rem !important;
	}
	.has-toggle {
		padding-right: 3rem !important;
	}
	.toggle {
		position: absolute;
		right: 0;
		top: 0;
		width: 44px;
		height: 44px;
		display: grid;
		place-items: center;
		border: 0;
		background: none;
		color: var(--text-muted);
		cursor: pointer;
		border-radius: var(--radius-sm);
	}
	.help {
		font-size: 0.875rem;
		color: var(--text-muted);
	}
	.check {
		flex-direction: row;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
		min-height: 44px;
	}
	.check input {
		width: 1.25rem;
		height: 1.25rem;
		accent-color: var(--primary);
		cursor: pointer;
	}
	.check label {
		cursor: pointer;
	}
	.check .help {
		flex-basis: 100%;
	}
</style>
