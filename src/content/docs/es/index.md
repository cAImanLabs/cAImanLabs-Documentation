---
title: Descripción de la Infraestructura de cAImanLabs
description: Documentación completa de los pipelines e infraestructura de IA para redes sociales de cAImanLabs.
template: splash
hero:
  tagline: Documentación del sistema para los pipelines de automatización de IA en redes sociales y cargas de trabajo en Kubernetes.
  actions:
    - text: Leer las Guías
      link: /es/guides/overview/
      icon: right-arrow
---

import { Card, CardGrid } from '@astrojs/starlight/components';

## Qué encontrarás aquí

<CardGrid stagger>
	<Card title="Arquitectura del Sistema" icon="document">
		Aprende sobre los componentes de alto nivel del sistema, incluyendo Postiz, Chatwoot y la orquestación con n8n.
	</Card>
	<Card title="Infraestructura del Clúster" icon="setting">
		Inventario detallado de cargas de trabajo de Kubernetes, espacios de nombres y servicios.
	</Card>
	<Card title="Redes y Enrutamiento" icon="add-document">
		Información sobre túneles de Cloudflare, Ingress-Nginx y reglas del proxy inverso interno.
	</Card>
	<Card title="Flujos de Agentes de IA" icon="rocket">
		Mapeo paso a paso del ciclo de vida para agentes automatizados como Hermes y Obsidian Brain.
	</Card>
</CardGrid>
