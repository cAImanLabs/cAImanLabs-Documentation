---
title: Redes y Enrutamiento
description: Topología de Ingress, túneles de Cloudflare y reglas del proxy inverso.
---

La capa de red expone de forma segura los servicios internos de Kubernetes al internet público utilizando una combinación de Túneles de Cloudflare (`cloudflared`) y el controlador `ingress-nginx`.

## Túneles de Cloudflare

El servidor utiliza Túneles de Cloudflare (`cloudflared`) para evitar la exposición directa de puertos físicos a internet.
- El demonio `cloudflared` se ejecuta como un pod dentro del espacio de nombres `monitoring` (o directamente en el host) y mantiene conexiones de salida persistentes hacia el borde (edge) de Cloudflare.
- Las solicitudes externas a los subdominios (por ejemplo, `chatwoot.11061996.xyz`) llegan a Cloudflare, viajan a través del túnel y son redirigidas al LoadBalancer (Balanceador de Carga) de `ingress-nginx` en la red interna en `192.168.139.2`.

## Topología de Ingress-Nginx

Una vez que el tráfico ingresa al clúster a través del LoadBalancer, `ingress-nginx` inspecciona las cabeceras HTTP `Host` y enruta las solicitudes a los servicios `ClusterIP` correspondientes.

### Mapeos Clave de Ingress

| Subdominio / Host | Espacio de Nombres (Namespace) | Servicio Destino |
| :--- | :--- | :--- |
| `n8n.11061996.xyz` | `api-operations` | `n8n` |
| `api.caimanlabs.com.mx` | `api-operations` | `n8n` |
| `webhook.caimanlabs.com.mx` | `api-operations` | `n8n` |
| `chatwoot.11061996.xyz` | `chatwoot` | `chatwoot-web` |
| `postiz.11061996.xyz` | `postiz` | `postiz-rversion` |
| `postiz.caimanlabs.com.mx` | `postiz` | `postiz-rversion` |
| `app.caimanlabs.com.mx` | `postiz` | `postiz-rversion` |
| `hermes.11061996.xyz` | `ai-agent` | `hermes` |
| `finance.11061996.xyz` | `ai-agent` | `finance-tracker` |
| `nango.11061996.xyz` | `api-operations` | `nango-server` |

> [!TIP]
> La terminación TLS (descifrado de HTTPS) se realiza principalmente en el borde de Cloudflare, lo que significa que el tráfico dentro del clúster opera fluidamente sobre el puerto 80/TCP (HTTP plano).

## Redes Internas

Los pods se comunican internamente utilizando el DNS central de Kubernetes (`kube-dns`). 
Por ejemplo, el orquestador n8n puede comunicarse con el agente de IA Hermes simplemente realizando una solicitud a `http://hermes.ai-agent.svc.cluster.local:9119`.

### Transportes Especializados
- **Obsidian Syncthing**: A diferencia del tráfico HTTP típico, Syncthing opera sobre puertos TCP/UDP específicos. Se expone a través de un LoadBalancer (`svclb-obsidian-syncthing-transport`) en los puertos `22000` para manejar la sincronización peer-to-peer (punto a punto) de archivos Markdown para el Obsidian Brain.
