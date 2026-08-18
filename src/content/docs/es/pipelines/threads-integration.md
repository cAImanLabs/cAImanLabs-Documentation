---
title: Integración de Threads
description: Configuración de la App de Desarrollador Threads de Meta, integración con Postiz, automatización con n8n y manejo de delays asíncronos.
---

Este documento detalla la arquitectura completa end-to-end, configuración de la App de Desarrollador Threads de Meta, integración con Postiz, automatización con n8n, conexión con CRM Chatwoot e implementación técnica para respuestas automáticas con IA en **Cuentas de Threads** (`@caimanlabs`).

---

## 1. Arquitectura End-to-End

```mermaid
flowchart TD
    A["Usuario de Threads Comenta/Responde a @caimanlabs"] -->|Meta Webhooks (object: threads)| B["n8n Webhook: FB_CW_INBOUND_01 (facebook-comments)"]
    B -->|Bloqueo de Archivo Atómico POSIX (/tmp/caiman_locks)| C1{¿Es Evento Duplicado?}
    C1 -->|Sí (EEXIST)| C2[Detener Flujo - Evitar Respuesta Duplicada]
    C1 -->|No (Bloqueo Adquirido)| D["Chatwoot CRM: Buscar/Crear Contacto y Conversación"]
    D -->|Prompt para LLM DeepSeek| E["Respondedor IA Hermes (API DeepSeek Chat)"]
    E -->|Crear Mensaje Saliente| F["API Inbox Chatwoot (/api/v1/accounts/1/conversations/ID/messages)"]
    F -->|Webhook Saliente Chatwoot| G["n8n Webhook: FB_CW_OUTBOUND_01 (chatwoot-outbound)"]
    G -->|POST /v1.0/me/threads| H["Threads API Crear Contenedor (media_type: TEXT, reply_to_id)"]
    H -->|Nodo de Espera 3s| I["Espera por Procesamiento Asíncrono de Threads"]
    I -->|POST /v1.0/me/threads_publish| J["Threads API Publicar Contenedor"]
    J --> K["Respuesta Publicada en Vivo en Threads"]
```

---

## 2. Metadatos de la App y Credenciales

- **Cuenta de Threads**: `@caimanlabs` (`User ID: 27713946624941316`)
- **Nombre de la App Meta**: `cAImanLabsThreads`
- **ID de App Meta**: `2101325333930056`
- **ID de App Threads**: `1389394349973290`
- **URL de Redirección Callback**: `https://app.caimanlabs.com.mx/integrations/social/threads`
- **URL Callback de Webhooks**: `https://api.caimanlabs.com.mx/webhook/facebook-comments`

---

## 3. Descubrimientos Técnicos y Soluciones

### 💡 1. Tipo de App Meta (`Otros -> Consumer`)
- **Causa Raíz**: El producto Threads no aparecía en apps de tipo Business.
- **Solución**: Se creó una App de tipo **Otros $\rightarrow$ Consumer**, la cual habilita el producto Threads API.

### 💡 2. Retardo Asíncrono al Publicar Contenedores (`error_subcode: 4279009`)
- **Causa Raíz**: La API de Threads procesa contenedores asíncronamente en background. Ejecutar `threads_publish` de forma inmediata provoca `400 Media container not found`.
- **Solución**: Se añadió un **Nodo de Espera de 3 Segundos** (`n8n-nodes-base.wait`) entre la creación del contenedor y la publicación.

---

## 4. Verificación Empírica

- **Usuario Objetivo**: `@elbaboperro` / `@joelgarzafigueroa`
- **Comentario Objetivo**: `"Hello my name is Babi, what is CiamanLabs?"`
- **Respuesta de Hermes AI**:  
  > *"Hi Babi! 👋 cAIman Labs is where AI meets creativity — we build cutting-edge tools and experiences that blend smart tech with imagination. Think art, automation, and innovation! How can I help you explore?"*
- **Garantía**: 100% Respuesta Única garantizada con bloqueo atómico POSIX en SO.
