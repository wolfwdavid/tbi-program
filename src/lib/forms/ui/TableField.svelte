<script lang="ts">
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import type { CaseStore } from '../case.svelte.ts';
	import type { Question } from '../types.ts';
	import { cell, rowCount } from '../values.ts';

	let { q, store }: { q: Question; store: CaseStore } = $props();

	const cols = $derived(q.columns ?? []);
	const max = $derived(q.rows ?? 10);
	const filled = $derived(rowCount(store.data, q.key, max));
	let shown = $state(0);
	const rows = $derived(Math.min(max, Math.max(filled, shown, 1)));
	const id = $derived(`t-${q.key.replace(/[^a-z0-9]+/gi, '-')}`);

	const val = (r: number, c: string) => {
		const v = store.get(cell(q.key, r, c));
		return typeof v === 'string' ? v : '';
	};

	/** Remove a row and shift the ones below it up, so the printed table has no gaps. */
	function removeRow(r: number) {
		for (let i = r; i < rows; i++) {
			for (const c of cols) store.set(cell(q.key, i, c.id), i + 1 < rows ? val(i + 1, c.id) : '');
		}
		shown = Math.max(1, rows - 1);
	}

	const inputType = (t?: string) =>
		t === 'date' ? 'date' : t === 'time' ? 'time' : t === 'phone' ? 'tel' : 'text';
</script>

<fieldset class="table" aria-describedby={q.help ? `${id}-help` : undefined}>
	<legend>{q.label}</legend>
	{#if q.help}<p class="help" id="{id}-help">{q.help}</p>{/if}

	<div class="grid" style="--cols: {cols.length}">
		<div class="head" aria-hidden="true">
			{#each cols as c (c.id)}<span>{c.label}</span>{/each}
			<span></span>
		</div>
		{#each { length: rows }, r (r)}
			<div class="row">
				<span class="row-label">Row {r + 1}</span>
				{#each cols as c (c.id)}
					<label class="cell">
						<span class="cell-label">{c.label}</span>
						{#if c.type === 'select'}
							<select
								value={val(r, c.id)}
								aria-label="{c.label}, row {r + 1}"
								onchange={(e) => store.set(cell(q.key, r, c.id), e.currentTarget.value)}
							>
								<option value="">Choose…</option>
								{#each c.options ?? [] as opt (opt)}<option value={opt}>{opt}</option>{/each}
							</select>
						{:else}
							<input
								type={inputType(c.type)}
								inputmode={c.type === 'money' || c.type === 'number' ? 'decimal' : undefined}
								value={val(r, c.id)}
								aria-label="{c.label}, row {r + 1}"
								autocomplete="off"
								oninput={(e) => store.set(cell(q.key, r, c.id), e.currentTarget.value)}
							/>
						{/if}
					</label>
				{/each}
				<button
					type="button"
					class="icon-btn"
					aria-label="Remove row {r + 1}"
					onclick={() => removeRow(r)}
					disabled={rows === 1 && cols.every((c) => !val(0, c.id))}
				>
					<Trash2 size={18} />
				</button>
			</div>
		{/each}
	</div>

	{#if rows < max}
		<button type="button" class="add" onclick={() => (shown = rows + 1)}>
			<Plus size={18} /> Add row
		</button>
	{:else}
		<p class="help">The printed form has room for {max} rows.</p>
	{/if}
</fieldset>

<style>
	.table {
		grid-column: 1 / -1;
		margin: 0;
		padding: 0;
		border: 0;
		min-width: 0;
	}
	legend {
		padding: 0;
		font-weight: 600;
		font-size: 0.9375rem;
	}
	.help {
		margin-top: 0.25rem;
		font-size: 0.875rem;
		color: var(--text-muted);
	}
	.grid {
		margin-top: 0.5rem;
		display: grid;
		gap: 0.5rem;
	}
	.head,
	.row {
		display: grid;
		grid-template-columns: repeat(var(--cols), minmax(0, 1fr)) 44px;
		gap: 0.5rem;
		align-items: center;
	}
	.head span {
		font-size: 0.8125rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-muted);
	}
	.row-label,
	.cell-label {
		display: none;
	}
	input,
	select {
		width: 100%;
		min-height: 44px;
		padding: 0.5rem 0.625rem;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-sm);
		background: var(--surface);
		color: var(--text);
		font: inherit;
		font-size: 1rem;
	}
	input:focus-visible,
	select:focus-visible {
		outline: none;
		border-color: var(--ring);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--ring) 30%, transparent);
	}
	.icon-btn {
		width: 44px;
		height: 44px;
		display: grid;
		place-items: center;
		border: 0;
		border-radius: var(--radius-sm);
		background: none;
		color: var(--text-muted);
		cursor: pointer;
	}
	.icon-btn:hover:not(:disabled) {
		background: var(--surface-soft);
		color: var(--danger);
	}
	.icon-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.add {
		margin-top: 0.5rem;
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		min-height: 44px;
		padding: 0 1rem;
		border: 1px dashed var(--border-strong);
		border-radius: var(--radius-sm);
		background: none;
		color: var(--primary);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}
	.add:hover {
		background: var(--primary-soft);
	}

	/* Phones: each row becomes a small card with labeled inputs. */
	@media (max-width: 767px) {
		.head {
			display: none;
		}
		.row {
			grid-template-columns: 1fr 44px;
			padding: 0.75rem;
			border: 1px solid var(--border);
			border-radius: var(--radius-sm);
			background: var(--surface-soft);
		}
		.row-label {
			display: block;
			grid-column: 1;
			font-weight: 700;
			font-size: 0.875rem;
		}
		.row .icon-btn {
			grid-column: 2;
			grid-row: 1;
		}
		.cell {
			grid-column: 1 / -1;
			display: flex;
			flex-direction: column;
			gap: 0.25rem;
		}
		.cell-label {
			display: block;
			font-size: 0.8125rem;
			font-weight: 600;
			color: var(--text-muted);
		}
	}
</style>
