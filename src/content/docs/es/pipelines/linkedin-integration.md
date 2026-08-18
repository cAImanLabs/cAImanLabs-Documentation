---
title: Integración de LinkedIn
description: Configuración de la App de Desarrollador de LinkedIn, integración con Postiz, productos OAuth requeridos y publicación en Páginas de Empresa.
---

Este documento detalla la arquitectura end-to-end, configuración de la App de Desarrollador de LinkedIn, integración con Postiz, productos OAuth requeridos y solución de problemas para **Páginas Personales y de Empresa en LinkedIn** (`cAIman Labs`).

---

## 1. Metadatos de la App y Credenciales

- **Página de Empresa en LinkedIn**: `cAIman Labs`
- **ID de la App de Desarrollador**: `78ohhgdfqy21j6`
- **URIs de Redirección OAuth**:
  - `https://app.caimanlabs.com.mx/integrations/social/linkedin-page`
  - `https://postiz.11061996.xyz/integrations/social/linkedin-page`
- **Claves de Secretos en Postiz**: `LINKEDIN_CLIENT_ID` y `LINKEDIN_CLIENT_SECRET`

---

## 2. Descubrimientos Técnicos y Soluciones

### 💡 Solución al Error de Listado de Páginas de Empresa
- **Sintoma**: El perfil personal se conectaba exitosamente, pero al hacer clic en **Agregar Canal $\rightarrow$ LinkedIn Page** fallaba al listar las páginas de empresa.
- **Causa Raíz**: Consultar la API de ACL de Organizaciones de LinkedIn (`GET /v2/organizationalEntityAcls?q=roleAssignee`) requiere tener habilitado el producto **Community Management API** en la Consola de Desarrolladores de LinkedIn.
- **Solución**:
  1. Ingresar a la App de Desarrollador en LinkedIn (`78ohhgdfqy21j6`) $\rightarrow$ pestaña **Products**.
  2. Solicitar y habilitar **Community Management API** y **Share on LinkedIn**.
  3. Verificar el rol de Super Administrador en la Página de Empresa de `cAIman Labs`.
