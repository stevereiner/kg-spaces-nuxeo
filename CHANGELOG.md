# Changelog

All notable changes to KG Spaces for Nuxeo are documented in this file. Versions follow the
[Flexible GraphRAG](https://github.com/stevereiner/flexible-graphrag) release they go with, and the
`@flexible-graphrag/angular-ui` library version they need.

## [2026-11-10] — v0.10.0: goes with Flexible GraphRAG 0.10.0

### Added

- **View KG Spaces graph of this document / folder** in the Web UI KG Spaces menu (a third item,
  for a single document or folder), and the **GRAPH** tab in the app (`#/kg-spaces?tab=graph&nodeId=...`):
  the entities, relationships and chunks extracted from it (Cytoscape; layouts, type / chunk /
  relationship toggles, properties panel, double-click to expand, PNG). Scoped the way Ask is,
  and filtered to documents the user may read.
- **Show graph** buttons on the other tabs open GRAPH on those documents: a finished ingest
  (Processing, and each job in its job list), Hybrid Search results, and the sources of an AI
  Query answer or an AI Chat reply.
- `angular.json` allows the graph's CommonJS dependencies (Cytoscape and its layouts).

### Changed

- Requires `@flexible-graphrag/angular-ui` ^0.10.0 (the GRAPH tab) and a Flexible GraphRAG 0.10.0+
  backend (`/api/graph/*`).

## [2026-11-04] — v0.9.1: goes with Flexible GraphRAG 0.9.1

### Changed

- Version 0.9.1 (app and Web UI add-on bundle). Requires `@flexible-graphrag/angular-ui` ^0.9.1 (no
  UI changes from 0.9.0) and a Flexible GraphRAG 0.9.1+ backend. The backend's 0.9.1 brings
  OpenArch in its Docker Compose stack, faster KG extraction (`KG_EXTRACTION_WORKERS`), security
  fixes (filesystem ingest limited to allowed folders, query injection fixes in several graph
  adapters and the RDF converter, graph Q&A runs only read queries; see its SECURITY.md) and
  Python 3.15 preparatory work.
- README: Flexible GraphRAG 0.9.1 badge and version line.

## [2026-10-24] — v0.9.0: initial release

### Added

- **Web UI add-on** (`webui-addon/`, a Nuxeo bundle jar): a **KG Spaces** menu on a document's
  toolbar and on the selection toolbar of document lists, with two actions:
  - **Add to KG Spaces**: the current document, or the selected documents.
  - **Ask KG Spaces about this document / folder**: AI chat scoped to one document or folder.
  - When Web UI moves the menu under its "more" menu, the two actions show there as labeled items.
  - Hidden on structural containers (`kgspaces.excludedTypes` in `nuxeo.conf`) and on trashed
    documents; the app's address is set by `kgspaces.url`.
  - Web UI only sends the selection and the action: nothing is written to the documents.
- **KG Spaces app** (`app/`, Angular 20) on Flexible GraphRAG's shared Angular UI library
  (`@flexible-graphrag/angular-ui` 0.9.0): ingest into search + vector and the property / RDF
  graphs, auto sync, hybrid search and AI chat.
  - Shares the Web UI session through a same-host proxy: no second sign-in.
  - Gives Flexible GraphRAG the user's Nuxeo token (`auth_method: token`), so ingest reads exactly
    what the user may read, and search and chat answer only from Nuxeo documents the user may read.
  - Title bar with **Nuxeo · \<user\>**, a sign-in pill for the other sources in the stores, and a
    Dark / Light switch.
  - Processing jobs run in the background; follow them on the Processing tab's Jobs sub-tab.
  - Nuxeo documents named in results and answers open in Web UI's tab.
  - Settings in `assets/config.json` (`apiUrl`, `nuxeoBrowserUrl`, `nuxeoBackendUrl`,
    `enabledSources`, `agentIconUrl`).
- **Docker image** (`docker/Dockerfile`): the app served by nginx, and the add-on jar
  (`--target addon`) without a JDK on the host.
- `scripts/install-local-lib.sh` / `.bat`: use a library build from a local Flexible GraphRAG
  checkout.
- Tested with Nuxeo LTS 2025 and Web UI `v2025.21.0`. Requires a Flexible GraphRAG 0.9.0+ backend.
