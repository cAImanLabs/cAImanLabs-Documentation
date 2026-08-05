---
title: Despliegue del Clúster
description: Inventario de cargas de trabajo en ejecución en Kubernetes, espacios de nombres y servicios principales en el servidor.
---

La infraestructura utiliza una distribución ligera de Kubernetes (K3s a través de Orbstack) para orquestar todos los servicios. A continuación se presenta un inventario detallado de las cargas de trabajo desplegadas, agrupadas por espacio de nombres (namespace).

<pre class="mermaid">
graph LR
    subgraph "Clúster Kubernetes"
        direction TB
        subgraph "Ingress"
            A[ingress-nginx]
            B[túnel cloudflared]
        end
        
        subgraph "namespace: api-operations"
            C[n8n]
            D[nango]
        end
        
        subgraph "namespace: chatwoot"
            E[chatwoot-web]
            F[chatwoot-worker]
            G[(chatwoot-postgres)]
            H[(chatwoot-redis)]
        end
        
        subgraph "namespace: postiz"
            I[postiz-rversion]
            J[temporal]
            K[(postiz-postgres)]
        end
        
        subgraph "namespace: ai-agent"
            L[hermes]
            M[obsidian-brain]
            N[(chromadb/qdrant)]
        end
        
        A --> C
        A --> E
        A --> I
        C <--> E
        C <--> L
        L <--> N
    end
</pre>

## Espacios de Nombres y Cargas de Trabajo (Workloads)

### `ai-agent`
Este espacio de nombres aloja la lógica de IA personalizada, las bases de datos de embeddings y las herramientas de sincronización para los "cerebros" de IA.

- **Pods:**
  - `chromadb` (1/1) - Base de datos vectorial para recuperación estándar de documentos.
  - `obsidian-qdrant` (1/1) - Base de datos vectorial configurada específicamente para la integración con Obsidian Brain.
  - `hermes` (2/2) - El agente conversacional principal que maneja el enrutamiento de entrada y las respuestas inteligentes.
  - `obsidian-brain` (2/2) - Agente especializado que se integra con bóvedas de Obsidian para la recuperación extendida de conocimientos.
  - `finance-tracker` (1/1) - Herramienta interna para el seguimiento de métricas y tareas financieras.
  - `searxng` (1/1) - Motor de metabúsqueda que respeta la privacidad para las capacidades de búsqueda web de los agentes de IA.
  - `skillclaw-server` & `skillclaw-client` (1/1) - Endpoints proxy personalizados para la llamada de habilidades (skills) y herramientas.
  - `odysseus` (1/1) & `ntfy` (1/1) - Utilidades de notificación y sincronización interna.

### `api-operations`
Este espacio de nombres es responsable de los gateways de API principales y del orquestador de automatización primario.

- **Pods:**
  - `n8n` (1/1) - Herramienta principal de automatización visual de flujos de trabajo (`docker.n8n.io/n8nio/n8n:latest`).
    - **Configuración**: Utiliza un PVC de 5Gi. Inyecta variables de entorno para vincular n8n con Chatwoot internamente (`CHATWOOT_BASE_URL: http://chatwoot-web.chatwoot:3000`).
  - `nango-server` & `nango-db` (1/1) - Gestiona integraciones OAuth y claves API de forma segura.
  - `fb-webhook-proxy` (1/1) - Actúa como el punto de entrada para los webhooks entrantes de Facebook Graph API antes de que lleguen a Chatwoot o n8n.

### `chatwoot`
Dedicado a la suite de interacción con el cliente Chatwoot (`chatwoot-k8s.yaml`).

- **Pods:**
  - `chatwoot-web` (1/1) - Aplicación principal del frontend y API (`chatwoot/chatwoot:v3.14.0`, Puerto 3000).
  - `chatwoot-worker` (1/1) - Procesador de trabajos en segundo plano (Sidekiq).
  - `chatwoot-postgres` (1/1) - Base de datos relacional para Chatwoot. Nota: Utiliza `pgvector/pgvector:pg16` para posibles capacidades de almacenamiento vectorial.
  - `chatwoot-redis` (1/1) - Caché en memoria y cola de mensajes (`redis:7-alpine`).
  - `chatwoot-db-prepare` - Un Job de un solo uso que ejecuta `rails db:chatwoot_prepare` durante la instalación.

### `postiz`
Dedicado a la suite de programación de redes sociales Postiz (`postiz-k8s.yaml`).

- **Pods:**
  - `postiz-rversion` (1/1) - La aplicación principal de Postiz (Aplicación Next.js/NestJS, Puerto 5000).
  - `postiz-postgres` (1/1) - Gestión de estado PostgreSQL (`postgres:17-alpine`).
  - `postiz-redis` (1/1) - Caché Redis (`redis:7.2-alpine`).
  - `temporal` (1/1) - Motor de flujos de trabajo que gestiona la ejecución fiable de publicaciones programadas (`temporalio/auto-setup:1.28.1`, Puerto 7233).
- **Detalles de Configuración**:
  - Inyecta claves API a través del objeto Kubernetes `postiz-secrets`.
  - El ingress NGINX permite tamaños de carga útil enormes (`proxy-body-size: 500m`) para permitir la subida de archivos multimedia grandes.
  - **HostPath Patches**: Mapea temporalmente archivos de desarrollador locales directamente en el directorio de salida (dist) de Node.js para parchear en caliente la lógica del sistema (por ejemplo, `temporal_register_patch.js`, `posts_service_patch.js`, `post_activity_patch.js`).

### `monitoring` & `kube-system`
Herramientas de infraestructura y observabilidad.

- **Pods:**
  - `cloudflared` - El demonio de túneles de Cloudflare que conecta el clúster interno con el internet externo de forma segura.
  - `beszel-hub` & `beszel-agent` - Monitoreo de recursos del sistema.
  - `uptime-kuma` - Monitoreo activo del tiempo de actividad (uptime) y páginas de estado.
  - `ingress-nginx-controller` - El proxy inverso principal que enruta el tráfico HTTP interno.

## Descubrimiento de Servicios (Service Discovery)

Los servicios se exponen internamente a través de `ClusterIP` y externamente mediante el controlador `ingress-nginx` (Balanceador de carga o LoadBalancer en `192.168.139.2`). El mapeo de puertos sigue convenciones estándar:
- Bases de datos (Postgres) en el puerto `5432`
- Cachés (Redis) en el puerto `6379`
- Aplicaciones web en los puertos `80`, `3000` u `8080`.
