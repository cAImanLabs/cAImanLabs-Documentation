---
title: Postiz Deployment Guide
description: Architecture, deployment, container configuration, host patches, and Kubernetes setup for Postiz.
---

This document details the installation, deployment architecture, container configuration, host patches, and Kubernetes setup for **Postiz**, the open-source social media management platform deployed for cAIman Labs.

---

## 1. Overview & Technology Stack

**Postiz** is a self-hosted social media scheduling and post management application. The cAIman Labs instance is deployed in a dedicated Kubernetes namespace (`postiz`) on an OrbStack/K3s single-node cluster with Cloudflare ingress routing.

### Key Technologies Used
- **Orchestration**: Kubernetes (`v1.30+`)
- **Backend / Web UI**: Next.js & NestJS (`postiz-rversion:latest`)
- **Database**: PostgreSQL 17 Alpine (`StatefulSet` + 5Gi PVC)
- **Caching & Queue**: Redis 7.2 Alpine
- **Workflow / Job Scheduler**: Temporal Workflow Engine (`temporalio/auto-setup:1.28.1`)
- **Ingress Controller**: NGINX Ingress Controller + Cloudflare Tunnel
- **Domain Endpoint**: `https://postiz.11061996.xyz` / `https://app.caimanlabs.com.mx`

---

## 2. Kubernetes Architecture Diagram

```mermaid
graph TD
    A["User / Web Browser"] -->|HTTPS| B["Cloudflare Tunnel / NGINX Ingress"]
    B -->|Host: postiz.11061996.xyz| C["Service: postiz-rversion (Port 5000)"]
    C --> D["Deployment: postiz-rversion (Next.js + NestJS)"]
    D -->|PostgreSQL Protocol :5432| E["StatefulSet: postiz-postgres (PG 17)"]
    D -->|Redis Protocol :6379| F["Deployment: postiz-redis (Redis 7.2)"]
    D -->|gRPC :7233| G["Deployment: temporal (Temporal Engine)"]
    G -->|Persistence| E
```

---

## 3. Microservice Components

### A. Main App Container (`postiz-rversion`)
- **Image**: `postiz-rversion:latest`
- **Exposed Port**: `5000`
- **Environment Variables**:
  - `MAIN_URL`: `https://app.caimanlabs.com.mx`
  - `FRONTEND_URL`: `https://app.caimanlabs.com.mx`
  - `NEXT_PUBLIC_BACKEND_URL`: `https://app.caimanlabs.com.mx/api`
  - `DATABASE_URL`: `postgresql://postiz-user:*****@postiz-postgres:5432/postiz-db`
  - `REDIS_URL`: `redis://postiz-redis:6379`
  - `TEMPORAL_ADDRESS`: `temporal:7233`
  - `STORAGE_PROVIDER`: `local`
  - `UPLOAD_DIRECTORY`: `/uploads`

### B. HostPath Volume Patches
To patch runtime dependencies and custom temporal registration logic, three HostPath volume mounts are injected into `postiz-rversion`:
1. `/Users/racc/temporal_register_patch.js` $\rightarrow$ `/app/apps/backend/dist/libraries/nestjs-libraries/src/temporal/temporal.register.js`
2. `/Users/racc/posts_service_patch.js` $\rightarrow$ `/app/apps/backend/dist/libraries/nestjs-libraries/src/database/prisma/posts/posts.service.js`
3. `/Users/racc/post_activity_patch.js` $\rightarrow$ `/app/apps/orchestrator/dist/apps/orchestrator/src/activities/post.activity.js`

### C. PostgreSQL Database (`postiz-postgres`)
- **Image**: `postgres:17-alpine`
- **Storage**: `StatefulSet` with `volumeClaimTemplates` requesting `5Gi` storage (`ReadWriteOnce`).
- **Secret Reference**: Mounts `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` from `postiz-secrets`.

### D. Caching & Queue (`postiz-redis`)
- **Image**: `redis:7.2-alpine`
- **Service**: `postiz-redis.postiz.svc.cluster.local:6379`

### E. Temporal Workflow Engine (`temporal`)
- **Image**: `temporalio/auto-setup:1.28.1`
- **Database Backend**: Configured to auto-setup schema in `postiz-postgres`.
- **Environment Variables**:
  - `DB`: `postgres12`
  - `POSTGRES_SEEDS`: `postiz-postgres`
  - `TEMPORAL_NAMESPACE`: `default`

---

## 4. Deployment Instructions

### Prerequisites
- Kubernetes cluster active with NGINX Ingress Controller installed.
- Persistent Volume Provisioner active.

### Deployment Steps
1. Apply the unified Postiz Kubernetes manifest:
   ```bash
   kubectl apply -f kubernetes/postiz-k8s.yaml
   ```

2. Monitor deployment status until all pods are `Running`:
   ```bash
   kubectl get pods -n postiz -w
   ```

3. Verify Ingress endpoint:
   ```bash
   curl -I https://app.caimanlabs.com.mx
   ```
