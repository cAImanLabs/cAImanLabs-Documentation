---
title: Integración de X (Twitter)
description: Configuración de la App de Desarrollador X, integración con Postiz, flujos n8n, CRM Chatwoot, verificación CRC y firmas OAuth 1.0a.
---

Este documento detalla la arquitectura completa end-to-end, configuración en X Developer App, integración con Postiz, automatización con n8n, CRM Chatwoot y la solución técnica para implementar respuestas automáticas con IA en **Cuentas de 𝕏** (`@caimanlabs`).

---

## 1. Arquitectura End-to-End

```mermaid
flowchart TD
    A["Usuario de 𝕏 (@RubeoCoronado) Comenta/Menciona a @cAImanLabs"] -->|Webhook de Actividad 𝕏| B["n8n Webhook: X_CRC_01 (Listener CRC GET y POST)"]
    B -->|Reenviar Payload| C["n8n Webhook: FB_CW_INBOUND_01 (Flujo A)"]
    C -->|Parsear body.data.payload y Extraer Usuario| D["Chatwoot CRM: Buscar/Crear Contacto y Conversación"]
    C -->|Prompt para LLM DeepSeek| E["Respondedor IA Hermes (API DeepSeek Chat)"]
    E -->|Crear Mensaje Saliente| F["API Inbox Chatwoot (/api/v1/accounts/1/conversations/ID/messages)"]
    F -->|Webhook Saliente de Chatwoot| G["n8n Webhook: FB_CW_OUTBOUND_01 (Flujo B)"]
    G -->|Node crypto HMAC-SHA1| H["Firmar Encabezado OAuth 1.0a para @cAImanLabs"]
    H -->|POST /2/tweets| I["Endpoint de Respuesta a Tweet 𝕏 API v2"]
    I --> J["Respuesta Publicada en Vivo en 𝕏"]
```

---

## 2. Metadatos y Credenciales

- **Cuenta de 𝕏**: `@cAImanLabs` (`User ID: 2082229569545981952`)
- **Nombre de la App de Desarrollador**: `cAlmanLabsAppPostiz`
- **Permisos de la App**: `Read and write and Direct message`
- **URL de Redirección / Callback**: `https://app.caimanlabs.com.mx/integrations/social/x`
- **Endpoint Webhook n8n**: `https://api.caimanlabs.com.mx/webhook/x-crc-comments`

---

## 3. Verificación Empírica

- **Comentario Probado**: El usuario `@RubeoCoronado` comentó en la publicación `2084433216690118735`:  
  > *"What is CaimanLabs?, I am interested"* ([Ver Comentario](https://x.com/RubeoCoronado/status/2084501419235668039))
- **Respuesta Publicada por Hermes AI**: Tweet ID `2084502457934033068`  
  > *"@RubeoCoronado cAIman Labs is an AI innovation studio crafting smart, human-centric solutions. We blend research and real-world tools—think intuitive agents, data insights, and creative tech. Glad you're interested! What area sparks your curiosity?"*  
- **Enlace a la Respuesta en Vivo**: [https://x.com/cAImanLabs/status/2084502457934033068](https://x.com/cAImanLabs/status/2084502457934033068)
