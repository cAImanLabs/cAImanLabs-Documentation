---
title: Pipeline Walkthrough
description: Deep dive into the data flow, n8n webhook routing, and AI integration.
---

This guide details the exact architecture of the automation pipelines located within the `n8n-workflows/` directory of the repository.

## 1. Inbound & AI Orchestration (`facebook_chatwoot_inbound_hermes.json`)

**Purpose**: This master workflow intercepts incoming messages, standardizes them across platforms, handles CRM deduplication, and summons the Hermes AI agent.

### Technical Flow
1. **Webhook Reception & Challenge Parsing**: 
   - Uses `GET` endpoints for verification challenges (e.g., Meta's `hub.mode=subscribe` and X's `crc_token`).
   - Uses `POST` endpoints (`/webhook/facebook-comments`, `/webhook/tiktok-events`) to receive live JSON payloads.
2. **Payload Normalization**: Regardless of the origin platform (Instagram DMs, Threads, X, Facebook, TikTok), the data is normalized into a unified schema: `platform`, `comment_id`, `post_id`, `user_id`, and `comment_text`.
3. **Atomic File Locking (Deduplication)**: A strict deduplication mechanism utilizes POSIX lock files within `/tmp/caiman_locks`. This guarantees that high-concurrency webhooks do not trigger redundant AI agent executions.
4. **Loop Guard & Filtering**: The workflow actively ignores comments authored by cAImanLabs' own platform accounts to prevent infinite loops. If the webhook detects a new Instagram Follower, it triggers a specialized Welcome DM via the Meta Graph API.
5. **CRM Synchronization**: The pipeline calls the Chatwoot `GET /contacts/search` endpoint. It resolves existing contacts or provisions new ones and extracts the active `conversation_id`.
6. **AI Agent Invocation**: A highly specific context prompt is constructed for **Hermes** (the AI brand ambassador). A POST request is dispatched to the DeepSeek API (`https://api.deepseek.com/chat/completions`) utilizing the `deepseek-chat` model. The system prompt restricts outputs to under 280 characters with a concise, professional tone.
7. **Chatwoot Dispatch**: The LLM-generated string is posted to the active Chatwoot conversation as an "outgoing" message.

<pre class="mermaid">
graph TD
    A[Social Media Platform] -->|Webhook POST| B(n8n Inbound Webhook)
    B --> C{Platform Type}
    C -->|Meta| D[Parse Facebook/Instagram]
    C -->|X| E[Parse Twitter CRC]
    C -->|TikTok| F[Parse TikTok Events]
    
    D --> G[Normalize Payload]
    E --> G
    F --> G
    
    G --> H{POSIX File Lock Check}
    H -->|Exists| I[Drop Duplicate]
    H -->|New| J[Create Lock in /tmp/caiman_locks]
    
    J --> K[Fetch/Create Chatwoot Conversation]
    K --> L[POST /analyze-context DeepSeek API]
    L --> M[Push Reply to Chatwoot]
</pre>

## 2. Outbound Delivery (`facebook_chatwoot_outbound.json`)

**Purpose**: This workflow acts as the reverse-proxy from Chatwoot back to the native social media networks.

### Technical Flow
1. **Listener**: Triggers via Chatwoot's outbound `message_created` webhook, specifically filtering for `outgoing` messages.
2. **Secondary Deduplication**: Employs another layer of POSIX file locking to prevent duplicate outbound API calls.
3. **Payload Extraction**: Parses the destination target ID and original source platform (`instagram`, `instagram_dm`, `threads`, `x`, `facebook`) from Chatwoot's `content_attributes`.
4. **Switch Router & API Dispatches**:
   - **Meta/Facebook**: Calls `POST https://graph.facebook.com/v20.0/{target_comment_id}/comments`.
   - **Meta/Instagram**: Differentiates between public replies (`/replies`) and DMs (`/me/messages` using v21.0).
   - **Threads**: Requires a two-step process: `POST https://graph.threads.net/v1.0/me/threads` to create a container, a 3-second wait, followed by `/me/threads_publish`.
   - **X (Twitter)**: Computes a secure OAuth 1.0a HMAC-SHA1 signature before hitting `POST https://api.x.com/2/tweets`.

## 3. X (Twitter) Validation Micro-workflow (`x_crc_workflow.json`)

**Purpose**: Dedicated logic to satisfy Twitter's Challenge-Response Checks (CRC).
- Generates a base64 encoded HMAC-SHA256 signature against the `X_API_SECRET`. Valid POST requests are seamlessly forwarded to the primary inbound webhooks.
