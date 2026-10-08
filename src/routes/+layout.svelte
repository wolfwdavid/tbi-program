<script lang="ts">
	import '@fontsource/lora/latin-500.css';
	import '@fontsource/lora/latin-600.css';
	import '@fontsource/lora/latin-700.css';
	import '@fontsource/raleway/latin-400.css';
	import '@fontsource/raleway/latin-500.css';
	import '@fontsource/raleway/latin-600.css';
	import '@fontsource/raleway/latin-700.css';
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
