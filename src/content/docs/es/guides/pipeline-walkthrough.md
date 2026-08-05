---
title: Recorrido del Pipeline
description: Análisis profundo del flujo de datos, enrutamiento de webhooks de n8n y la integración de IA.
---

Esta guía detalla la arquitectura exacta de los pipelines de automatización ubicados dentro del directorio `n8n-workflows/` del repositorio.

## 1. Orquestación Entrante y de IA (`facebook_chatwoot_inbound_hermes.json`)

**Propósito**: Este flujo de trabajo maestro intercepta los mensajes entrantes, los estandariza entre diferentes plataformas, maneja la deduplicación en el CRM y llama al agente de IA Hermes.

### Flujo Técnico
1. **Recepción de Webhooks y Verificación de Desafíos**: 
   - Utiliza endpoints `GET` para desafíos de verificación (por ejemplo, `hub.mode=subscribe` de Meta y `crc_token` de X).
   - Utiliza endpoints `POST` (`/webhook/facebook-comments`, `/webhook/tiktok-events`) para recibir las cargas útiles (payloads) en formato JSON en tiempo real.
2. **Normalización de Cargas Útiles**: Sin importar la plataforma de origen (DMs de Instagram, Threads, X, Facebook, TikTok), los datos se normalizan en un esquema unificado: `platform`, `comment_id`, `post_id`, `user_id` y `comment_text`.
3. **Bloqueo Atómico de Archivos (Deduplicación)**: Un mecanismo estricto de deduplicación utiliza bloqueos de archivos POSIX (locks) dentro de `/tmp/caiman_locks`. Esto garantiza que los webhooks de alta concurrencia no desencadenen ejecuciones redundantes del agente de IA.
4. **Protección contra Bucles y Filtrado**: El flujo de trabajo ignora activamente los comentarios creados por las propias cuentas de cAImanLabs para evitar bucles infinitos. Si el webhook detecta un nuevo Seguidor en Instagram, se desencadena un DM de Bienvenida especializado vía la API Graph de Meta.
5. **Sincronización del CRM**: El pipeline realiza una llamada al endpoint `GET /contacts/search` de Chatwoot. Resuelve los contactos existentes o crea unos nuevos, y extrae el `conversation_id` activo.
6. **Invocación del Agente de IA**: Se construye un prompt de contexto altamente específico para **Hermes** (el agente embajador de la marca). Se envía una solicitud POST a la API de DeepSeek (`https://api.deepseek.com/chat/completions`) utilizando el modelo `deepseek-chat`. El prompt del sistema restringe las salidas a menos de 280 caracteres con un tono conciso y profesional.
7. **Envío a Chatwoot**: La cadena generada por el LLM se publica en la conversación activa de Chatwoot como un mensaje "saliente" (outgoing).

<pre class="mermaid">
graph TD
    A[Plataforma de Redes Sociales] -->|Webhook POST| B(Webhook de Entrada en n8n)
    B --> C{Tipo de Plataforma}
    C -->|Meta| D[Analizar Facebook/Instagram]
    C -->|X| E[Analizar CRC de Twitter]
    C -->|TikTok| F[Analizar Eventos de TikTok]
    
    D --> G[Normalizar Carga Útil]
    E --> G
    F --> G
    
    G --> H{Comprobar Bloqueo de Archivo POSIX}
    H -->|Existe| I[Descartar Duplicado]
    H -->|Nuevo| J[Crear Bloqueo en /tmp/caiman_locks]
    
    J --> K[Obtener/Crear Conversación de Chatwoot]
    K --> L[POST /analyze-context API DeepSeek]
    L --> M[Enviar Respuesta a Chatwoot]
</pre>

## 2. Entrega Saliente (`facebook_chatwoot_outbound.json`)

**Propósito**: Este flujo de trabajo actúa como un proxy inverso desde Chatwoot hacia las redes sociales nativas.

### Flujo Técnico
1. **Escucha**: Se activa mediante el webhook saliente `message_created` de Chatwoot, filtrando específicamente los mensajes marcados como `outgoing`.
2. **Deduplicación Secundaria**: Emplea otra capa de bloqueo de archivos POSIX para evitar llamadas API de salida duplicadas.
3. **Extracción de la Carga Útil**: Analiza el ID objetivo de destino y la plataforma de origen (`instagram`, `instagram_dm`, `threads`, `x`, `facebook`) desde el campo `content_attributes` de Chatwoot.
4. **Enrutador (Switch) y Llamadas a la API**:
   - **Meta/Facebook**: Llama a `POST https://graph.facebook.com/v20.0/{target_comment_id}/comments`.
   - **Meta/Instagram**: Diferencia entre respuestas públicas (`/replies`) y DMs (`/me/messages` usando v21.0).
   - **Threads**: Requiere un proceso de dos pasos: `POST https://graph.threads.net/v1.0/me/threads` para crear un contenedor, una espera de 3 segundos, y luego `/me/threads_publish`.
   - **X (Twitter)**: Computa de forma segura una firma HMAC-SHA1 de OAuth 1.0a antes de llamar a `POST https://api.x.com/2/tweets`.

## 3. Micro-flujo de Validación de X (Twitter) (`x_crc_workflow.json`)

**Propósito**: Lógica dedicada para satisfacer los Chequeos de Desafío-Respuesta (CRC) de Twitter.
- Genera una firma HMAC-SHA256 codificada en base64 frente al `X_API_SECRET`. Las solicitudes POST válidas se reenvían sin problemas a los webhooks principales de entrada.
