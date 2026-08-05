---
title: Resumen del Sistema
description: Arquitectura de alto nivel y flujo de datos de los pipelines de automatización de IA en redes sociales.
---

Esta guía proporciona un resumen de alto nivel de la arquitectura del sistema para los **Pipelines de Automatización IA para Redes Sociales de cAImanLabs**.

## Componentes de la Arquitectura

La infraestructura consta de varios sistemas interconectados que se ejecutan en un clúster de Kubernetes. Estos componentes actúan en conjunto para procesar los mensajes entrantes, enrutarlos a través de agentes inteligentes y programar respuestas salientes.

- **Postiz**: Gestiona la programación, publicación y analíticas en las diferentes plataformas de redes sociales.
- **Chatwoot**: Actúa como la bandeja de entrada centralizada para las interacciones con los clientes (Facebook, Instagram, etc.).
- **n8n**: El motor principal de automatización y orquestación, que intercepta webhooks y encadena la lógica de negocio.
- **Agentes de IA**: Servicios especializados como `Hermes` y `Obsidian Brain` que analizan los mensajes entrantes y generan respuestas contextuales utilizando una base de datos vectorial (`ChromaDB`/`Qdrant`).

## Flujo Detallado del Sistema

A continuación se detalla el ciclo de vida de los datos, desde la interacción del cliente hasta una respuesta generada por la IA, y cómo fluye el contenido programado hacia el exterior.

<pre class="mermaid">
sequenceDiagram
    autonumber
    actor Customer
    participant Nginx
    participant Chatwoot
    participant n8n
    participant Hermes
    participant Qdrant
    participant Postiz

    %% Flujo Entrante
    Note right of Customer: Flujo de Mensajes Entrantes
    Customer->>Nginx: Envía DM vía Facebook
    Nginx->>Chatwoot: Recibe Webhook y crea Conversación
    Chatwoot-->>n8n: Activa Webhook 'message_created'
    n8n->>n8n: Filtro: Ignorar mensajes del sistema/agente
    n8n->>Hermes: POST /analyze-context (Contexto + Mensaje)
    Hermes->>Qdrant: Consulta documentos similares (Base de conocimiento)
    Qdrant-->>Hermes: Retorna fragmentos (chunks) de contexto
    Hermes->>Hermes: LLM genera una respuesta contextual
    Hermes-->>n8n: Retorna el texto de la respuesta generada
    n8n->>Chatwoot: POST API: Inserta la respuesta en la conversación
    Chatwoot->>Customer: Respuesta nativa enviada de vuelta a Facebook

    %% Flujo Saliente Programado
    Note right of Customer: Flujo Saliente (Programado)
    n8n->>Postiz: Llamada API: Programa campaña generada por IA
    Postiz->>Postiz: El flujo de Temporal registra la fecha de publicación
    Postiz->>Nginx: Envía publicación a la API de la Red Social
    Nginx->>Customer: La publicación aparece en el Feed (Muro)
</pre>

## Estructura del Repositorio

La configuración principal, los manifiestos de Kubernetes y los flujos de trabajo de n8n están versionados en el repositorio [socialmedia-ai-e2e-pipelines](https://github.com/rubenalejandrocalderoncorona/socialmedia-ai-e2e-pipelines).

Directorios clave:
- `/kubernetes/`: Despliegues principales para Chatwoot, Postiz y n8n.
- `/n8n-workflows/`: Definiciones JSON de los pipelines de automatización.
- `/scripts/`: Scripts de configuración para integraciones y tokens de Facebook.
- `/docs/`: Notas en Markdown sobre integraciones de plataformas individuales.
