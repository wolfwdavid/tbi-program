<script lang="ts">
	import Users from '@lucide/svelte/icons/users';
	import MessageCircleHeart from '@lucide/svelte/icons/message-circle-heart';
	import Megaphone from '@lucide/svelte/icons/megaphone';
	import CalendarRange from '@lucide/svelte/icons/calendar-range';
	import ChartColumn from '@lucide/svelte/icons/chart-column';
	import Wallet from '@lucide/svelte/icons/wallet';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import ListChecks from '@lucide/svelte/icons/list-checks';
	import Compass from '@lucide/svelte/icons/compass';
	import Phone from '@lucide/svelte/icons/phone';
	import Check from '@lucide/svelte/icons/check';
	import {
		product,
		problem,
		segments,
		pillars,
		channels,
		phases,
		funnel,
		kpis,
		budget,
		safety,
		risks,
		nextSteps
	} from '#lib/gtm.ts';

	const nav = [
		{ id: 'audience', label: 'Audience' },
		{ id: 'messaging', label: 'Messaging' },
		{ id: 'channels', label: 'Channels' },
		{ id: 'plan', label: 'Launch plan' },
		{ id: 'metrics', label: 'Metrics' },
		{ id: 'budget', label: 'Budget' },
		{ id: 'safety', label: 'Safety' },
		{ id: 'risks', label: 'Risks' }
	];

	const fmt = new Intl.NumberFormat('en-US');
	const funnelMax = funnel[0].value;
	const budgetMax = Math.max(...budget.map((b) => b.share));
</script>

<svelte:head>
	<title>{product.name} · Mini GTM Plan</title>
	<meta
		name="description"
		content="Go-to-market plan for {product.name}, {product.tagline.toLowerCase()}."
	/>
</svelte:head>

<a class="skip" href="#main">Skip to content</a>

<header class="topbar">
	<div class="topbar-inner">
		<a class="brand" href="#top">
			<span class="brand-mark" aria-hidden="true"><MessageCircleHeart size={20} /></span>
			{product.name}
		</a>
		<nav aria-label="Sections">
			<ul>
				{#each nav as item (item.id)}
					<li><a href="#{item.id}">{item.label}</a></li>
				{/each}
			</ul>
		</nav>
		<a class="help-link" href="https://988lifeline.org" target="_blank" rel="noopener noreferrer">
			<Phone size={16} aria-hidden="true" />
			<span class="help-full">Need help now?</span>
			<span class="help-short">Get help</span>
		</a>
	</div>
</header>

<main id="main">
	<section class="hero" id="top">
		<p class="eyebrow">Mini go-to-market plan · First 90 days</p>
		<h1>{product.name}</h1>
		<p class="tagline">{product.tagline}</p>
		<p class="lede">{product.summary}</p>
		<div class="hero-stats" aria-label="Headline targets">
			<div><strong>1,600</strong><span>sign-ups</span></div>
			<div><strong>400</strong><span>weekly active members</span></div>
			<div><strong>Under 2 hrs</strong><span>median time to first reply</span></div>
		</div>
	</section>

	<section class="grid-2">
		<div class="card">
			<h2 class="h3">The problem</h2>
			<ul class="bullets">
				{#each problem as p, i (i)}
					<li>{p}</li>
				{/each}
			</ul>
		</div>
		<div class="card card-feature">
			<h2 class="h3">Positioning</h2>
			<p>{product.positioning}</p>
		</div>
	</section>

	<section id="audience" aria-labelledby="audience-h">
		<div class="section-head">
			<span class="icon" aria-hidden="true"><Users size={22} /></span>
			<h2 id="audience-h">Who it's for</h2>
		</div>
		<div class="grid-3">
			{#each segments as s (s.name)}
				<article class="card">
					<div class="card-top">
						<h3>{s.name}</h3>
						<span class="badge" class:badge-muted={s.priority !== 'Primary'}>{s.priority}</span>
					</div>
					<p>{s.who}</p>
					<dl>
						<dt>What they need</dt>
						<dd>{s.need}</dd>
						<dt>Where we reach them</dt>
						<dd>{s.reach}</dd>
					</dl>
				</article>
			{/each}
		</div>
	</section>

	<section id="messaging" aria-labelledby="messaging-h">
		<div class="section-head">
			<span class="icon" aria-hidden="true"><Compass size={22} /></span>
			<h2 id="messaging-h">Message pillars</h2>
		</div>
		<div class="grid-3">
			{#each pillars as p, i (p.title)}
				<article class="card pillar">
					<span class="pillar-num" aria-hidden="true">0{i + 1}</span>
					<h3>{p.title}</h3>
					<p>{p.line}</p>
				</article>
			{/each}
		</div>
	</section>

	<section id="channels" aria-labelledby="channels-h">
		<div class="section-head">
			<span class="icon" aria-hidden="true"><Megaphone size={22} /></span>
			<h2 id="channels-h">Channels</h2>
		</div>
		<div class="table-wrap card">
			<table>
				<thead>
					<tr>
						<th scope="col">Channel</th>
						<th scope="col">Type</th>
						<th scope="col">Tactic</th>
						<th scope="col">Priority</th>
					</tr>
				</thead>
				<tbody>
					{#each channels as c (c.name)}
						<tr>
							<th scope="row">{c.name}</th>
							<td data-label="Type">{c.type}</td>
							<td data-label="Tactic">{c.tactic}</td>
							<td data-label="Priority">
								<span class="priority priority-{c.priority.toLowerCase()}">{c.priority}</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<section id="plan" aria-labelledby="plan-h">
		<div class="section-head">
			<span class="icon" aria-hidden="true"><CalendarRange size={22} /></span>
			<h2 id="plan-h">90-day launch plan</h2>
		</div>
		<ol class="timeline">
			{#each phases as ph, i (ph.name)}
				<li class="card">
					<p class="phase-label">Phase {i + 1} · {ph.label}</p>
					<h3>{ph.name}</h3>
					<ul class="checks">
						{#each ph.items as item (item)}
							<li><Check size={16} aria-hidden="true" />{item}</li>
						{/each}
					</ul>
				</li>
			{/each}
		</ol>
	</section>

	<section id="metrics" aria-labelledby="metrics-h">
		<div class="section-head">
			<span class="icon" aria-hidden="true"><ChartColumn size={22} /></span>
			<h2 id="metrics-h">Funnel and KPIs</h2>
		</div>
		<div class="grid-2">
			<div class="card">
				<h3>90-day funnel targets</h3>
				<ol class="bars" aria-label="Funnel targets from visitors to weekly active members">
					{#each funnel as f, i (f.stage)}
						<li>
							<div class="bar-label">
								<span>{f.stage}</span>
								<span class="num">
									{fmt.format(f.value)}
									{#if i > 0}
										<small>({Math.round((f.value / funnel[i - 1].value) * 100)}% of previous)</small
										>
									{/if}
								</span>
							</div>
							<div class="bar-track" aria-hidden="true">
								<div
									class="bar-fill"
									style="width: {Math.max((f.value / funnelMax) * 100, 2)}%"
								></div>
							</div>
						</li>
					{/each}
				</ol>
			</div>
			<div class="card">
				<h3>Success metrics</h3>
				<dl class="kpis">
					{#each kpis as k (k.label)}
						<div>
							<dt>{k.label}</dt>
							<dd class="num">{k.target}</dd>
						</div>
					{/each}
				</dl>
			</div>
		</div>
	</section>

	<section id="budget" aria-labelledby="budget-h">
		<div class="section-head">
			<span class="icon" aria-hidden="true"><Wallet size={22} /></span>
			<h2 id="budget-h">Budget split</h2>
		</div>
		<div class="card">
			<ul class="bars" aria-label="Share of 90-day budget by area">
				{#each budget as b (b.item)}
					<li>
						<div class="bar-label">
							<span>{b.item}</span>
							<span class="num">{b.share}%</span>
						</div>
						<div class="bar-track" aria-hidden="true">
							<div class="bar-fill bar-accent" style="width: {(b.share / budgetMax) * 100}%"></div>
						</div>
					</li>
				{/each}
			</ul>
		</div>
	</section>

	<section id="safety" aria-labelledby="safety-h">
		<div class="section-head">
			<span class="icon icon-accent" aria-hidden="true"><ShieldCheck size={22} /></span>
			<h2 id="safety-h">Safety and trust</h2>
		</div>
		<p class="section-intro">
			In mental wellness, trust is the product. These commitments ship before the first public
			sign-up.
		</p>
		<div class="grid-2">
			{#each safety as s (s.title)}
				<article class="card">
					<h3>{s.title}</h3>
					<p>{s.line}</p>
				</article>
			{/each}
		</div>
	</section>

	<section id="risks" aria-labelledby="risks-h">
		<div class="section-head">
			<span class="icon icon-warn" aria-hidden="true"><TriangleAlert size={22} /></span>
			<h2 id="risks-h">Risks and mitigations</h2>
		</div>
		<div class="grid-2">
			{#each risks as r (r.risk)}
				<article class="card risk">
					<h3>{r.risk}</h3>
					<p><span class="label">Mitigation:</span> {r.mitigation}</p>
				</article>
			{/each}
		</div>
	</section>

	<section id="next" aria-labelledby="next-h">
		<div class="card card-feature">
			<div class="section-head">
				<span class="icon" aria-hidden="true"><ListChecks size={22} /></span>
				<h2 id="next-h">Next steps</h2>
			</div>
			<ol class="next">
				{#each nextSteps as n (n)}
					<li>{n}</li>
				{/each}
			</ol>
		</div>
	</section>
</main>

<footer>
	<p>
		All figures are planning targets. Peer support is not a substitute for professional care. If you
		are in crisis in the US, call or text
		<a href="tel:988">988</a>.
	</p>
</footer>

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
		background: color-mix(in srgb, var(--bg) 88%, transparent);
		backdrop-filter: blur(10px);
		border-bottom: 1px solid var(--border);
	}
	.topbar-inner {
		max-width: 72rem;
		margin: 0 auto;
		padding: 0.5rem 1rem;
		display: flex;
		align-items: center;
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
		flex: 1;
		min-width: 0;
		overflow-x: auto;
		scrollbar-width: none;
	}
	nav ul {
		display: flex;
		gap: 0.25rem;
		list-style: none;
		margin: 0;
		padding: 0;
	}
	nav a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		padding: 0 0.75rem;
		border-radius: 999px;
		color: var(--text-muted);
		font-weight: 600;
		font-size: 0.9375rem;
		text-decoration: none;
		white-space: nowrap;
		transition:
			background-color 200ms var(--ease),
			color 200ms var(--ease);
	}
	nav a:hover {
		background: var(--primary-soft);
		color: var(--text);
	}
	.help-link {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		min-height: 44px;
		padding: 0 1rem;
		border-radius: 999px;
		background: var(--accent);
		color: var(--on-primary);
		font-weight: 700;
		font-size: 0.9375rem;
		text-decoration: none;
		white-space: nowrap;
		transition: filter 200ms var(--ease);
	}
	.help-link:hover {
		filter: brightness(1.08);
	}
	.help-short {
		display: none;
	}
	@media (max-width: 479px) {
		.help-full {
			display: none;
		}
		.help-short {
			display: inline;
		}
	}
	@media (max-width: 767px) {
		nav {
			display: none;
		}
		.topbar-inner {
			justify-content: space-between;
		}
	}

	/* Layout */
	main {
		max-width: 72rem;
		margin: 0 auto;
		padding: 0 1rem 4rem;
	}
	main > section {
		margin-top: 4rem;
	}
	.grid-2,
	.grid-3 {
		display: grid;
		gap: 1.25rem;
	}
	@media (min-width: 768px) {
		.grid-2 {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	@media (min-width: 1024px) {
		.grid-3 {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	/* Hero */
	main > section.hero {
		margin-top: 0;
		padding: 3rem 0 0;
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
		letter-spacing: 0.02em;
	}
	h1 {
		margin-top: 1rem;
		font-size: clamp(2.5rem, 6vw, 3.75rem);
	}
	.tagline {
		margin-top: 0.5rem;
		font-family: var(--font-heading);
		font-size: clamp(1.25rem, 2.5vw, 1.5rem);
		color: var(--primary);
	}
	.lede {
		margin-top: 1rem;
		font-size: 1.125rem;
		color: var(--text-muted);
		max-width: 65ch;
	}
	.hero-stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
		gap: 1rem;
		margin-top: 2rem;
	}
	.hero-stats div {
		display: flex;
		flex-direction: column;
		padding: 1rem 1.25rem;
		border-radius: var(--radius);
		background: var(--surface);
		box-shadow: var(--shadow);
	}
	.hero-stats strong {
		font-family: var(--font-heading);
		font-size: 1.75rem;
		font-variant-numeric: tabular-nums;
	}
	.hero-stats span {
		color: var(--text-muted);
		font-size: 0.9375rem;
	}

	/* Sections */
	.section-head {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1.25rem;
	}
	.section-head h2,
	.h3 {
		font-size: clamp(1.5rem, 3vw, 2rem);
	}
	.h3 {
		font-size: 1.375rem;
		margin-bottom: 0.75rem;
	}
	.section-intro {
		margin: -0.5rem 0 1.25rem;
		color: var(--text-muted);
		max-width: 65ch;
	}
	.icon {
		display: grid;
		place-items: center;
		width: 2.5rem;
		height: 2.5rem;
		flex-shrink: 0;
		border-radius: 12px;
		background: var(--primary-soft);
		color: var(--primary);
	}
	.icon-accent {
		background: var(--accent-soft);
		color: var(--accent);
	}
	.icon-warn {
		background: var(--warn-soft);
		color: var(--warn);
	}

	/* Cards */
	.card {
		padding: 1.5rem;
		border-radius: var(--radius);
		background: var(--surface);
		border: 1px solid var(--border);
		box-shadow: var(--shadow);
		transition:
			box-shadow 200ms var(--ease),
			transform 200ms var(--ease);
	}
	article.card:hover {
		box-shadow: var(--shadow-hover);
		transform: translateY(-2px);
	}
	.card h3 {
		font-size: 1.25rem;
	}
	.card > p,
	.card > h3 + p {
		margin-top: 0.5rem;
	}
	.card-feature {
		background: linear-gradient(135deg, var(--primary-soft), var(--surface));
	}
	.card-top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
	}
	.badge {
		flex-shrink: 0;
		padding: 0.125rem 0.625rem;
		border-radius: 999px;
		background: var(--accent-soft);
		color: var(--accent);
		font-size: 0.8125rem;
		font-weight: 700;
	}
	.badge-muted {
		background: var(--surface-soft);
		color: var(--text-muted);
	}
	dl {
		margin: 1rem 0 0;
	}
	dt {
		font-size: 0.8125rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-muted);
	}
	dd {
		margin: 0.125rem 0 0.75rem;
	}
	.bullets {
		margin: 0;
		padding-left: 1.25rem;
	}
	.bullets li + li {
		margin-top: 0.5rem;
	}
	.pillar-num {
		font-family: var(--font-heading);
		font-size: 2rem;
		font-weight: 700;
		color: var(--primary);
		opacity: 0.5;
	}

	/* Table */
	.table-wrap {
		padding: 0;
		overflow-x: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		min-width: 40rem;
	}
	th,
	td {
		padding: 1rem 1.25rem;
		text-align: left;
		vertical-align: top;
		border-bottom: 1px solid var(--border);
	}
	thead th {
		font-size: 0.8125rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-muted);
		background: var(--surface-soft);
	}
	tbody tr:last-child > * {
		border-bottom: 0;
	}
	tbody th {
		font-weight: 700;
		white-space: nowrap;
	}
	/* Phones: each table row becomes a stacked card instead of scrolling sideways. */
	@media (max-width: 767px) {
		table {
			min-width: 0;
		}
		thead {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip-path: inset(50%);
		}
		tbody tr {
			display: block;
			padding: 1.25rem;
			border-bottom: 1px solid var(--border);
		}
		tbody tr:last-child {
			border-bottom: 0;
		}
		tbody th,
		tbody td {
			display: block;
			padding: 0;
			border: 0;
			white-space: normal;
		}
		tbody th {
			font-size: 1.125rem;
			margin-bottom: 0.5rem;
		}
		tbody td + td {
			margin-top: 0.5rem;
		}
		tbody td::before {
			content: attr(data-label);
			display: block;
			font-size: 0.8125rem;
			font-weight: 700;
			text-transform: uppercase;
			letter-spacing: 0.05em;
			color: var(--text-muted);
		}
	}
	.priority {
		display: inline-block;
		padding: 0.125rem 0.625rem;
		border-radius: 999px;
		font-size: 0.8125rem;
		font-weight: 700;
	}
	.priority-high {
		background: var(--accent-soft);
		color: var(--accent);
	}
	.priority-medium {
		background: var(--primary-soft);
		color: var(--primary);
	}
	.priority-low {
		background: var(--surface-soft);
		color: var(--text-muted);
	}

	/* Timeline */
	.timeline {
		display: grid;
		gap: 1.25rem;
		list-style: none;
		margin: 0;
		padding: 0;
		counter-reset: none;
	}
	@media (min-width: 1024px) {
		.timeline {
			grid-template-columns: repeat(3, 1fr);
		}
	}
	.timeline > li {
		border-top: 4px solid var(--primary);
	}
	.phase-label {
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--primary);
	}
	.timeline h3 {
		margin-top: 0.25rem;
	}
	.checks {
		list-style: none;
		margin: 1rem 0 0;
		padding: 0;
	}
	.checks li {
		display: flex;
		gap: 0.5rem;
		align-items: flex-start;
	}
	.checks li + li {
		margin-top: 0.5rem;
	}
	.checks :global(svg) {
		flex-shrink: 0;
		margin-top: 0.3rem;
		color: var(--accent);
	}

	/* Bars */
	.bars {
		list-style: none;
		margin: 1rem 0 0;
		padding: 0;
	}
	.bars li + li {
		margin-top: 1rem;
	}
	.bar-label {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
		font-weight: 600;
	}
	.num {
		font-variant-numeric: tabular-nums;
	}
	.bar-label small {
		font-weight: 500;
		color: var(--text-muted);
	}
	.bar-track {
		margin-top: 0.375rem;
		height: 0.75rem;
		border-radius: 999px;
		background: var(--surface-soft);
		overflow: hidden;
	}
	.bar-fill {
		height: 100%;
		border-radius: 999px;
		background: var(--primary);
	}
	.bar-accent {
		background: var(--accent);
	}

	/* KPIs */
	.kpis {
		margin: 1rem 0 0;
	}
	.kpis div {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 1rem;
		padding: 0.75rem 0;
		border-bottom: 1px solid var(--border);
	}
	.kpis div:last-child {
		border-bottom: 0;
	}
	.kpis dt {
		font-size: 1rem;
		font-weight: 500;
		text-transform: none;
		letter-spacing: 0;
		color: var(--text);
	}
	.kpis dd {
		margin: 0;
		font-family: var(--font-heading);
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--primary);
		white-space: nowrap;
	}

	/* Risks */
	.risk {
		border-left: 4px solid var(--warn);
	}
	.label {
		font-weight: 700;
	}

	/* Next steps */
	.next {
		margin: 0;
		padding-left: 1.5rem;
		columns: 1;
	}
	@media (min-width: 768px) {
		.next {
			columns: 2;
			column-gap: 3rem;
		}
	}
	.next li {
		padding: 0.375rem 0;
		break-inside: avoid;
	}

	footer {
		max-width: 72rem;
		margin: 0 auto;
		padding: 2rem 1rem 3rem;
		border-top: 1px solid var(--border);
		color: var(--text-muted);
		font-size: 0.9375rem;
	}
</style>
