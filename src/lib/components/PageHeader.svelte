<script lang="ts">
	export let title:    string;
	export let badge:    string = '';
	export let badgeColor: 'blue' | 'purple' | 'red' | 'green' | 'orange' | 'teal' = 'blue';
	export let subtitle: string = '';
	export let backHref: string = '/compress';
</script>

<div class="ph">
	<a href={backHref} class="ph-back">← All formats</a>
	<div class="ph-top">
		{#if badge}
			<span class="ph-badge {badgeColor}">{badge}</span>
		{/if}
		<h1 class="ph-title">{title}</h1>
	</div>
	{#if subtitle}
		<p class="ph-sub">{subtitle}</p>
	{/if}
	<slot />
</div>

<style>
	.ph         { margin-bottom: 2rem; }
	.ph-back    { font-size: 0.82rem; color: var(--text-3); font-family: var(--mono); transition: color var(--transition); display: inline-block; margin-bottom: 0.5rem; }
	.ph-back:hover { color: var(--accent); }
	.ph-top     { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.4rem; }
	.ph-title   { font-size: 1.9rem; font-weight: 800; letter-spacing: -0.025em; color: var(--text); }
	.ph-sub     { font-size: 0.85rem; color: var(--text-3); font-family: var(--mono); }
	.ph-badge   { padding: 0.2rem 0.65rem; border-radius: 6px; font-size: 0.8rem; font-weight: 600; border: 1px solid; }
	.ph-badge.blue   { background: rgba(59,91,219,.1);   border-color: rgba(59,91,219,.2);   color: var(--accent); }
	.ph-badge.purple { background: rgba(112,72,232,.1);  border-color: rgba(112,72,232,.2);  color: #7048e8; }
	.ph-badge.red    { background: rgba(224,49,49,.1);   border-color: rgba(224,49,49,.2);   color: #c92a2a; }
	.ph-badge.green  { background: rgba(47,158,68,.1);   border-color: rgba(47,158,68,.2);   color: #2f9e44; }
	.ph-badge.orange { background: rgba(230,119,0,.1);   border-color: rgba(230,119,0,.2);   color: #d9480f; }
	.ph-badge.teal   { background: rgba(12,133,153,.1);  border-color: rgba(12,133,153,.2);  color: var(--accent3); }
</style>
