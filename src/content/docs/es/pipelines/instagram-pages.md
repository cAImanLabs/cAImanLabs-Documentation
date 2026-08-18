---
title: Páginas y DMs de Instagram
description: Configuración de la API de Instagram Business, automatización con n8n, respuestas duales y DMs de bienvenida a nuevos seguidores.
---

Este documento detalla la arquitectura completa end-to-end, configuración de la API de Instagram Business de Meta, automatizaciones de webhooks con n8n, conexión con CRM Chatwoot e implementación técnica para **Comentarios de Instagram**, **Respuestas Privadas por DM** y **DMs de Bienvenida a Nuevos Seguidores** para `@caimanlabs`.

---

## 1. Arquitectura End-to-End

```mermaid
flowchart TD
    subgraph Inbound ["1. Webhooks Entrantes de Instagram"]
        IG_USER["Usuario de Instagram"] -->|Comentario en Publicación| W1["Meta Webhook (field: comments)"]
        IG_USER -->|Envía Mensaje Directo| W2["Meta Webhook (messaging.message)"]
        IG_USER -->|Sigue a @caimanlabs| W3["Meta Webhook (messaging.follow)"]
    end

    subgraph Ingress ["2. Ingress & Proxy K8s"]
        W1 & W2 & W3 --> CF["Cloudflare Edge (api.caimanlabs.com.mx)"]
        CF --> NGINX["Ingress Nginx (api-operations)"]
        NGINX --> PROXY["fb-webhook-proxy:8080"]
        PROXY --> N8N_IN["n8n: FB_CW_INBOUND_01 (/webhook/facebook-comments)"]
    end

    subgraph Normalization ["3. Normalización y Generación de IA (FB_CW_INBOUND_01)"]
        N8N_IN --> N1["Parsear y Normalizar Payload"]
        N1 -->|Bloqueo Atómico POSIX (/tmp/caiman_locks/)| C1{¿Es Duplicado?}
        C1 -->|Sí| C2[Descartar Evento]
        C1 -->|No - Evento de Seguimiento| DM1["Enviar DM de Bienvenida a Seguidor (POST /v21.0/me/messages)"]
        C1 -->|No - Comentario/DM| CW["Chatwoot: Buscar/Crear Contacto y Conversación"]
        CW --> Hermes["Hermes AI (DeepSeek LLM)"]
        Hermes --> CW_OUT["Publicar Mensaje Saliente en Chatwoot"]
    end

    subgraph Outbound ["4. Despacho Saliente (FB_CW_OUTBOUND_01)"]
        CW_OUT -->|Webhook Saliente Chatwoot| LOCK{Bloqueo Saliente POSIX (/tmp/caiman_outbound_locks/)}
        LOCK -->|Evento Duplicado| C3[Descartar Duplicado]
        LOCK -->|Primer Evento| ROUTER{Enrutador por Plataforma}
        ROUTER -->|instagram| PUB["Respuesta Comentario Público (POST /v21.0/{comment_id}/replies)"]
        ROUTER -->|instagram| PRIV["Respuesta Privada DM (POST /v21.0/me/messages)"]
        PUB --> LIVE1["Respuesta Pública Publicada en Instagram"]
        PRIV --> LIVE2["DM Privado Enviado en Instagram"]
    end
```

---

## 2. Capacidades e Implementaciones

### 📩 1. DM de Bienvenida a Nuevos Seguidores
- **Disparador**: Webhook de Meta `messaging.follow` o `messaging.postback`.
- **Acción**: Ejecuta `POST https://graph.facebook.com/v21.0/me/messages` usando `FB_PAGE_ACCESS_TOKEN`.
- **Mensaje**:
  > *"Hey there, thanks for following cAIman Labs! 🐊\n\nLooking for AI automation solutions for starting, building, or scaling your business?"*

### 💭 2. Comentarios en Publicaciones: Respuesta Dual (Comentario Público + DM Privado)
Cuando un usuario comenta en cualquier publicación de `@caimanlabs`:
1. **Respuesta Pública**: Se publica mediante `POST https://graph.facebook.com/v21.0/{comment_id}/replies`.
2. **Respuesta por Mensaje Directo Privado**: Se abre una conversación directa mediante `POST https://graph.facebook.com/v21.0/me/messages` pasando `"recipient": { "comment_id": "<comment_id>" }`.

---

## 3. Mecanismos de Alta Disponibilidad y Deduplicación

### 🔒 Bloqueo de Archivos Atómico POSIX en Dos Capas
- **Capa Entrante (`FB_CW_INBOUND_01`)**: `/tmp/caiman_locks/{comment_id}.lock` evita la duplicación de conversaciones en Chatwoot cuando Meta reintenta un webhook.
- **Capa Saliente (`FB_CW_OUTBOUND_01`)**: `/tmp/caiman_outbound_locks/{chatwoot_message_id}.lock` garantiza que solo la primera notificación de Chatwoot despache llamadas a la API de Meta.
