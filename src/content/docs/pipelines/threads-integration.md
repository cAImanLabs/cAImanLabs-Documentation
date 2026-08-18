---
title: Threads Integration
description: Meta Threads Developer App configuration, Postiz platform integration, n8n webhook automation, Chatwoot CRM connection, and container delays.
---

This document details the complete end-to-end architecture, Meta Threads Developer App configuration, Postiz platform integration, n8n webhook automation, Chatwoot CRM connection, and the technical journey/troubleshooting behind implementing live automated AI replies on **Threads Accounts** (`@caimanlabs`).

---

## 1. End-to-End Architecture

```mermaid
flowchart TD
    A["Threads User Comments/Replies on @caimanlabs"] -->|Meta Webhooks (object: threads)| B["n8n Webhook: FB_CW_INBOUND_01 (facebook-comments)"]
    B -->|POSIX Atomic File Lock Check (/tmp/caiman_locks)| C1{Is Duplicate Event?}
    C1 -->|Yes (EEXIST)| C2[Halt Workflow - Prevent Duplicate Reply]
    C1 -->|No (Lock Acquired)| D["Chatwoot CRM: Search/Create Contact & Conversation"]
    D -->|DeepSeek LLM Prompt| E["Hermes AI Responder (DeepSeek Chat API)"]
    E -->|Create Outgoing Message| F["Chatwoot Inbox API (/api/v1/accounts/1/conversations/ID/messages)"]
    F -->|Chatwoot Outbound Webhook| G["n8n Webhook: FB_CW_OUTBOUND_01 (chatwoot-outbound)"]
    G -->|POST /v1.0/me/threads| H["Threads API Create Container (media_type: TEXT, reply_to_id)"]
    H -->|Wait Node 3s| I["Wait for Threads Async Processing"]
    I -->|POST /v1.0/me/threads_publish| J["Threads API Publish Container"]
    J --> K["Live Thread Reply Published on Threads"]
```

---

## 2. Meta Threads Developer App Credentials & Configuration

- **Threads Account**: `@caimanlabs` (`User ID: 27713946624941316`)
- **Meta App Name**: `cAImanLabsThreads`
- **Meta App ID**: `2101325333930056`
- **Threads App ID**: `1389394349973290`
- **Redirect Callback URL**: `https://app.caimanlabs.com.mx/integrations/social/threads`
- **Webhooks Callback URL**: `https://api.caimanlabs.com.mx/webhook/facebook-comments`

---

## 3. The Technical Journey & Solved Issues

### 💡 1. Meta App Type Requirement (`Other -> Consumer`)
- **Symptom**: Threads product was missing from the "Add Products" list in the original Meta App.
- **Solution**: Created a new Meta App with App Type **Other $\rightarrow$ Consumer**, which enables the Threads API product.

### 💡 2. Separate Meta App ID vs Threads App ID
- **Symptom**: OAuth authorization attempted to use Meta App ID instead of Threads App ID.
- **Solution**: Set `THREADS_APP_ID=1389394349973290` specifically in `postiz-secrets` (Threads uses its own dedicated App ID).

### 💡 3. Tester Invitation Acceptance Requirement
- **Symptom**: Log threw `THApiException 100 subcode 10: This action requires the threads_basic permission. You must submit for app review, or your user must be in the list of Threads testers.`
- **Solution**: Added `@caimanlabs` under Threads Testers, opened `https://www.threads.net/settings/account` $\rightarrow$ **Website permissions** $\rightarrow$ **Tester Invitations**, and accepted the invite.

### 💡 4. Meta Webhook Object Matching (`object: threads`)
- **Symptom**: Incoming webhook notifications from Threads were not triggering Hermes AI.
- **Root Cause**: Meta sends Threads webhooks with `object: "threads"` and `entry[0].changes[0].field == "replies"`.
- **Solution**: Updated `Parse & Normalize Payload` in `FB_CW_INBOUND_01` to check `body.object === 'threads' || change?.field === 'replies'`.

### 💡 5. Async Processing Delay in Threads Container Publishing (`error_subcode: 4279009`)
- **Symptom**: Direct calls to `POST /v1.0/me/threads_publish` immediately following container creation failed with:
  > `400 Bad Request: "The requested resource does not exist" (error_subcode 4279009: Contenido multimedia no encontrado)`
- **Root Cause**: Meta Threads API processes text/media containers asynchronously in the background. If `threads_publish` is invoked before background processing finishes (within ~1 second), Threads returns `400 Media container not found`.
- **Solution**: Added a **3-Second Wait Node** (`n8n-nodes-base.wait`) between `Threads API Create Container` and `Threads API Publish Container` to guarantee container readiness before publishing.

### 💡 6. POSIX Atomic File Locking for Sub-Millisecond Race Condition Prevention
- **Symptom**: User comments on Threads occasionally received 2 AI replies for a single comment.
- **Root Cause**: Meta Webhooks occasionally sends sub-millisecond concurrent HTTP POST notifications for a single comment (e.g. at `05:54:04.563` and `05:54:04.862`). Because both webhooks executed concurrently in n8n before in-memory state updated, both instances evaluated `isDuplicate: false` and generated 2 replies.
- **Solution**: Implemented an OS-level POSIX atomic file locking mechanism using Node.js `fs.writeFileSync(lockFile, timestamp, { flag: 'wx' })` inside `Parse & Normalize Payload`.
- **Verification**: Fired 2 parallel webhooks at the exact same millisecond (`05:58:38.822` and `05:58:38.867`) for comment `18129876775639999`:
  - **Execution 365**: Acquired atomic lock (`isDuplicate: false`) $\rightarrow$ Generated 1 Hermes AI reply.
  - **Execution 366**: Failed to acquire lock (`isDuplicate: true`) $\rightarrow$ **Halted instantly at `Filter Event & Loop Guard`**!

---

## 4. Empirical Verification

- **Target User**: `@elbaboperro` / `@joelgarzafigueroa`
- **Target Comment**: `"Hello my name is Babi, what is CiamanLabs?"`
- **Generated Hermes AI Reply**:  
  > *"Hi Babi! 👋 cAIman Labs is where AI meets creativity — we build cutting-edge tools and experiences that blend smart tech with imagination. Think art, automation, and innovation! How can I help you explore?"*
- **Execution Status**: 100% Single-Reply Guaranteed with POSIX Atomic File Locking (`FB_CW_INBOUND_01` version `78df97f8`)
