---
title: cAImanLabs Infrastructure Overview
description: Comprehensive documentation for the cAImanLabs Social Media AI E2E Pipelines and infrastructure.
template: splash
hero:
  tagline: System documentation for the social media AI automation pipelines and Kubernetes workloads.
  actions:
    - text: Read the Guides
      link: /guides/overview/
      icon: right-arrow
---

import { Card, CardGrid } from '@astrojs/starlight/components';

## What you'll find here

<CardGrid stagger>
	<Card title="System Architecture" icon="document">
		Learn about the high-level system components, including Postiz, Chatwoot, and n8n orchestration.
	</Card>
	<Card title="Cluster Infrastructure" icon="setting">
		Detailed inventory of Kubernetes workloads, namespaces, and services.
	</Card>
	<Card title="Network Routing" icon="add-document">
		Information on Cloudflare Tunnels, Ingress-Nginx, and internal reverse proxy rules.
	</Card>
	<Card title="AI Agent Workflows" icon="rocket">
		Step-by-step lifecycle mapping for automated agents like Hermes and Obsidian Brain.
	</Card>
</CardGrid>
