// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'cAImanLabs Infrastructure',
			head: [
				{
					tag: 'script',
					attrs: { type: 'module' },
					content: "import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs'; mermaid.initialize({ startOnLoad: true, theme: 'base' });",
				},
				{
					tag: 'script',
					attrs: { src: '/mermaid-zoom.js', defer: true }
				}
			],
			logo: {
				src: './src/assets/logo.png',
			},
			customCss: ['./src/styles/custom.css'],
			locales: {
				root: {
					label: 'English',
					lang: 'en'
				},
				es: {
					label: 'Español',
					lang: 'es'
				}
			},
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/rubenalejandrocalderoncorona/socialmedia-ai-e2e-pipelines' }],
			sidebar: [
				{
					label: 'Guides',
					translations: { es: 'Guías' },
					items: [
						{ label: 'System Overview', translations: { es: 'Resumen del Sistema' }, slug: 'guides/overview' },
						{ label: 'Client Portal', translations: { es: 'Portal de Clientes' }, slug: 'guides/client-portal' },
						{ label: 'Admin Portal', translations: { es: 'Portal Admin' }, slug: 'guides/admin-portal' },
						{ label: 'Data Platform & MCP', translations: { es: 'Plataforma de Datos y MCP' }, slug: 'guides/data-platform' },
						{ label: 'Cluster Deployment', translations: { es: 'Despliegue del Clúster' }, slug: 'guides/cluster-deployment' },
						{ label: 'Network & Routing', translations: { es: 'Redes y Enrutamiento' }, slug: 'guides/network-routing' },
						{ label: 'Tools & Dependencies', translations: { es: 'Herramientas y Dependencias' }, slug: 'guides/tools-dependencies' },
						{ label: 'Pipeline Walkthrough', translations: { es: 'Recorrido del Pipeline' }, slug: 'guides/pipeline-walkthrough' },
						{ label: 'Client Portal Production Runbook', translations: { es: 'Guía de Producción del Portal' }, slug: 'guides/client-portal-production' },
					],
				}
			],
		}),
	],
});
