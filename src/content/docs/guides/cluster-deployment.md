---
title: Cluster Deployment
description: Inventory of running Kubernetes workloads, namespaces, and core services on the server.
---

The infrastructure leverages a lightweight Kubernetes distribution (K3s via Orbstack) to orchestrate all services. Below is a detailed inventory of the deployed workloads grouped by namespace.

<pre class="mermaid">
graph LR
    subgraph "Kubernetes Cluster"
        direction TB
        subgraph "Ingress"
            A[ingress-nginx]
            B[cloudflared tunnel]
        end
        
        subgraph "namespace: api-operations"
            C[n8n]
            D[nango]
        end
        
        subgraph "namespace: chatwoot"
            E[chatwoot-web]
            F[chatwoot-worker]
            G[(chatwoot-postgres)]
            H[(chatwoot-redis)]
        end
        
        subgraph "namespace: postiz"
            I[postiz-web]
            J[(postiz-postgres)]
            K[(postiz-redis)]
        end
        
        subgraph "namespace: ai-agent"
            L[hermes-worker-1]
            M[hermes-worker-2]
            N[(pgvector / qdrant)]
        end
        
        B -->|Incoming Webhooks| A
        A -->|Routes API calls| C
        C -->|Pushes messages| E
        C -->|Calls for generation| L
    end
</pre>

## Namespaces and Workloads

### `ai-agent`
This namespace hosts the custom AI logic, embedding databases, and synchronization tools for the AI brains.

- **Pods:**
  - `chromadb` (1/1) - Vector database for standard document retrieval.
  - `obsidian-qdrant` (1/1) - Vector database specifically configured for the Obsidian Brain integration.
  - `hermes` (2/2) - The primary conversational agent handling inbound routing and intelligent responses.
  - `obsidian-brain` (2/2) - Specialized agent integrating with Obsidian vaults for extended knowledge retrieval.
  - `finance-tracker` (1/1) - Internal tool for tracking metrics/finance tasks.
  - `searxng` (1/1) - Privacy-respecting metasearch engine for the AI agents' web-search capabilities.
  - `skillclaw-server` & `skillclaw-client` (1/1) - Custom skill/tool calling proxy endpoints.
  - `odysseus` (1/1) & `ntfy` (1/1) - Notification and internal sync utilities.

### `api-operations`
This namespace is responsible for the core API gateways and the primary automation orchestrator.

- **Pods:**
  - `n8n` (1/1) - Core visual workflow automation tool (`docker.n8n.io/n8nio/n8n:latest`).
    - **Configuration**: Uses a 5Gi PVC. Injects environment variables to link n8n to Chatwoot internally (`CHATWOOT_BASE_URL: http://chatwoot-web.chatwoot:3000`).
  - `nango-server` & `nango-db` (1/1) - Handles OAuth integrations and API keys securely.
  - `fb-webhook-proxy` (1/1) - Acts as the entrypoint for incoming Facebook Graph API webhooks before they reach Chatwoot or n8n.

### `chatwoot`
Dedicated to the Chatwoot customer engagement suite (`chatwoot-k8s.yaml`).

- **Pods:**
  - `chatwoot-web` (1/1) - Main frontend and API application (`chatwoot/chatwoot:v3.14.0`, Port 3000).
  - `chatwoot-worker` (1/1) - Background job processor (Sidekiq).
  - `chatwoot-postgres` (1/1) - Relational database for Chatwoot. Note: Uses `pgvector/pgvector:pg16` for potential vector storage capabilities.
  - `chatwoot-redis` (1/1) - In-memory cache and queue (`redis:7-alpine`).
  - `chatwoot-db-prepare` - A one-time Job that runs `rails db:chatwoot_prepare` during installation.

### `postiz`
Dedicated to the Postiz social media scheduling suite (`postiz-k8s.yaml`).

- **Pods:**
  - `postiz-rversion` (1/1) - The main Postiz application (Next.js/NestJS application, Port 5000).
  - `postiz-postgres` (1/1) - PostgreSQL state management (`postgres:17-alpine`).
  - `postiz-redis` (1/1) - Redis caching (`redis:7.2-alpine`).
  - `temporal` (1/1) - Workflow engine managing the reliable execution of scheduled posts (`temporalio/auto-setup:1.28.1`, Port 7233).
- **Configuration Details**:
  - Injects API keys via the `postiz-secrets` Kubernetes object.
  - The NGINX ingress handles huge payload sizes (`proxy-body-size: 500m`) to allow large media uploads.
  - **HostPath Patches**: Temporarily maps local developer files directly into the Node.js dist output to hot-patch system logic (e.g., `temporal_register_patch.js`, `posts_service_patch.js`, `post_activity_patch.js`).

### `monitoring` & `kube-system`
Infrastructure and observability tools.

- **Pods:**
  - `cloudflared` - The Cloudflare Tunnel daemon connecting the internal cluster to the external internet securely.
  - `beszel-hub` & `beszel-agent` - System resource monitoring.
  - `uptime-kuma` - Active uptime monitoring and status pages.
  - `ingress-nginx-controller` - The main reverse proxy routing internal HTTP traffic.

## Service Discovery

Services are exposed internally via `ClusterIP` and externally via the `ingress-nginx` controller (LoadBalancer at `192.168.139.2`). Port mappings generally follow standard conventions:
- Databases (Postgres) on port `5432`
- Caches (Redis) on port `6379`
- Web Apps on ports `80`, `3000`, or `8080`.
