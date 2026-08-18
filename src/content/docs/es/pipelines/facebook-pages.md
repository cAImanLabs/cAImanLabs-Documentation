---
title: Integración de Páginas de Facebook
description: Arquitectura end-to-end, configuración, flujos n8n, integración con CRM Chatwoot y agente Hermes AI para Facebook Pages.
---

Este documento detalla la arquitectura end-to-end, configuración, flujos de trabajo n8n, integración con CRM Chatwoot y la integración del agente de IA Hermes para Páginas de Facebook.

---

## 1. Visión General de la Arquitectura

```mermaid
graph TD
    A["Usuario comenta en Página de Facebook ('Alternative Media')"] -->|Meta Webhook POST| B["n8n: FB_CW_INBOUND_01"]
    B -->|Verificar Evento y Loop Guard| C{"¿Loop Guard Aprobado?"}
    C -->|Sí| D["Buscar Contacto en Chatwoot (GET /contacts/search)"]
    D --> E{"¿Existe el Contacto?"}
    E -->|No| F["Crear Contacto (POST /contacts)"]
    E -->|Sí| G["Reutilizar ID de Contacto Existente"]
    F --> G
    G --> H["Buscar/Crear Conversación (POST /conversations)"]
    H --> I["Publicar Comentario Entrante en Chatwoot"]
    I --> J["Invocar Hermes AI (DeepSeek / chat.completions)"]
    J --> K["Publicar Respuesta de Hermes AI en Chatwoot (saliente)"]
    K -->|Webhook Saliente de Chatwoot| L["n8n: FB_CW_OUTBOUND_01"]
    L -->|Extraer ID del Comentario| M["Meta Graph API (POST /{comment_id}/comments)"]
    M --> N["Respuesta de IA Publicada como Comentario en Facebook"]
```

---

## 2. Metadatos de la App y Página de Facebook

- **Nombre de la App**: `Testing Postiz Working`
- **ID de la App**: `1462110212613281`
- **Modo de la App**: Desarrollo / Negocios
- **Página Objetivo**: `Alternative Media`
- **ID de la Página**: `107444744207055`
- **Campos Suscritos**: `feed`, `messages`, `ratings`
- **Endpoint Webhook**: `https://api.caimanlabs.com.mx/webhook/facebook-comments`
