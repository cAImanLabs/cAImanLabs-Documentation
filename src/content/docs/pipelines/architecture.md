---
title: E2E Pipeline Architecture
description: Overview of the automated social media publishing, AI customer engagement, CRM, and webhook orchestration platform.
---

This document provides a high-level system overview of the cAIman Labs automated social media publishing, AI customer engagement, CRM management, and webhook orchestration platform.

---

## 1. System Components & Domains

| Service | Subdomain / URL | Namespace | Primary Function |
| :--- | :--- | :--- | :--- |
| **Postiz** | `https://postiz.11061996.xyz` | `postiz` | Multi-channel social media publishing & scheduling platform |
| **Chatwoot** | `https://chatwoot.11061996.xyz` | `chatwoot` | Centralized customer engagement & comment support CRM |
| **n8n Engine** | `https://n8n.11061996.xyz` | `api-operations` | Event orchestration, webhook transformation & pipeline automation |
| **Hermes AI** | `https://hermes.11061996.xyz` | `ai-agent` | AI Agent engine powered by DeepSeek LLM models |
| **Facebook Pages** | `Graph API v20.0` | External | Social media audience channels (Page: `Alternative Media`) |

---

## 2. End-to-End Pipeline Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor Audience as Audience User
    participant FB as Facebook Page ("Alternative Media")
    participant n8n_In as n8n (FB_CW_INBOUND_01)
    participant CW as Chatwoot CRM
    participant Hermes as Hermes AI (DeepSeek)
    participant n8n_Out as n8n (FB_CW_OUTBOUND_01)

    Audience->>FB: Posts Comment on Facebook Page
    FB->>n8n_In: Webhook Event (POST /webhook/facebook-comments)
    n8n_In->>n8n_In: Run Loop Guard & Parse Payload
    n8n_In->>CW: Search Existing Contact (GET /contacts/search)
    alt Contact Not Found
        n8n_In->>CW: Create New Contact (POST /contacts)
    end
    n8n_In->>CW: Find/Create Conversation & Log User Comment
    n8n_In->>Hermes: Request AI Response (POST api.deepseek.com)
    Hermes-->>n8n_In: Return Context-Aware Answer
    n8n_In->>CW: Post Outgoing Message to Chatwoot Conversation
    CW->>n8n_Out: Outbound Webhook (POST /webhook/chatwoot-outbound)
    n8n_Out->>n8n_Out: Extract Facebook Comment ID
    n8n_Out->>FB: Publish Reply (POST /{comment_id}/comments)
    FB-->>Audience: Render AI Reply directly under Comment
```

---

## 3. Kubernetes Network Topology

- **Ingress Controller**: NGINX Ingress Controller routing HTTPS traffic via TLS certificates.
- **Cluster Networking**:
  - `n8n` communicates with `Chatwoot` over internal K8s Service DNS: `http://chatwoot-web.chatwoot:3000`.
  - `n8n` calls `DeepSeek API` directly over HTTPS (`https://api.deepseek.com/v1/chat/completions`).
  - `Postiz` communicates with `postiz-postgres:5432`, `postiz-redis:6379`, and `temporal:7233` within the `postiz` namespace.

---

## 4. Security & Cryptomator Secret Vault

All sensitive API keys, database credentials, JWT secrets, and OAuth access tokens are stored securely outside git in the Cryptomator encrypted vault:
- **Mounted Path**: `/Volumes/Environments-Keys`
- **Master Reference**: `/Volumes/Environments-Keys/MASTER_ENVIRONMENT_KEYS.md`
- **Secrets Included**:
  - `facebook_pages.env` (Meta App ID, Page ID, Permanent Access Token, Webhook Verify Token)
  - `chatwoot.env` (Chatwoot API Token, Account ID, Inbox ID)
  - `hermes_ai.env` (DeepSeek API Key, DeepInfra Key, Bot Tokens)
  - `postiz.env` (Database URL, Redis URL, JWT Secret)
  - `n8n.env` (Trust Proxy settings, Webhook Base URL)
