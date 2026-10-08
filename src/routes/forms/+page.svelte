<script lang="ts">
	import { tick } from 'svelte';
	import { asset, resolve } from '$app/paths';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import Download from '@lucide/svelte/icons/download';
	import FileStack from '@lucide/svelte/icons/file-stack';
	import FolderOpen from '@lucide/svelte/icons/folder-open';
	import HeartHandshake from '@lucide/svelte/icons/heart-handshake';
	import Lock from '@lucide/svelte/icons/lock';
	import Save from '@lucide/svelte/icons/save';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import UserRound from '@lucide/svelte/icons/user-round';
	import { CaseStore } from '#lib/forms/case.svelte.ts';
	import { decryptCase, encryptCase } from '#lib/forms/casefile.ts';
	import { FORMS, STAGES, defaultSelection } from '#lib/forms/registry.ts';
	import { buildSteps, questionOrder } from '#lib/forms/steps.ts';
	import type { FormDef, Overflow, Role } from '#lib/forms/types.ts';
	import { completeness, isAnswered, questionIndex, requiredKeys } from '#lib/forms/values.ts';
	import CaseFileDialog from '#lib/forms/ui/CaseFileDialog.svelte';
	import QuestionField from '#lib/forms/ui/QuestionField.svelte';

	const store = new CaseStore();
	const index = questionIndex(FORMS);

	const selectedForms = $derived(FORMS.filter((f) => store.selected.includes(f.id)));
	const steps = $derived(buildSteps(selectedForms, index));
	let stepIndex = $state(0);
	const step = $derived(steps[Math.min(stepIndex, steps.length - 1)]);

	let dialogMode = $state<'save' | 'open'>('save');
	let dialogOpen = $state(false);
	let busy = $state<string | null>(null);
	let error = $state('');
	let notice = $state('');
	let overflowNotes = $state<Record<string, Overflow[]>>({});
	let stepHeading = $state<HTMLHeadingElement>();

	const ROLE_LABEL: Record<Role, string> = {
		sc: 'Service coordinator',
		provider: 'Waiver service provider'
	};

	function start(role: Role) {
		store.role = role;
		store.selected = defaultSelection(role);
		store.dirty = false;
		stepIndex = 0;
	}

	async function go(i: number) {
		stepIndex = Math.max(0, Math.min(i, steps.length - 1));
		await tick();
		stepHeading?.focus();
		window.scrollTo({ top: 0 });
	}

	/** Unanswered required questions, each with the step where it is asked. */
	function missing(form: FormDef) {
		return requiredKeys(form, index)
			.filter((k) => !isAnswered(store.data[k]))
			.sort((a, b) => questionOrder(a) - questionOrder(b))
			.map((k) => ({
				key: k,
				label: index.get(k)?.label ?? k,
				step: steps.findIndex((s) =>
					s.sections?.some((sec) => sec.questions.some((q) => q.key === k))
				)
			}));
	}

	/** Go to the step that asks `key` and focus its input. */
	async function answer(key: string, stepAt: number) {
		await go(stepAt);
		document.getElementById(`q-${key.replace(/[^a-z0-9]+/gi, '-')}`)?.focus();
	}

	const pct = (form: FormDef) => Math.round(completeness(form, store.data, index) * 100);

	const loadPdf = async (file: string) => {
		const res = await fetch(asset(`forms/${file}` as Parameters<typeof asset>[0]));
		if (!res.ok) throw new Error(`Could not load the blank form ${file}.`);
		return res.arrayBuffer();
	};

	function saveBlob(bytes: Uint8Array | string, name: string, type: string) {
		const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type }));
		const a = document.createElement('a');
		a.href = url;
		a.download = name;
		a.click();
		setTimeout(() => URL.revokeObjectURL(url), 10_000);
	}

	async function downloadForm(form: FormDef) {
		busy = form.id;
		error = notice = '';
		try {
			const { fillForm } = await import('#lib/forms/fill.ts');
			const { doc, overflow } = await fillForm(form, store.data, loadPdf, { index });
			overflowNotes = { ...overflowNotes, [form.id]: overflow };
			saveBlob(await doc.save(), `${form.code}.pdf`, 'application/pdf');
			notice = `${form.code} downloaded.`;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not create the PDF.';
		} finally {
			busy = null;
		}
	}

	async function downloadPacket() {
		busy = 'packet';
		error = notice = '';
		try {
			const { buildPacket } = await import('#lib/forms/fill.ts');
			const { bytes, overflow } = await buildPacket(selectedForms, store.data, loadPdf, { index });
			overflowNotes = { ...overflowNotes, ...overflow };
			const date = new Date().toISOString().slice(0, 10);
			saveBlob(bytes, `TBI forms packet ${date}.pdf`, 'application/pdf');
			notice = `Packet with ${selectedForms.length} forms downloaded.`;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not create the packet.';
		} finally {
			busy = null;
		}
	}

	async function saveCase(passphrase: string) {
		const file = await encryptCase(store.snapshot(), passphrase);
		saveBlob(file, `case-${new Date().toISOString().slice(0, 10)}.tbicase`, 'application/json');
		store.dirty = false;
		notice = 'Encrypted case file saved.';
	}

	async function openCase(file: File, passphrase: string) {
		store.load(await decryptCase(await file.text(), passphrase));
		if (!store.role) store.role = 'sc';
		stepIndex = 0;
		notice = 'Case file opened.';
	}

	function openDialog(mode: 'save' | 'open') {
		dialogMode = mode;
		dialogOpen = true;
	}

	function newCase() {
		if (store.dirty && !confirm('Start over? Unsaved answers on this page will be cleared.'))
			return;
		store.clear();
		overflowNotes = {};
		notice = error = '';
	}

	$effect(() => {
		const warn = (e: BeforeUnloadEvent) => {
			if (store.dirty) e.preventDefault();
		};
		window.addEventListener('beforeunload', warn);
		return () => window.removeEventListener('beforeunload', warn);
	});
</script>

<svelte:head>
	<title>TBI Forms Assistant</title>
	<meta
		name="description"
		content="Fill New York TBI Waiver forms once. Everything stays on your device."
	/>
	<meta name="robots" content="noindex" />
</svelte:head>

<a class="skip" href="#main">Skip to content</a>

<header class="topbar">
	<div class="topbar-inner">
		<a class="brand" href={resolve('/forms')}>
			<span class="brand-mark" aria-hidden="true"><ClipboardList size={20} /></span>
			TBI Forms
		</a>
		<span class="local-pill" title="Nothing you type leaves this device">
			<Lock size={14} aria-hidden="true" /> On this device only
		</span>
		<div class="top-actions">
			<button class="btn ghost" onclick={() => openDialog('open')}>
				<FolderOpen size={18} aria-hidden="true" /><span class="lbl">Open case</span>
			</button>
			{#if store.role}
				<button class="btn secondary" onclick={() => openDialog('save')}>
					<Save size={18} aria-hidden="true" /><span class="lbl">Save case</span>
					{#if store.dirty}<span class="dot" aria-label="unsaved changes"></span>{/if}
				</button>
			{/if}
		</div>
	</div>
</header>

<div class="status" aria-live="polite">
	{#if error}<p class="msg msg-error" role="alert">
			<TriangleAlert size={18} aria-hidden="true" />{error}
		</p>{/if}
	{#if notice}<p class="msg msg-ok">{notice}</p>{/if}
</div>

<main id="main">
	{#if !store.role}
		<section class="start">
			<p class="eyebrow">New York TBI Waiver</p>
			<h1>Fill the program forms once, not five times.</h1>
			<p class="lede">
				Answer each question one time. The assistant writes your answers onto the official
				Department of Health forms, ready to print and sign.
			</p>

			<h2 class="pick">Who are you filling forms as?</h2>
			<div class="roles">
				<button class="role" onclick={() => start('sc')}>
					<span class="role-icon" aria-hidden="true"><UserRound size={26} /></span>
					<span class="role-title">Service coordinator</span>
					<span class="role-text"
						>Intake forms, the initial service plan and application packet, revised plans and
						changes.</span
					>
				</button>
				<button class="role" onclick={() => start('provider')}>
					<span class="role-icon" aria-hidden="true"><HeartHandshake size={26} /></span>
					<span class="role-title">Waiver service provider</span>
					<span class="role-text"
						>Serious reportable incident reports, follow-ups and individual service reports.</span
					>
				</button>
			</div>
			<p class="or">
				or <button class="link-btn" onclick={() => openDialog('open')}
					>open a saved case file</button
				>
			</p>

			<div class="trust">
				<div>
					<ShieldCheck size={22} aria-hidden="true" />
					<p>
						<strong>Private by design.</strong> Nothing is uploaded or stored. Closing this tab clears
						the case unless you save an encrypted case file.
					</p>
				</div>
				<div>
					<FileStack size={22} aria-hidden="true" />
					<p>
						<strong>Official forms.</strong> Answers go onto the state's own PDFs. Signatures are left
						blank for you to sign by hand.
					</p>
				</div>
			</div>
			<p class="disclaimer">
				This is a fill-in aid, not an official Department of Health tool. You are responsible for
				checking every form before you sign and submit it. Confirm current form versions with your
				RRDS.
			</p>
		</section>
	{:else}
		<div class="wizard">
			<nav class="stepper" aria-label="Steps">
				<p class="role-line">
					{ROLE_LABEL[store.role]} ·
					<button class="link-btn" onclick={newCase}>start over</button>
				</p>
				<ol>
					{#each steps as s, i (s.id)}
						<li>
							<button
								class:current={i === stepIndex}
								aria-current={i === stepIndex ? 'step' : undefined}
								onclick={() => go(i)}
							>
								<span class="num" aria-hidden="true">{i + 1}</span>
								<span>{s.form ? `${s.form.code} details` : s.title}</span>
							</button>
						</li>
					{/each}
				</ol>
				<label class="step-select">
					<span class="visually-hidden">Jump to step</span>
					<select value={stepIndex} onchange={(e) => go(Number(e.currentTarget.value))}>
						{#each steps as s, i (s.id)}
							<option value={i}
								>Step {i + 1} of {steps.length}: {s.form
									? `${s.form.code} details`
									: s.title}</option
							>
						{/each}
					</select>
				</label>
			</nav>

			<section class="step" aria-labelledby="step-title">
				<h1 id="step-title" tabindex="-1" bind:this={stepHeading}>
					{step.form ? `${step.form.code}: ${step.form.title}` : step.title}
				</h1>

				{#if step.kind === 'forms'}
					<p class="step-intro">
						Pick the forms for this case. The next steps only ask what these forms need, and each
						question is asked once.
					</p>
					{#each STAGES as stage (stage.id)}
						{@const forms = FORMS.filter((f) => f.stage === stage.id)}
						{#if forms.length}
							<fieldset class="stage">
								<legend>{stage.title}</legend>
								<p class="stage-blurb">{stage.blurb}</p>
								{#each forms as f (f.id)}
									<label class="form-pick">
										<input
											type="checkbox"
											checked={store.selected.includes(f.id)}
											onchange={(e) => store.toggle(f.id, e.currentTarget.checked)}
										/>
										<span class="pick-body">
											<span class="pick-head">
												<span class="code">{f.code}</span>
												{f.title}
												{#if f.legacy2009}<span class="badge warn"
														>2009 version: confirm with your RRDS</span
													>{/if}
											</span>
											<span class="pick-when">{f.when}</span>
										</span>
									</label>
								{/each}
							</fieldset>
						{/if}
					{/each}
				{:else if step.kind === 'questions'}
					{#if step.form}
						<p class="step-intro">{step.form.when}</p>
					{:else}
						<p class="step-intro">Answers here fill every selected form that asks for them.</p>
					{/if}
					{#each step.sections ?? [] as section (section.group)}
						<fieldset class="section">
							<legend>{section.group}</legend>
							<div class="q-grid">
								{#each section.questions as q (q.key)}
									<QuestionField {q} {store} />
								{/each}
							</div>
						</fieldset>
					{/each}
				{:else}
					<p class="step-intro">
						Download each form or all of them as one packet. Signature lines and their dates are
						left blank so you can sign by hand.
					</p>
					{#if selectedForms.length === 0}
						<p class="empty">
							No forms selected. <button class="link-btn" onclick={() => go(0)}>Choose forms</button
							>
						</p>
					{:else}
						<button
							class="btn primary packet"
							onclick={downloadPacket}
							disabled={busy !== null}
							aria-busy={busy === 'packet'}
						>
							<FileStack size={18} aria-hidden="true" />
							{busy === 'packet'
								? 'Building packet…'
								: `Download all ${selectedForms.length} as one PDF`}
						</button>
						<ul class="review">
							{#each selectedForms as f (f.id)}
								{@const gaps = missing(f)}
								<li class="review-card">
									<div class="review-head">
										<div>
											<p class="code">{f.code}</p>
											<h2>{f.title}</h2>
										</div>
										<button
											class="btn secondary"
											onclick={() => downloadForm(f)}
											disabled={busy !== null}
											aria-busy={busy === f.id}
										>
											<Download size={18} aria-hidden="true" />
											{busy === f.id ? 'Filling…' : 'Download'}
										</button>
									</div>
									<div
										class="meter"
										role="progressbar"
										aria-valuenow={pct(f)}
										aria-valuemin={0}
										aria-valuemax={100}
										aria-label="{f.code} complete"
									>
										<span style="width: {pct(f)}%"></span>
									</div>
									<p class="meter-label">{pct(f)}% of required answers filled</p>
									{#if gaps.length}
										<p class="gaps">
											<strong>Still blank:</strong>
											{gaps.slice(0, 6).join(', ')}{gaps.length > 6
												? `, and ${gaps.length - 6} more`
												: ''}
										</p>
									{/if}
									<p class="signers"><strong>Signed by:</strong> {f.signers.join(', ')}</p>
									{#if overflowNotes[f.id]?.length}
										<p class="cont">
											{overflowNotes[f.id].length} answer{overflowNotes[f.id].length > 1 ? 's' : ''} didn't
											fit and
											{overflowNotes[f.id].length > 1 ? 'were' : 'was'} added on a continuation page:
											{overflowNotes[f.id].map((o) => o.label).join(', ')}.
										</p>
									{/if}
									{#if f.legacy2009}<p class="badge warn">
											2009 version: confirm with your RRDS
										</p>{/if}
								</li>
							{/each}
						</ul>
					{/if}
				{/if}

				<div class="nav-btns">
					{#if stepIndex > 0}
						<button class="btn secondary" onclick={() => go(stepIndex - 1)}>
							<ArrowLeft size={18} aria-hidden="true" /> Back
						</button>
					{/if}
					{#if stepIndex < steps.length - 1}
						<button class="btn primary next" onclick={() => go(stepIndex + 1)}>
							Next: {steps[stepIndex + 1].form
								? `${steps[stepIndex + 1].form?.code} details`
								: steps[stepIndex + 1].title}
							<ArrowRight size={18} aria-hidden="true" />
						</button>
					{/if}
				</div>
			</section>

			<aside class="progress" aria-label="Form progress">
				<h2>Selected forms</h2>
				{#if selectedForms.length === 0}
					<p class="muted">None yet.</p>
				{:else}
					<ul>
						{#each selectedForms as f (f.id)}
							<li>
								<span class="p-code">{f.code}</span>
								<span class="p-bar" aria-hidden="true"><span style="width: {pct(f)}%"></span></span>
								<span class="p-pct">{pct(f)}%</span>
							</li>
						{/each}
					</ul>
				{/if}
				<p class="muted small">
					<Lock size={14} aria-hidden="true" /> Answers stay in this tab. Save an encrypted case file
					to keep them.
				</p>
			</aside>
		</div>
	{/if}
</main>

<CaseFileDialog mode={dialogMode} bind:open={dialogOpen} onsave={saveCase} onopen={openCase} />

<style>
	.skip {
		position: absolute;
		left: -9999px;
		top: 0.5rem;
		z-index: 100;
		padding: 0.75rem 1rem;
		background: var(--surface);
		border-radius: var(--radius-sm);
	}
	.skip:focus {
		left: 1rem;
	}

	/* Top bar */
	.topbar {
		position: sticky;
		top: 0;
		z-index: 40;
		background: color-mix(in srgb, var(--bg) 90%, transparent);
		backdrop-filter: blur(10px);
		border-bottom: 1px solid var(--border);
	}
	.topbar-inner {
		max-width: 80rem;
		margin: 0 auto;
		padding: 0.5rem 1rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.brand {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		min-height: 44px;
		font-family: var(--font-heading);
		font-weight: 700;
		font-size: 1.125rem;
		color: var(--text);
		text-decoration: none;
		white-space: nowrap;
	}
	.brand-mark {
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		border-radius: 10px;
		background: var(--primary);
		color: var(--on-primary);
	}
	.local-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.25rem 0.625rem;
		border-radius: 999px;
		background: var(--accent-soft);
		color: var(--accent);
		font-size: 0.8125rem;
		font-weight: 700;
		white-space: nowrap;
	}
	.top-actions {
		margin-left: auto;
		display: flex;
		gap: 0.5rem;
	}
	.dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		background: var(--warn);
	}
	@media (max-width: 639px) {
		.local-pill,
		.lbl {
			display: none;
		}
		.top-actions .btn {
			padding: 0 0.75rem;
		}
	}

	.status {
		max-width: 80rem;
		margin: 0 auto;
		padding: 0 1rem;
	}
	.msg {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 1rem;
		padding: 0.75rem 1rem;
		border-radius: var(--radius-sm);
		font-weight: 600;
	}
	.msg-error {
		background: var(--danger-soft);
		color: var(--danger);
	}
	.msg-ok {
		background: var(--accent-soft);
		color: var(--accent);
	}

	main {
		max-width: 80rem;
		margin: 0 auto;
		padding: 0 1rem 4rem;
	}

	/* Start screen */
	.start {
		max-width: 48rem;
		margin: 0 auto;
		padding-top: 3rem;
	}
	.eyebrow {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		border-radius: 999px;
		background: var(--primary-soft);
		color: var(--primary);
		font-size: 0.875rem;
		font-weight: 700;
	}
	.start h1 {
		margin-top: 1rem;
		font-size: clamp(2rem, 5vw, 3rem);
	}
	.lede {
		margin-top: 1rem;
		font-size: 1.125rem;
		color: var(--text-muted);
	}
	.pick {
		margin-top: 2.5rem;
		font-size: 1.25rem;
	}
	.roles {
		display: grid;
		gap: 1rem;
		margin-top: 1rem;
	}
	@media (min-width: 640px) {
		.roles {
			grid-template-columns: 1fr 1fr;
		}
	}
	.role {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.5rem;
		padding: 1.5rem;
		border: 2px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--text);
		font: inherit;
		text-align: left;
		cursor: pointer;
		box-shadow: var(--shadow);
		transition:
			border-color 200ms var(--ease),
			box-shadow 200ms var(--ease),
			transform 200ms var(--ease);
	}
	.role:hover {
		border-color: var(--primary);
		box-shadow: var(--shadow-hover);
		transform: translateY(-2px);
	}
	.role-icon {
		display: grid;
		place-items: center;
		width: 3rem;
		height: 3rem;
		border-radius: 14px;
		background: var(--primary-soft);
		color: var(--primary);
	}
	.role-title {
		font-family: var(--font-heading);
		font-size: 1.25rem;
		font-weight: 700;
	}
	.role-text {
		color: var(--text-muted);
	}
	.or {
		margin-top: 1rem;
		color: var(--text-muted);
	}
	.link-btn {
		padding: 0;
		border: 0;
		background: none;
		color: var(--primary);
		font: inherit;
		font-weight: 600;
		text-decoration: underline;
		text-underline-offset: 2px;
		cursor: pointer;
	}
	.trust {
		display: grid;
		gap: 1rem;
		margin-top: 2.5rem;
	}
	@media (min-width: 640px) {
		.trust {
			grid-template-columns: 1fr 1fr;
		}
	}
	.trust div {
		display: flex;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		border-radius: var(--radius);
		background: var(--surface-soft);
	}
	.trust :global(svg) {
		flex-shrink: 0;
		margin-top: 0.125rem;
		color: var(--accent);
	}
	.disclaimer {
		margin-top: 1.5rem;
		font-size: 0.875rem;
		color: var(--text-muted);
	}

	/* Wizard layout */
	.wizard {
		display: grid;
		gap: 1.5rem;
		padding-top: 1.5rem;
	}
	@media (min-width: 1024px) {
		.wizard {
			grid-template-columns: 15rem minmax(0, 1fr) 16rem;
			align-items: start;
		}
		.stepper,
		.progress {
			position: sticky;
			top: 5rem;
		}
	}

	.role-line {
		font-size: 0.875rem;
		color: var(--text-muted);
		margin-bottom: 0.75rem;
	}
	.stepper ol {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.stepper ol button {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		width: 100%;
		min-height: 44px;
		padding: 0.375rem 0.625rem;
		border: 0;
		border-radius: var(--radius-sm);
		background: none;
		color: var(--text-muted);
		font: inherit;
		font-size: 0.9375rem;
		font-weight: 600;
		text-align: left;
		cursor: pointer;
	}
	.stepper ol button:hover {
		background: var(--surface-soft);
		color: var(--text);
	}
	.stepper ol button.current {
		background: var(--primary-soft);
		color: var(--text);
	}
	.num {
		flex-shrink: 0;
		display: grid;
		place-items: center;
		width: 1.625rem;
		height: 1.625rem;
		border-radius: 50%;
		border: 1px solid var(--border-strong);
		font-size: 0.8125rem;
		font-variant-numeric: tabular-nums;
	}
	.current .num {
		background: var(--primary);
		border-color: var(--primary);
		color: var(--on-primary);
	}
	.step-select {
		display: none;
	}
	.step-select select {
		width: 100%;
		min-height: 44px;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-sm);
		background: var(--surface);
		color: var(--text);
		font: inherit;
		font-weight: 600;
	}
	@media (max-width: 1023px) {
		.stepper ol {
			display: none;
		}
		.step-select {
			display: block;
		}
	}

	/* Step content */
	.step h1 {
		font-size: clamp(1.5rem, 3vw, 2rem);
	}
	.step h1:focus {
		outline: none;
	}
	.step-intro {
		margin-top: 0.5rem;
		color: var(--text-muted);
		max-width: 65ch;
	}
	.section,
	.stage {
		margin: 1.5rem 0 0;
		padding: 1.25rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		box-shadow: var(--shadow);
		min-width: 0;
	}
	.section legend,
	.stage legend {
		float: left;
		width: 100%;
		margin-bottom: 1rem;
		padding: 0;
		font-family: var(--font-heading);
		font-size: 1.25rem;
		font-weight: 700;
	}
	.q-grid {
		clear: both;
		display: grid;
		gap: 1.25rem;
	}
	@media (min-width: 768px) {
		.q-grid {
			grid-template-columns: 1fr 1fr;
		}
	}
	.stage-blurb {
		clear: both;
		margin-bottom: 0.75rem;
		color: var(--text-muted);
		font-size: 0.9375rem;
	}
	.form-pick {
		display: flex;
		gap: 0.875rem;
		padding: 0.875rem 0.5rem;
		border-top: 1px solid var(--border);
		cursor: pointer;
	}
	.form-pick input {
		flex-shrink: 0;
		width: 1.25rem;
		height: 1.25rem;
		margin-top: 0.125rem;
		accent-color: var(--primary);
		cursor: pointer;
	}
	.pick-body {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.pick-head {
		font-weight: 600;
	}
	.code {
		margin-right: 0.375rem;
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--primary);
		font-variant-numeric: tabular-nums;
	}
	.pick-when {
		font-size: 0.875rem;
		color: var(--text-muted);
	}
	.badge {
		display: inline-block;
		margin-left: 0.25rem;
		padding: 0.0625rem 0.5rem;
		border-radius: 999px;
		font-size: 0.75rem;
		font-weight: 700;
		vertical-align: middle;
	}
	.badge.warn {
		background: var(--warn-soft);
		color: var(--warn);
	}

	.nav-btns {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.75rem;
		margin-top: 2rem;
	}
	.next {
		margin-left: auto;
	}

	/* Review */
	.packet {
		margin-top: 1.25rem;
	}
	.review {
		list-style: none;
		margin: 1.25rem 0 0;
		padding: 0;
		display: grid;
		gap: 1rem;
	}
	.review-card {
		padding: 1.25rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		box-shadow: var(--shadow);
	}
	.review-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.review-head h2 {
		font-size: 1.125rem;
	}
	.meter {
		margin-top: 1rem;
		height: 0.5rem;
		border-radius: 999px;
		background: var(--surface-soft);
		overflow: hidden;
	}
	.meter span,
	.p-bar span {
		display: block;
		height: 100%;
		border-radius: 999px;
		background: var(--accent);
		transition: width 300ms var(--ease);
	}
	.meter-label {
		margin-top: 0.375rem;
		font-size: 0.875rem;
		color: var(--text-muted);
	}
	.gaps,
	.signers,
	.cont {
		margin-top: 0.5rem;
		font-size: 0.9375rem;
	}
	.cont {
		color: var(--warn);
	}
	.review-card .badge {
		margin: 0.75rem 0 0;
	}
	.empty {
		margin-top: 1.5rem;
	}

	/* Progress sidebar */
	.progress {
		padding: 1.25rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
	}
	.progress h2 {
		font-size: 1rem;
		margin-bottom: 0.75rem;
	}
	.progress ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.625rem;
	}
	.progress li {
		display: grid;
		grid-template-columns: 5.5rem 1fr 2.75rem;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
	}
	.p-code {
		font-weight: 700;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.p-bar {
		height: 0.375rem;
		border-radius: 999px;
		background: var(--surface-soft);
		overflow: hidden;
	}
	.p-pct {
		text-align: right;
		font-variant-numeric: tabular-nums;
		color: var(--text-muted);
	}
	.muted {
		color: var(--text-muted);
	}
	.small {
		margin-top: 1rem;
		font-size: 0.8125rem;
		display: flex;
		gap: 0.375rem;
		align-items: flex-start;
	}
	.small :global(svg) {
		flex-shrink: 0;
		margin-top: 0.125rem;
	}
</style>
