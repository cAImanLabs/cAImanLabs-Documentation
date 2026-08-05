---
title: Herramientas y Dependencias
description: Desglose detallado de las aplicaciones, frameworks, bases de datos y componentes de la nube.
---

Este documento describe las principales herramientas y tecnologías que se ejecutan dentro del clúster de la infraestructura E2E de cAImanLabs, junto con sus roles, puntos de acceso y referencias oficiales.

## Postura de Seguridad y Cryptomator
> [!IMPORTANT]
> Todas las claves API sensibles, JWTs y Tokens están estrictamente excluidos de Git. Se gestionan dentro de una **bóveda encriptada de Cryptomator** ubicada en `/Volumes/Environments-Keys/MASTER_ENVIRONMENT_KEYS.md` en la máquina anfitriona (host).
> La infraestructura depende en gran medida de la API Graph de Meta `v20.0` / `v21.0`, la API Graph de Threads `v1.0` y la API de X `v2`.

## Automatización Core y Operaciones

### 1. n8n (Orquestación)
- **Rol**: Herramienta de automatización de flujos de trabajo (licencia fair-code). Actúa como el orquestador conectando los webhooks de Facebook a Chatwoot y encadenando la lógica hacia los agentes de IA.
- **Acceso y Configuración**: 
  - **URL**: [https://n8n.11061996.xyz](https://n8n.11061996.xyz)
  - **Inicio de Sesión**: Gestionado a través de la cuenta de administrador interna. Las credenciales predeterminadas (si no se inyectan a través de SSO) están guardadas en la bóveda (vault).
  - **Nota de Configuración**: n8n está configurado para ejecutar consultas avanzadas directamente contra la base de datos PostgreSQL de Chatwoot, evitando los límites de velocidad de la API cuando es necesario.
- **Dependencias**: Utiliza una base de datos PostgreSQL interna para el registro de ejecuciones.
- **Documentación**: [Documentación Oficial de n8n](https://docs.n8n.io/)

### 2. Chatwoot (Interacción con el Cliente)
- **Rol**: Plataforma de código abierto para la interacción con los clientes, utilizada como bandeja de entrada central (inbox). Captura todos los mensajes de Facebook e Instagram.
- **Acceso y Configuración**: 
  - **URL**: [https://chatwoot.11061996.xyz](https://chatwoot.11061996.xyz)
  - **Inicio de Sesión**: Los agentes deben utilizar sus direcciones de correo electrónico asignadas. La cuenta inicial de Superadministrador está guardada de forma segura en la bóveda.
  - **Nota de Configuración**: Chatwoot está configurado con bandejas de entrada (inboxes) predefinidas para cada canal de redes sociales. Asegúrate de que los agentes estén asignados a la bandeja de entrada correcta para ver los webhooks entrantes.
- **Dependencias**: PostgreSQL (almacenamiento) y Redis (colas Sidekiq).
- **Documentación**: [Documentación Oficial de Chatwoot](https://www.chatwoot.com/hc/)

### 3. Postiz (Programación de Redes Sociales)
- **Rol**: Herramienta de código abierto para la programación de redes sociales, diseñada para publicaciones automáticas y pipelines de creación de contenido con IA.
- **Acceso y Configuración**: 
  - **URL**: [https://app.caimanlabs.com.mx](https://app.caimanlabs.com.mx)
  - **Inicio de Sesión**: La cuenta de administrador maestro se utiliza para los ajustes globales.
  - **Nota de Configuración**: **El registro público de usuarios está explícitamente desactivado** por motivos de seguridad. Los nuevos usuarios o miembros del equipo deben ser aprovisionados manualmente a través de la base de datos o mediante un token de administrador existente.
- **Dependencias**: PostgreSQL, Redis y Temporal (motor robusto de flujos de trabajo que asegura la ejecución de publicaciones).
- **Documentación**: [GitHub Oficial de Postiz](https://github.com/gitroomhq/postiz-app)

## Gestión de Proyectos y Equipo

### 4. Vikunja (Gestión de Proyectos - PM)
- **Rol**: Aplicación de código abierto para listas de tareas y gestión de proyectos. Utilizada por el equipo para organizar tareas, planificar despliegues y asignar objetivos a los pipelines de IA.
- **Acceso y Configuración**: 
  - **URL**: [https://vikunja.caimanlabs.com.mx](https://vikunja.caimanlabs.com.mx)
  - **Inicio de Sesión**: Los usuarios pueden iniciar sesión con sus credenciales estándar de equipo.
  - **Nota de Configuración**: Los proyectos están organizados por espacios de nombres (ej., Infraestructura, Agentes IA, Marketing). Los miembros del equipo requieren invitaciones específicas a los espacios de nombres para ver las tareas.
- **Dependencias**: PostgreSQL.
- **Documentación**: [Documentación Oficial de Vikunja](https://vikunja.io/docs/)

### 5. Vaultwarden (Gestión de Secretos/Vaults)
- **Rol**: Gestor de contraseñas ligero y autoalojado (compatible con clientes Bitwarden). Almacena de forma segura las claves API para OpenAI, Facebook Graph API y contraseñas del sistema.
- **Acceso y Configuración**: 
  - **URL**: [https://vault.caimanlabs.com.mx](https://vault.caimanlabs.com.mx)
  - **Inicio de Sesión**: El acceso requiere la contraseña maestra.
  - **Nota de Configuración**: El registro está estrictamente limitado a los miembros autorizados del equipo. Los registros generales están desactivados.
- **Documentación**: [GitHub de Vaultwarden](https://github.com/dani-garcia/vaultwarden)

## Agentes de IA y Bases de Conocimiento

### 6. Hermes (Agente Conversacional)
- **Rol**: La lógica principal del agente conversacional personalizado. Procesa las intenciones entrantes y el contexto desde n8n para generar respuestas similares a las humanas utilizando un LLM.
- **Acceso (Interno)**: `http://hermes.ai-agent.svc.cluster.local:9119` (Expuesto externamente mediante `hermes.11061996.xyz`)
- **Dependencias**: Depende en gran medida de las bases de datos vectoriales.

### 7. Obsidian Brain
- **Rol**: Un agente especializado que conecta bóvedas de conocimiento estándar en Markdown (sincronizadas a través de Syncthing) con una base de datos vectorial Qdrant.
- **Dependencias**: **Qdrant** (Motor de búsqueda vectorial) y **Syncthing**.

## Scripts de Utilidad (`/scripts/`)

El repositorio contiene scripts de CLI DevOps vitales para administrar el clúster:
- **`setup_postiz_channels.sh`**: Configura claves API para más de 11 canales (Facebook, X, LinkedIn, Reddit, Discord, YouTube, Pinterest, TikTok, Threads). Utiliza `kubectl patch secret` para inyectar variables dinámicamente en el objeto `postiz-secrets`.
- **`subscribe_facebook_page.sh`**: Una utilidad que ejecuta una solicitud curl a la Graph API (`/subscribed_apps`) para suscribir una página de Facebook a los webhooks de `feed,messages,ratings`.
- **`verify_facebook_page_token.sh`**: Prueba la validez de un Token de Acceso de Página de Facebook verificando el endpoint `/me`.

## Capa de Infraestructura

- **K3s / Orbstack**: La plataforma subyacente de orquestación de contenedores Kubernetes.
- **Túneles de Cloudflare (`cloudflared`)**: Proporciona un proxy de salida seguro, garantizando que el clúster de Kubernetes no quede expuesto directamente a internet.
- **Ingress-Nginx**: El controlador principal de Kubernetes que enruta el tráfico HTTP/HTTPS entrante hacia los servicios internos basándose en los nombres de dominio.
