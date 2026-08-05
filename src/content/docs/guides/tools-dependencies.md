---
title: Tools & Dependencies
description: Detailed breakdown of applications, frameworks, databases, and cloud components.
---

This document outlines the primary tools and technologies running within the cAImanLabs E2E infrastructure cluster, along with their roles, access points, and official references.

## Security Posture & Cryptomator
> [!IMPORTANT]
> All sensitive API keys, JWTs, and Tokens are strictly excluded from Git. They are managed within a **Cryptomator encrypted vault** located at `/Volumes/Environments-Keys/MASTER_ENVIRONMENT_KEYS.md` on the host machine.
> The infrastructure heavily relies on Meta Graph API `v20.0` / `v21.0`, Threads Graph API `v1.0`, and X API `v2`.

## Core Automation & Operations

### 1. n8n (Orchestration)
- **Role**: Fair-code licensed workflow automation tool. Acts as the orchestrator connecting webhooks from Facebook to Chatwoot, and chaining logic to the AI agents.
- **Access & Configuration**: 
  - **URL**: [https://n8n.11061996.xyz](https://n8n.11061996.xyz)
  - **Login**: Managed via the internal administrator account. Default credentials (if not injected via SSO) are vaulted.
  - **Setup Note**: n8n is configured to execute directly against the Chatwoot PostgreSQL database for advanced queries, bypassing API rate limits when necessary.
- **Dependencies**: Uses an internal PostgreSQL database for execution logging.
- **Documentation**: [Official n8n Docs](https://docs.n8n.io/)

### 2. Chatwoot (Customer Engagement)
- **Role**: Open-source customer engagement platform used as the central inbox. It catches all Facebook and Instagram messages.
- **Access & Configuration**: 
  - **URL**: [https://chatwoot.11061996.xyz](https://chatwoot.11061996.xyz)
  - **Login**: Agents must use their assigned email addresses. The initial Superadmin account is securely vaulted.
  - **Setup Note**: Chatwoot is configured with pre-defined inboxes for each social media channel. Ensure agents are assigned to the correct inbox to see incoming webhooks.
- **Dependencies**: PostgreSQL (storage) and Redis (Sidekiq queues).
- **Documentation**: [Official Chatwoot Docs](https://www.chatwoot.com/hc/)

### 3. Postiz (Social Media Scheduling)
- **Role**: Open-source social media scheduling tool designed for automated posting and AI content creation pipelines.
- **Access & Configuration**: 
  - **URL**: [https://app.caimanlabs.com.mx](https://app.caimanlabs.com.mx)
  - **Login**: The master administrator account is used for global settings.
  - **Setup Note**: **Public user registration is explicitly disabled** for security purposes. New users or team members must be provisioned manually via the database or by an existing admin token.
- **Dependencies**: PostgreSQL, Redis, and Temporal (robust workflow engine ensuring scheduled posts execute reliably).
- **Documentation**: [Official Postiz GitHub](https://github.com/gitroomhq/postiz-app)

## Project & Team Management

### 4. Vikunja (Project Management)
- **Role**: Open-source to-do list and project management application. Used by the team to organize tasks, plan deployments, and assign AI pipeline goals.
- **Access & Configuration**: 
  - **URL**: [https://vikunja.caimanlabs.com.mx](https://vikunja.caimanlabs.com.mx)
  - **Login**: Users can log in using their standard team credentials.
  - **Setup Note**: Projects are organized by namespaces (e.g., Infrastructure, AI Agents, Marketing). Team members require specific namespace invitations to view tasks.
- **Dependencies**: PostgreSQL.
- **Documentation**: [Official Vikunja Docs](https://vikunja.io/docs/)

### 5. Vaultwarden (Secret Management)
- **Role**: Lightweight, self-hosted password manager (compatible with Bitwarden clients). Securely stores API keys for OpenAI, Facebook Graph API, and system passwords.
- **Access & Configuration**: 
  - **URL**: [https://vault.caimanlabs.com.mx](https://vault.caimanlabs.com.mx)
  - **Login**: Access requires the master password.
  - **Setup Note**: Registration is strictly limited to authorized team members. General sign-ups are disabled.
- **Documentation**: [Vaultwarden GitHub](https://github.com/dani-garcia/vaultwarden)

## AI Agents & Knowledge Bases

### 6. Hermes (Conversational Agent)
- **Role**: The primary custom conversational agent logic. It processes inbound intents and context from n8n to generate human-like replies using a Large Language Model.
- **Access (Internal)**: `http://hermes.ai-agent.svc.cluster.local:9119` (Exposed externally via `hermes.11061996.xyz`)
- **Dependencies**: Relies heavily on the vector databases.

### 7. Obsidian Brain
- **Role**: A specialized agent connecting standard Markdown knowledge vaults (synced via Syncthing) to a Qdrant vector database.
- **Dependencies**: **Qdrant** (Vector search engine) and **Syncthing**.

## Utility Scripts (`/scripts/`)

The repository contains vital DevOps CLI scripts to manage the cluster:
- **`setup_postiz_channels.sh`**: Configures API keys for 11+ channels (Facebook, X, LinkedIn, Reddit, Discord, YouTube, Pinterest, TikTok, Threads). It uses `kubectl patch secret` to inject variables dynamically into the `postiz-secrets` object.
- **`subscribe_facebook_page.sh`**: A utility executing a curl request to the Graph API (`/subscribed_apps`) to subscribe a Facebook page to `feed,messages,ratings` webhooks.
- **`verify_facebook_page_token.sh`**: Tests the validity of a Facebook Page Access Token by verifying the `/me` endpoint.

## Infrastructure Layer

- **K3s / Orbstack**: The underlying Kubernetes container orchestration platform.
- **Cloudflare Tunnels (`cloudflared`)**: Provides secure outbound proxying, ensuring the Kubernetes cluster is not exposed directly to the internet.
- **Ingress-Nginx**: The primary Kubernetes ingress controller routing incoming HTTP/HTTPS traffic to internal services based on domain names.
