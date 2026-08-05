---
title: Network & Routing
description: Ingress topology, Cloudflare tunnels, and reverse proxy rules.
---

The network layer securely exposes internal Kubernetes services to the public internet using a combination of Cloudflare Tunnels (`cloudflared`) and the `ingress-nginx` controller.

## Cloudflare Tunnels

The server utilizes Cloudflare Tunnels (`cloudflared`) to avoid exposing physical ports to the internet directly. 
- The `cloudflared` daemon runs as a pod within the `monitoring` namespace (or directly on the host) and maintains persistent outbound connections to the Cloudflare edge.
- External requests to subdomains (e.g., `chatwoot.11061996.xyz`) hit Cloudflare, travel through the tunnel, and are forwarded to the `ingress-nginx` LoadBalancer on the internal network at `192.168.139.2`.

## Ingress-Nginx Topology

Once traffic enters the cluster via the LoadBalancer, `ingress-nginx` inspects the HTTP `Host` headers and routes requests to the appropriate `ClusterIP` services.

### Key Ingress Mappings

| Subdomain / Host | Namespace | Target Service |
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
> TLS termination happens primarily at the Cloudflare edge, meaning traffic inside the cluster operates smoothly over port 80/TCP.

## Internal Networking

Pods communicate internally using core Kubernetes DNS (`kube-dns`). 
For example, the n8n orchestrator can reach the AI agent Hermes simply by making a request to `http://hermes.ai-agent.svc.cluster.local:9119`.

### Specialized Transports
- **Obsidian Syncthing**: Unlike typical HTTP traffic, Syncthing operates over specific TCP/UDP ports. It is exposed via a LoadBalancer (`svclb-obsidian-syncthing-transport`) on ports `22000` to handle peer-to-peer syncing of Markdown files for the Obsidian Brain.
