---
title: LinkedIn Integration
description: LinkedIn Developer App configuration, Postiz platform integration, required OAuth products, and organization page publishing.
---

This document details the end-to-end architecture, LinkedIn Developer App configuration, Postiz platform integration, required OAuth products, and technical troubleshooting for **LinkedIn Personal & Company Pages** (`cAIman Labs`).

---

## 1. Developer App Metadata & Credentials

- **LinkedIn Company Page**: `cAIman Labs`
- **Developer App ID**: `78ohhgdfqy21j6`
- **OAuth Redirect URIs**:
  - `https://app.caimanlabs.com.mx/integrations/social/linkedin-page`
  - `https://postiz.11061996.xyz/integrations/social/linkedin-page`
- **Postiz Secrets Keys**: `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET`

---

## 2. Technical Discoveries & Errors Solved

### 💡 Discovery 1: LinkedIn Company Page Listing Failure
- **Symptom**: Personal LinkedIn profile connected successfully, but clicking **Add Channel $\rightarrow$ LinkedIn Page** failed to list company pages.
- **Root Cause**: Querying LinkedIn's Organization ACL API (`GET /v2/organizationalEntityAcls?q=roleAssignee`) requires the **Community Management API** product enabled in LinkedIn Developer Console. Without this product, LinkedIn rejects organization entity listing.
- **Solution**:
  1. Opened LinkedIn Developer App (`78ohhgdfqy21j6`) $\rightarrow$ **Products** tab.
  2. Requested and enabled **Community Management API** and **Share on LinkedIn**.
  3. Verified Super Admin role on the `cAIman Labs` Company Page.
