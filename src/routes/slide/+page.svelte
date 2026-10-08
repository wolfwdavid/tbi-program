<script lang="ts">
	import { asset } from '$app/paths';
	import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
	import FileHeart from '@lucide/svelte/icons/file-heart';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import HeartHandshake from '@lucide/svelte/icons/heart-handshake';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
</script>

<svelte:head>
	<title>TBI Service Plan · 45 to 15 days</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="slide">
	<header>
		<p class="eyebrow">TBI Waiver · Service Plan</p>
		<h1>From a month and a half to <span class="hl">15 days</span></h1>
		<p class="sub">
			No approved service plan, no services. We cut the back-and-forth that delays the plan, so
			services start sooner.
		</p>
	</header>

	<section class="timeline" aria-label="Days to a completed service plan">
		<div class="bar-row">
			<span class="bar-label">Today</span>
			<div class="bar"><span class="fill old" style="width: 100%"></span></div>
			<span class="bar-num">~45 days</span>
		</div>
		<div class="bar-row">
			<span class="bar-label">With TBI Forms</span>
			<div class="bar"><span class="fill new" style="width: 33%"></span></div>
			<span class="bar-num strong">~15 days</span>
		</div>
	</section>

	<div class="grid">
		<section class="col">
			<h2>Why it's faster</h2>
			<ul class="drivers">
				<li>
					<span class="ic" aria-hidden="true"><ClipboardCheck size={24} /></span>
					<div><strong>Collect once.</strong> Each answer fills every form that needs it.</div>
				</li>
				<li>
					<span class="ic" aria-hidden="true"><FileHeart size={24} /></span>
					<div>
						<strong>Doctor documents sooner.</strong> Requests go out from the first conversation.
					</div>
				</li>
				<li>
					<span class="ic" aria-hidden="true"><ShieldCheck size={24} /></span>
					<div>
						<strong>HIPAA releases at intake.</strong> Signed in the first session, not mailed later.
					</div>
				</li>
				<li>
					<span class="ic" aria-hidden="true"><HeartHandshake size={24} /></span>
					<div>
						<strong>Better staff–client time.</strong> Staff focus on the person, not the paperwork.
					</div>
				</li>
			</ul>
		</section>

		<aside class="col side">
			<div class="cons">
				<h2><TriangleAlert size={18} aria-hidden="true" /> Trade-offs we manage</h2>
				<ul>
					<li>A coordinator still reviews every form.</li>
					<li>Signatures stay by hand on the official forms.</li>
					<li>Some forms are 2009 versions; confirm with the RRDS.</li>
				</ul>
			</div>
			<figure class="qr">
				<img
					src={asset('qr-forms.svg')}
					alt="QR code linking to the TBI Forms tool"
					width="148"
					height="148"
				/>
				<figcaption>
					<strong>Try it now</strong>
					<span>wolfwdavid.github.io/tbi-program/forms</span>
				</figcaption>
			</figure>
		</aside>
	</div>
</main>

<style>
	:global(body) {
		background: var(--bg);
	}
	.slide {
		box-sizing: border-box;
		width: min(100vw, calc(100dvh * 16 / 9));
		aspect-ratio: 16 / 9;
		margin: 0 auto;
		padding: clamp(1rem, 3.2vw, 3rem) clamp(1rem, 4vw, 3.75rem);
		display: flex;
		flex-direction: column;
		gap: clamp(0.75rem, 1.8vw, 1.5rem);
		font-size: clamp(0.8rem, 1.62vw, 1.6rem);
		justify-content: center;
		background: radial-gradient(circle at 92% 8%, var(--primary-soft), transparent 40%), var(--bg);
	}
	.eyebrow {
		display: inline-block;
		padding: 0.25em 0.8em;
		border-radius: 999px;
		background: var(--primary-soft);
		color: var(--primary);
		font-weight: 700;
		font-size: 0.85em;
	}
	h1 {
		margin-top: 0.4em;
		font-size: 2.6em;
	}
	.hl {
		color: var(--accent);
	}
	.sub {
		margin-top: 0.4em;
		max-width: 52em;
		color: var(--text-muted);
		font-size: 1.05em;
	}
	.timeline {
		display: grid;
		gap: 0.6em;
	}
	.bar-row {
		display: grid;
		grid-template-columns: 9em 1fr 6.5em;
		align-items: center;
		gap: 1em;
	}
	.bar-label {
		font-weight: 700;
	}
	.bar {
		height: 1.4em;
		border-radius: 999px;
		background: var(--surface-soft);
		overflow: hidden;
	}
	.fill {
		display: block;
		height: 100%;
		border-radius: 999px;
	}
	.old {
		background: var(--border-strong);
	}
	.new {
		background: var(--accent);
	}
	.bar-num {
		font-variant-numeric: tabular-nums;
		font-weight: 600;
	}
	.strong {
		color: var(--accent);
		font-weight: 800;
	}
	.grid {
		flex: 1;
		min-height: 0;
		display: grid;
		grid-template-columns: 1.5fr 1fr;
		gap: 1.5em;
	}
	h2 {
		display: flex;
		align-items: center;
		gap: 0.4em;
		font-size: 1.25em;
		margin-bottom: 0.6em;
	}
	.drivers {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.8em;
	}
	.drivers li {
		display: flex;
		gap: 0.7em;
		padding: 0.9em 1em;
		border-radius: 14px;
		background: var(--surface);
		border: 1px solid var(--border);
		box-shadow: var(--shadow);
		line-height: 1.4;
	}
	.ic {
		flex-shrink: 0;
		display: grid;
		place-items: center;
		width: 2.2em;
		height: 2.2em;
		border-radius: 10px;
		background: var(--primary-soft);
		color: var(--primary);
	}
	.side {
		display: flex;
		flex-direction: column;
		gap: 1em;
	}
	.cons {
		padding: 0.9em 1.1em;
		border-radius: 14px;
		background: var(--warn-soft);
	}
	.cons h2 {
		color: var(--warn);
		font-size: 1em;
		margin-bottom: 0.4em;
	}
	.cons ul {
		margin: 0;
		padding-left: 1.1em;
		line-height: 1.45;
		font-size: 0.92em;
	}
	.qr {
		margin: 0;
		display: flex;
		align-items: center;
		gap: 1em;
		padding: 0.8em;
		border-radius: 14px;
		background: var(--surface);
		border: 1px solid var(--border);
	}
	.qr img {
		width: 9em;
		height: 9em;
		border-radius: 8px;
		background: #fff;
	}
	.qr figcaption {
		display: flex;
		flex-direction: column;
		gap: 0.2em;
		font-size: 0.9em;
		word-break: break-word;
	}
	.qr strong {
		font-size: 1.15em;
	}

	/* Phones: stack instead of squeezing the 16:9 frame. */
	@media (max-width: 767px) {
		.slide {
			width: 100%;
			aspect-ratio: auto;
			font-size: 1rem;
			padding: 1.5rem 1rem;
		}
		h1 {
			font-size: 2rem;
		}
		.grid,
		.drivers {
			grid-template-columns: 1fr;
		}
		.bar-row {
			grid-template-columns: 6.5em 1fr 4.5em;
			gap: 0.5em;
		}
	}
</style>
