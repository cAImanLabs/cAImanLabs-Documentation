---
title: Plataforma de Datos y MCP
description: Colecciones PocketBase, hooks, autenticación y acceso MCP para agentes.
---

PocketBase es el backend compartido de ambos portales. Proporciona autenticación, SQLite, reglas de API, archivos, migraciones y hooks JavaScript del servidor.

## Mapa de colecciones

| Dominio | Colecciones |
| --- | --- |
| Identidad y negocio | `users`, `businesses` |
| Entrega y actividad | `integration_steps`, `activity_log`, `agent_instances`, `channel_connections` |
| Contexto y archivos | `media_assets`, `business_files`, `agent_contexts` |
| Comercio | `products`, `product_variants`, `business_billing`, `billing_invoices` |
| Agenda | `support_appointments`, `reservation_configurations` |

`businesses.owner` es la relación principal de propiedad. Todo dato de cliente se debe limitar por el negocio, no por un identificador confiado desde el navegador.

## Migraciones, hooks y OAuth

- `pb_migrations/` define el esquema. Nunca editar una migración ya desplegada; agregar otra.
- `pb_hooks/` automatiza negocio: usuario nuevo crea negocio, facturación y pasos iniciales; cambios del negocio recalculan las etapas; canales/medios actualizan progreso y actividad.
- El hook admin impide que un usuario normal cambie `is_admin`.
- `agent_contexts` guarda un registro por negocio, tipo de agente y tipo de contexto (`agent_task` o `business_context`). Sus reglas se limitan mediante `business.owner = @request.auth.id`; el cliente correspondiente puede leer y actualizar sus registros.
- Google OAuth se configura en **Collections → users → configuración de colección → OAuth2** y usa `https://api.caimanlabs.com.mx/api/oauth2-redirect` en producción.

Guardar Client Secret de Google solo en PocketBase. No colocarlo en Vite, código fuente ni este repositorio.

## MCP de datos de clientes

`cAImanLabs-ClientPortal/mcp/` es un servidor MCP local por stdio para un agente aprobado; no es una API pública.

| Herramienta | Alcance |
| --- | --- |
| `list_clients` | Busca negocios por nombre o giro. |
| `get_client_context` | Devuelve perfil, canales, agentes, etapas, productos y metadatos de archivos aprobados. |
| `publish_client_information` | Actualiza solo campos permitidos de negocio, información y sitio. |
| `publish_client_progress` | Actualiza una etapa existente. |
| `publish_client_file` | Sube un archivo local aprobado desde el directorio configurado. |

No hay consultas crudas a PocketBase ni exposición de tokens OAuth. El `.env` vive solo en el host de despliegue, tiene permisos `600` y usa un superusuario de servicio dedicado.

## Política del Mac mini / host de operaciones

El Mac mini o host de operaciones **no es un host de compilación**. No dejar allí imágenes o builders Docker, servidores Vite, procesos de build estáticos, runners CI ni artefactos de producción.

Usar OVH para construir imágenes PocketBase y los portales, o un runner CI dedicado que publique artefactos hacia OVH. El túnel SSH se usa solo para acceso operativo:

```bash
ssh -o ProxyCommand="cloudflared access ssh --hostname %h" racc@ssh.11061996.xyz
```

La contraseña SSH es un secreto: no agregarla a comandos, `.env`, documentación ni Git. Se recomienda rotarla si se compartió por otro canal.
