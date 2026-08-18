---
title: Data Platform & MCP
description: PocketBase collections, automation hooks, authentication and MCP agent access.
---

PocketBase is the shared backend for Client Portal and Admin Portal. It provides authentication, SQLite persistence, API rules, uploaded-file storage, migrations and server-side JavaScript hooks.

## Collection map

| Domain | Collections |
| --- | --- |
| Identity and business | `users`, `businesses` |
| Delivery and activity | `integration_steps`, `activity_log`, `agent_instances`, `channel_connections` |
| Context and files | `media_assets`, `business_files`, `agent_contexts` |
| Commerce | `products`, `product_variants`, `business_billing`, `billing_invoices` |
| Scheduling | `support_appointments`, `reservation_configurations` |

`businesses.owner` is the core ownership relation. All client data must be scoped through that business rather than trusting a client-side identifier alone.

## Migrations and hooks

- `pb_migrations/` defines the schema and must be committed with every schema change. Do not edit a migration that is already deployed; add a new migration instead.
- `pb_hooks/` contains business automation. New users bootstrap a business, a billing record and generic onboarding steps.
- Business changes recalculate the applicable implementation stages. Channel and media hooks update associated progress/activity safely.
- The admin-access hook prevents a normal user from setting `is_admin` themselves.
- `agent_contexts` stores one record per business, agent type and context kind (`agent_task` or `business_context`). Its access rules are scoped through `business.owner = @request.auth.id`; the matching client can read and update its records. Its hook updates the related Plan stages from those two real inputs.

## OAuth

Google OAuth is configured in PocketBase under **Collections → users → collection settings → OAuth2**. The Google redirect URI in production is:

```text
https://api.caimanlabs.com.mx/api/oauth2-redirect
```

Store the Google client secret only in PocketBase. Do not put it in Vite environment variables, source code or this documentation repository.

## Client Data MCP

`cAImanLabs-ClientPortal/mcp/` is a local, stdio MCP server for an approved AI agent. It is not a public API.

| Tool | Scope |
| --- | --- |
| `list_clients` | Finds business records by name or industry. |
| `get_client_context` | Returns the selected client’s approved profile, channels, agents, agent context, stages, inventory, reservation configuration, files and media metadata. |
| `publish_client_information` | Updates only allowed business, information and website fields. |
| `publish_client_progress` | Updates an existing implementation step. |
| `publish_client_file` | Uploads an approved local file from the configured upload directory. |
| `publish_client_media` | Uploads an approved image or video into Images & videos. |
| `publish_social_channels` | Synchronizes the approved channel selection and DM preference; it never handles OAuth. |
| `publish_agent_context` | Saves the approved task definition or business knowledge for an enabled agent. |
| `publish_reservation_configuration` | Saves the reservation resource table, booking method and rules. |
| `publish_inventory_columns` | Saves the editable inventory-column model. |
| `publish_product` | Creates or updates an approved product without deleting data. |

The MCP server deliberately does not provide unrestricted PocketBase queries and never returns OAuth access or refresh tokens. Its `.env` lives only on the deployment host, is permission `600`, and uses a dedicated service superuser.

### Conversational onboarding scope

The reusable agent prompt is versioned with the MCP at `cAImanLabs-ClientPortal/mcp/CLIENT_ONBOARDING_AGENT_PROMPT.md`. It follows this ordered intake: brand, business information, selected services, conditional social/agent/website/catalog/reservations paths, files, client confirmation, and portal handoff.

The MCP now covers the client-provided data in those paths. It intentionally does **not** automate Google or social OAuth authorization, final intake completion, billing, support appointment booking, agent operational status, delivery demos, report generation, or launch. Those actions require the Client Portal or authorized cAImanLabs operations, so the conversational agent must direct the client there instead of asserting completion.

## Build-host policy

The Mac mini/operations host is **not** a build host. Do not leave Docker build images, builders, Vite development servers, static build processes, CI runners or generated production artifacts there.

Use the production deployment host (OVH) for PocketBase image builds and portal builds, or a dedicated CI runner that publishes artifacts to OVH. The operations SSH tunnel is only for access:

```bash
ssh -o ProxyCommand="cloudflared access ssh --hostname %h" racc@ssh.11061996.xyz
```

The SSH password is a secret and must not be added to commands, environment files, documentation or Git. Rotate it if it has been shared in any other channel.
