---
title: Arquitectura de Pipelines E2E
description: Resumen del sistema de publicación automatizada en redes sociales, atención al cliente con IA, CRM y orquestación de webhooks.
---

Este documento proporciona una visión general del sistema automatizado de cAIman Labs para publicación en redes sociales, atención al cliente con IA, gestión en CRM y orquestación mediante webhooks.

---

## 1. Componentes del Sistema y Dominios

| Servicio | Subdominio / URL | Namespace | Función Principal |
| :--- | :--- | :--- | :--- |
| **Postiz** | `https://app.caimanlabs.com.mx` | `postiz` | Plataforma multicanal de publicación y programación en redes sociales |
| **Chatwoot** | `https://chatwoot.11061996.xyz` | `chatwoot` | CRM centralizado de atención al cliente y soporte |
| **Motor n8n** | `https://api.caimanlabs.com.mx` | `api-operations` | Orquestación de eventos, transformación de webhooks y automatización |
| **Hermes AI** | `https://hermes.11061996.xyz` | `ai-agent` | Agente de IA impulsado por modelos DeepSeek LLM |
| **Páginas de Facebook** | `Graph API v20.0` | Externo | Canales sociales de audiencia (Página: `Alternative Media`) |

---

## 2. Flujo de Datos E2E

```mermaid
sequenceDiagram
    autonumber
    actor Audiencia as Usuario de Audiencia
    participant FB as Página de Facebook ("Alternative Media")
    participant n8n_In as n8n (FB_CW_INBOUND_01)
    participant CW as Chatwoot CRM
    participant Hermes as Hermes AI (DeepSeek)
    participant n8n_Out as n8n (FB_CW_OUTBOUND_01)

    Audiencia->>FB: Publica un comentario en la Página de Facebook
    FB->>n8n_In: Evento Webhook (POST /webhook/facebook-comments)
    n8n_In->>n8n_In: Ejecuta Loop Guard y procesa el Payload
    n8n_In->>CW: Busca Contacto Existente (GET /contacts/search)
    alt Contacto No Encontrado
        n8n_In->>CW: Crea Nuevo Contacto (POST /contacts)
    end
    n8n_In->>CW: Busca/Crea Conversación y registra el Comentario
    n8n_In->>Hermes: Solicita Respuesta a la IA (POST api.deepseek.com)
    Hermes-->>n8n_In: Devuelve Respuesta Basada en Contexto
    n8n_In->>CW: Publica Mensaje Saliente en la Conversación de Chatwoot
    CW->>n8n_Out: Webhook Saliente (POST /webhook/chatwoot-outbound)
    n8n_Out->>n8n_Out: Extrae el ID del Comentario de Facebook
    n8n_Out->>FB: Publica Respuesta (POST /{comment_id}/comments)
    FB-->>Audiencia: Muestra Respuesta de IA directamente bajo el Comentario
```

---

## 3. Topología de Red en Kubernetes

- **Controlador Ingress**: NGINX Ingress Controller enrutando tráfico HTTPS mediante certificados TLS.
- **Red Interna del Clúster**:
  - `n8n` se comunica con `Chatwoot` a través del DNS interno del clúster: `http://chatwoot-web.chatwoot:3000`.
  - `n8n` llama directamente a la API de `DeepSeek` sobre HTTPS (`https://api.deepseek.com/v1/chat/completions`).
  - `Postiz` se comunica con `postiz-postgres:5432`, `postiz-redis:6379` y `temporal:7233` dentro del namespace `postiz`.

---

## 4. Bóveda de Secretos y Seguridad

Todas las claves API, credenciales de base de datos, secretos JWT y tokens OAuth se almacenan de forma segura fuera del repositorio en la bóveda cifrada Cryptomator:
- **Ruta Montada**: `/Volumes/Environments-Keys`
- **Referencia Maestra**: `/Volumes/Environments-Keys/MASTER_ENVIRONMENT_KEYS.md`
