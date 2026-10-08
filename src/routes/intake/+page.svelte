<script lang="ts">
	import { asset, resolve } from '$app/paths';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import Code from '@lucide/svelte/icons/code';
	import MessagesSquare from '@lucide/svelte/icons/messages-square';
	import Network from '@lucide/svelte/icons/network';
	import Terminal from '@lucide/svelte/icons/terminal';

	const steps = [
		{
			title: 'Talk',
			text: 'Staff and the participant just talk, typed or by voice. Each answer is read into one record, and every fact cites the exact words it came from.'
		},
		{
			title: 'Check the forms',
			text: 'Plain code checks every citation and routes each fact to every form section that uses it: the Revised Service Plan, Plan for Protective Oversight, Contact List and Insurance sheet.'
		},
		{
			title: 'Doctors',
			text: 'Doctor requests are drafted from the conversation and the packet rules. Sending is gated on the signed HIPAA release, collected at the first intake.'
		},
		{
			title: 'Save',
			text: 'Save and resume later. A coordinator reviews everything; signatures stay on the official forms.'
		}
	];

	const BRANCH = 'https://github.com/wolfwdavid/tbi-program/tree/alex/intake-app';
</script>

<svelte:head>
	<title>Intake App · One Conversation</title>
	<meta
		name="description"
		content="One intake conversation fills the TBI/NHTD service plan packet. Architecture, how it works, and how to run it."
	/>
</svelte:head>

<header class="topbar">
	<div class="topbar-inner">
		<a class="brand" href={resolve('/intake')}>
			<span class="brand-mark" aria-hidden="true"><MessagesSquare size={20} /></span>
			Intake App
		</a>
		<nav aria-label="Site">
			<a href={resolve('/forms')}><ClipboardList size={16} aria-hidden="true" />Forms tool</a>
			<a href={resolve('/slide')}>Slide</a>
		</nav>
	</div>
</header>

<main>
	<section class="hero">
		<p class="eyebrow">Built by Alex · alex branch</p>
		<h1>One conversation, many forms</h1>
		<p class="lede">
			A staff-facing intake helper for the service plan packet. Instead of writing the same facts
			again and again across forms, staff and the participant have one conversation, and every form
			section that needs a fact gets it.
		</p>
		<div class="ctas">
			<!-- A static file, not a route: let the browser load it. -->
			<a class="btn primary" href={asset('intake/architecture.html')} data-sveltekit-reload>
				<Network size={18} aria-hidden="true" /> See how it works
			</a>
			<a class="btn secondary" href={BRANCH} target="_blank" rel="noopener noreferrer">
				<Code size={18} aria-hidden="true" /> Source code
			</a>
		</div>
	</section>

	<section aria-labelledby="steps-h">
		<h2 id="steps-h">Four steps</h2>
		<ol class="steps">
			{#each steps as s, i (s.title)}
				<li class="card">
					<span class="num" aria-hidden="true">{i + 1}</span>
					<h3>{s.title}</h3>
					<p>{s.text}</p>
				</li>
			{/each}
		</ol>
	</section>

	<section class="run card" aria-labelledby="run-h">
		<div class="run-head">
			<span class="icon" aria-hidden="true"><Terminal size={20} /></span>
			<h2 id="run-h">Run the live demo</h2>
		</div>
		<p>
			The live app reads the conversation with an AI model through a small local server, so it runs
			on your computer rather than on this website. Data stays on that machine; the demo participant
			is fictional.
		</p>
		<pre><code
				>git clone -b alex https://github.com/wolfwdavid/tbi-program.git
cd tbi-program/intake-app
pip install anthropic
set ANTHROPIC_API_KEY=your-key
python -B server.py</code
			></pre>
		<p>
			Then open <strong>http://127.0.0.1:8776</strong> and press <strong>Play demo intake</strong>.
		</p>
	</section>

	<section class="pair card">
		<div>
			<h2>Pairs with the forms tool</h2>
			<p>
				The intake app gathers the facts in one conversation. The forms tool writes them onto the
				official DOH PDFs, ready to sign.
			</p>
		</div>
		<a class="btn primary" href={resolve('/forms')}>
			Open the forms tool <ArrowRight size={18} aria-hidden="true" />
		</a>
	</section>

	<p class="note">
		Not clinical advice and not an eligibility decision. The app proposes; a service coordinator
		confirms.
	</p>
</main>

<style>
	.topbar {
		position: sticky;
		top: 0;
		z-index: 40;
		background: color-mix(in srgb, var(--bg) 90%, transparent);
		backdrop-filter: blur(10px);
		border-bottom: 1px solid var(--border);
	}
	.topbar-inner {
		max-width: 64rem;
		margin: 0 auto;
		padding: 0.5rem 1rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
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
	nav {
		display: flex;
		gap: 0.25rem;
	}
	nav a {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		min-height: 44px;
		padding: 0 0.75rem;
		border-radius: 999px;
		color: var(--text-muted);
		font-weight: 600;
		text-decoration: none;
		white-space: nowrap;
	}
	nav a:hover {
		background: var(--primary-soft);
		color: var(--text);
	}

	main {
		max-width: 64rem;
		margin: 0 auto;
		padding: 0 1rem 4rem;
	}
	main > section {
		margin-top: 3rem;
	}
	.hero {
		max-width: 46rem;
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
	h1 {
		margin-top: 1rem;
		font-size: clamp(2rem, 5vw, 3rem);
	}
	.lede {
		margin-top: 1rem;
		font-size: 1.125rem;
		color: var(--text-muted);
	}
	.ctas {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 1.5rem;
	}
	h2 {
		font-size: clamp(1.375rem, 3vw, 1.75rem);
	}
	.card {
		padding: 1.5rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		box-shadow: var(--shadow);
	}
	.steps {
		list-style: none;
		margin: 1.25rem 0 0;
		padding: 0;
		display: grid;
		gap: 1rem;
	}
	@media (min-width: 768px) {
		.steps {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	@media (min-width: 1024px) {
		.steps {
			grid-template-columns: repeat(4, 1fr);
		}
	}
	.num {
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		background: var(--primary);
		color: var(--on-primary);
		font-weight: 700;
	}
	.steps h3 {
		margin-top: 0.75rem;
		font-size: 1.25rem;
	}
	.steps p {
		margin-top: 0.5rem;
		color: var(--text-muted);
	}
	.run-head {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.icon {
		display: grid;
		place-items: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 12px;
		background: var(--primary-soft);
		color: var(--primary);
	}
	.run p {
		margin-top: 0.75rem;
		max-width: 65ch;
	}
	pre {
		margin: 1rem 0 0;
		padding: 1rem 1.25rem;
		border-radius: var(--radius-sm);
		background: #1e1533;
		color: #f1ebff;
		font-size: 0.9375rem;
		line-height: 1.6;
		overflow-x: auto;
	}
	.pair {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		background: linear-gradient(135deg, var(--primary-soft), var(--surface));
	}
	.pair p {
		margin-top: 0.5rem;
		color: var(--text-muted);
		max-width: 50ch;
	}
	.note {
		margin-top: 2rem;
		font-size: 0.875rem;
		color: var(--text-muted);
	}
</style>
