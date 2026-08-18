---
title: Instagram Pages & DMs
description: Meta Instagram Business API setup, n8n webhook automation, Chatwoot CRM connection, Comments, DMs, and Follower Welcome DMs.
---

This document details the complete end-to-end architecture, Meta Instagram Business API setup, n8n webhook automation, Chatwoot CRM connection, and the technical implementation behind **Instagram Comments**, **Immediate Private Direct Message (DM) Replies**, and **New Follower Welcome DMs** for `@caimanlabs`.

---

## 1. End-to-End Architecture

```mermaid
flowchart TD
    subgraph Inbound ["1. Instagram Inbound Webhooks"]
        IG_USER["Instagram User"] -->|Comment on Post| W1["Meta Webhook (field: comments)"]
        IG_USER -->|Send Direct Message| W2["Meta Webhook (messaging.message)"]
        IG_USER -->|Follow @caimanlabs| W3["Meta Webhook (messaging.follow)"]
    end

    subgraph Ingress ["2. K8s Ingress & Proxy"]
        W1 & W2 & W3 --> CF["Cloudflare Edge (api.caimanlabs.com.mx)"]
        CF --> NGINX["Ingress Nginx (api-operations)"]
        NGINX --> PROXY["fb-webhook-proxy:8080"]
        PROXY --> N8N_IN["n8n: FB_CW_INBOUND_01 (/webhook/facebook-comments)"]
    end

    subgraph Normalization ["3. Normalization & AI Generation (FB_CW_INBOUND_01)"]
        N8N_IN --> N1["Parse & Normalize Payload"]
        N1 -->|POSIX Atomic Lock (/tmp/caiman_locks/)| C1{Is Duplicate?}
        C1 -->|Yes| C2[Drop Event]
        C1 -->|No - Follow Event| DM1["Send IG Follower Welcome DM (POST /v21.0/me/messages)"]
        C1 -->|No - Comment/DM| CW["Chatwoot: Find/Create Contact & Conversation"]
        CW --> Hermes["Hermes AI (DeepSeek LLM)"]
        Hermes --> CW_OUT["Post Outgoing Message to Chatwoot Conversation"]
    end

    subgraph Outbound ["4. Outbound Dispatch & Multi-Channel Publisher (FB_CW_OUTBOUND_01)"]
        CW_OUT -->|Chatwoot Outbound Webhook| LOCK{POSIX Outbound Lock (/tmp/caiman_outbound_locks/)}
        LOCK -->|Duplicate Event| C3[Drop Duplicate]
        LOCK -->|First Event| ROUTER{Platform Switch Router}
        ROUTER -->|instagram| PUB["Meta IG Graph API Reply (POST /v21.0/{comment_id}/replies)"]
        ROUTER -->|instagram| PRIV["Meta IG Direct Message Reply (POST /v21.0/me/messages)"]
        PUB --> LIVE1["Live Instagram Public Comment Reply Published"]
        PRIV --> LIVE2["Live Instagram Private DM Reply Sent"]
    end
```

---

## 2. Implemented Capabilities & Features

### 📩 1. New Follower Welcome DM
- **Event Trigger**: Meta Webhook `messaging.follow` or `messaging.postback` (`field: follows`).
- **Action**: Immediately fires `POST https://graph.facebook.com/v21.0/me/messages` using `FB_PAGE_ACCESS_TOKEN`.
- **Recipient Payload**: `{ "recipient": { "id": "<user_id>" } }`
- **Welcome Message**:
  > *"Hey there, thanks for following cAIman Labs! 🐊\n\nLooking for AI automation solutions for starting, building, or scaling your business?"*

### 💭 2. Instagram Post Comments: Dual Response (Public Reply + Private DM)
When a user posts a comment on any `@caimanlabs` Instagram post:
1. **Public Comment Reply**:
   - **Endpoint**: `POST https://graph.facebook.com/v21.0/{comment_id}/replies`
   - **Payload**: `{ "message": "<hermes_ai_reply>" }`
   - **Result**: Posts an official reply comment under the user's comment on the public post.
2. **Private Direct Message Reply**:
   - **Endpoint**: `POST https://graph.facebook.com/v21.0/me/messages`
   - **Payload**:
     ```json
     {
       "recipient": {
         "comment_id": "<comment_id>"
       },
       "message": {
         "text": "<hermes_ai_reply>"
       }
     }
     ```
   - **Result**: Opens a 1-on-1 private DM thread directly with the user originating from their post comment.

### 💬 3. Direct Message (DM) Auto-Replies
- **Event Trigger**: Meta Webhook `messaging.message` (non-echo).
- **Processing**:
  - `FB_CW_INBOUND_01` normalizes the event as `platform: instagram_dm` and extracts `sender.id`.
  - Chatwoot conversation is created/updated under the user's IG Scoped ID.
  - Hermes AI generates a friendly, professional response tailored under 280 characters.
  - Message is tagged with `content_attributes: { platform: "instagram_dm", instagram_user_id: sender_id }`.
- **Outbound Publishing**:
  - `FB_CW_OUTBOUND_01` routes through the `instagram_dm` switch branch.
  - Executes `POST https://graph.facebook.com/v21.0/me/messages` with `{ recipient: { id: target_user_id }, message: { text: content } }`.

---

## 3. High-Reliability Safeguards & Deduplication

### 🔒 Two-Layer POSIX Atomic File Locking
To prevent duplicate replies caused by microsecond-level concurrent webhooks from Meta and duplicate outbound dispatches from Chatwoot:
1. **Inbound Layer (`FB_CW_INBOUND_01`)**:
   - Lock Path: `/tmp/caiman_locks/{comment_id}.lock`
   - Prevents duplicate Chatwoot conversation creation if Meta retries the inbound webhook.
2. **Outbound Layer (`FB_CW_OUTBOUND_01`)**:
   - Lock Path: `/tmp/caiman_outbound_locks/{chatwoot_message_id}.lock`
   - Chatwoot emits multiple outbound events (`message_created`, `conversation_updated`) for a single message. The outbound atomic lock ensures **only the first `message_created` event** acquires the lock and dispatches the API calls. Redundant webhooks are dropped with zero side effects.
