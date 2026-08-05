---
title: System Overview
description: High-level architecture and data flow of the social media AI automation pipelines.
---

This guide provides a high-level overview of the system architecture for the **cAImanLabs Social Media AI E2E Pipelines**.

## Architecture Components

The infrastructure consists of several interconnected systems running on a Kubernetes cluster. These components act together to process inbound messages, route them through intelligent agents, and schedule outbound responses.

- **Postiz**: Handles scheduling, posting, and analytics across social media platforms.
- **Chatwoot**: Acts as the centralized inbox for customer interactions (Facebook, Instagram, etc.).
- **n8n**: The core automation and orchestration engine, intercepting webhooks and chaining business logic.
- **AI Agents**: Specialized services like `Hermes` and `Obsidian Brain` that analyze incoming messages and generate contextual responses using a vector database (`ChromaDB`/`Qdrant`).

## Detailed System Flow

Below is the detailed lifecycle of data flowing from a client interaction to an AI-generated response, and how scheduled content flows out.

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

    %% Inbound Flow
    Note right of Customer: Inbound Messaging Flow
    Customer->>Nginx: Sends DM via Facebook
    Nginx->>Chatwoot: Webhook received & Conversation created
    Chatwoot-->>n8n: Triggers 'message_created' Webhook
    n8n->>n8n: Filter: Ignore agent/system messages
    n8n->>Hermes: POST /analyze-context (Context + Message)
    Hermes->>Qdrant: Query similar knowledge base documents
    Qdrant-->>Hermes: Return context chunks
    Hermes->>Hermes: LLM generates contextual response
    Hermes-->>n8n: Return generated reply string
    n8n->>Chatwoot: POST API: Insert reply into conversation
    Chatwoot->>Customer: Native reply sent back to Facebook

    %% Outbound Flow
    Note right of Customer: Scheduled Outbound Flow
    n8n->>Postiz: API Call: Schedule new AI-generated campaign
    Postiz->>Postiz: Temporal workflow tracks publish date
    Postiz->>Nginx: Dispatches post to Social Media API
    Nginx->>Customer: Post appears on Feed
</pre>

## Repository Structure

The primary configuration, Kubernetes manifests, and n8n workflows are version-controlled in the [socialmedia-ai-e2e-pipelines](https://github.com/rubenalejandrocalderoncorona/socialmedia-ai-e2e-pipelines) repository. 

Key directories:
- `/kubernetes/`: Core deployments for Chatwoot, Postiz, and n8n.
- `/n8n-workflows/`: JSON definitions of the automation pipelines.
- `/scripts/`: Setup scripts for Facebook integrations and tokens.
- `/docs/`: Markdown notes on individual platform integrations.
