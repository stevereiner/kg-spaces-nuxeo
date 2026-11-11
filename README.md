# KG Spaces for Nuxeo

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Flexible GraphRAG](https://img.shields.io/badge/Flexible%20GraphRAG-0.10.0-2E7D32.svg)](https://github.com/stevereiner/flexible-graphrag)
[![Nuxeo](https://img.shields.io/badge/Nuxeo-LTS%202025-0066FF.svg)](https://github.com/nuxeo/nuxeo)
[![Angular](https://img.shields.io/badge/Angular-20-DD0031.svg)](https://angular.dev/)
[![Supports Hyland OpenArch](https://img.shields.io/badge/Supports-Hyland%20OpenArch-0b5394.svg)](https://github.com/Hyland/OpenArch)

[Flexible GraphRAG](https://github.com/stevereiner/flexible-graphrag) for [Nuxeo](https://github.com/nuxeo/nuxeo)
documents, started from Nuxeo Web UI: the Nuxeo counterpart of
[KG Spaces for Alfresco Content App](https://github.com/stevereiner/kg-spaces-aca).

In Web UI, a **KG Spaces** menu (a star graph icon) on a document's toolbar and on the selection toolbar of document
lists, with three actions:

- **Add to KG Spaces**: the current document, or the selected documents;
- **Ask KG Spaces about this document / folder**: for a single document or folder (the current one, or a selection
  of one);
- **View KG Spaces graph of this document / folder**: the GRAPH tab, with the entities, relationships and chunks
  extracted from a single document or folder.

When Web UI has no room left in a toolbar and moves the menu under its "more" menu, the three actions show there as
labeled items.

They open the KG Spaces app with the documents, where Flexible GraphRAG's shared Angular UI
([`@flexible-graphrag/angular-ui`](https://www.npmjs.com/package/@flexible-graphrag/angular-ui)) does the rest:
ingest into search + vector and the property / RDF graphs, auto sync, hybrid search, AI chat (scoped to the document
or folder for Ask), and the property graph (for View graph).

Web UI only sends the selection and the action: nothing is written to the documents.

Flexible GraphRAG supports [Hyland OpenArch](https://github.com/Hyland/OpenArch) (not required), an AI-ready content
repository for documents with their extracted text and vector embeddings, as its search + vector store and as the
store for data sources and document state.

Version 0.10.0, for Flexible GraphRAG 0.10.0 and `@flexible-graphrag/angular-ui` 0.10.0. Apache 2.0.

To run it with Nuxeo, Flexible GraphRAG and the proxy in one Docker Compose stack, see
[KG Spaces Deployment](https://github.com/stevereiner/kg-spaces-deployment).

## Parts

| Folder | What |
|---|---|
| [`webui-addon/`](webui-addon) | the Web UI actions: one Polymer element, packaged as a Nuxeo bundle jar |
| [`app/`](app) | the KG Spaces app (Angular 20) the actions open |
| [`docker/`](docker) | the Dockerfile: the app's image (nginx), and the add-on jar (`--target addon`) |

## How it fits together

- The app and Nuxeo are served from the **same host** (a proxy: Nuxeo at `/nuxeo/`, the app at
  `/kg-spaces-nuxeo/`), so the app shares the user's Web UI session: no second sign-in. The browser sends Nuxeo's
  session cookie to any port of that host, so Web UI can also be used on Nuxeo's own port when `kgspaces.url` points
  at the app on the proxy (see below).
- The actions open `<app>#/kg-spaces?tab=processing&nodeIds=<uid>,...` or
  `<app>#/kg-spaces?tab=chat&nodeId=<uid>&nodeName=<title>&isFolder=<bool>` in one reused browser tab (named
  `kg-spaces-nuxeo`). Nuxeo documents named in search results and answers open in Web UI's tab (the add-on names it
  `kg-spaces-nuxeo-web-ui`), so the user keeps one tab of each; a document of another Nuxeo server opens its own link
  in a new tab.
- The app reads the documents as the user, and gives Flexible GraphRAG the user's Nuxeo authentication token
  (`nuxeo_config` `auth_method: token`), so ingest reads exactly what the user may read. Questions (hybrid search,
  AI chat) carry the same token, so answers come only from Nuxeo documents that user may read.
- The title bar shows **Nuxeo · \<user\>**, the Web UI user (no sign-out here: signing out happens in Web UI; when
  another user is signed in on return to the tab, the previous selection is cleared), a sign-in pill for the other
  sources and servers in the stores (Alfresco, CMIS, Box, Microsoft 365, ... added through OTHER SOURCES), and a
  Dark / Light switch.
- Processing jobs run in the background: going back to Web UI, or sending another selection, while a job runs leaves
  it running; follow it on the Processing tab's Jobs sub-tab.

On the Flexible GraphRAG backend, an auto sync registered from here runs with the user's token by default
(`NUXEO_SYNC_CREDENTIALS=token`); `NUXEO_SYNC_CREDENTIALS=account` runs syncs of the backend's own Nuxeo server
(`NUXEO_URL`) as the backend's configured account. When the browser reaches Web UI at another address than the
backend's `NUXEO_URL` (the backend inside Docker, a proxy), set `NUXEO_WEBUI_URL` on the backend so the document
links in results and answers point at it. See Flexible GraphRAG's
[Nuxeo setup](https://stevereiner.github.io/flexible-graphrag/DATA-SOURCES/README-nuxeo/).

## Web UI add-on

Build (needs a JDK's `jar`):

```bash
webui-addon/build.sh        # -> webui-addon/dist/kg-spaces-nuxeo-addon-<version>.jar
```

Or with Docker only (no JDK on the host):

```bash
docker build -f docker/Dockerfile --target addon --output <dir> .
```

Install: copy the jar into the Nuxeo server's `nxserver/bundles/` and restart Nuxeo. Web UI loads the element at
startup through its `web-ui` web resources bundle; no Web UI file is replaced.

The app's address: `/kg-spaces-nuxeo/` on the same host and port as Web UI by default; set `kgspaces.url` in
`nuxeo.conf` for another one, e.g. an absolute `http://localhost:8080/kg-spaces-nuxeo/` (the proxy) so the actions
also work from Web UI on Nuxeo's own port.

Where the actions appear: on folders and documents, and in the selection toolbar of document lists (a selection's
structural containers are left out). They are hidden on the repository's structural containers, set by
`kgspaces.excludedTypes` in `nuxeo.conf` (default `Root,Domain,WorkspaceRoot,SectionRoot,TemplateRoot`;
workspaces get the actions; add `Workspace` to hide them there), and on trashed documents.

Tested with Nuxeo LTS 2025 and Web UI `v2025.21.0`.

## App

From the repository root (the root `package.json` runs them in `app/`; or `cd app` and run them there):

```bash
npm install        # app/'s dependencies, then a library tarball in docker/lib/ over the npm version, if there is one
npm start          # http://localhost:4300/kg-spaces-nuxeo/, /api -> localhost:8000, /nuxeo -> localhost:8081
npm run build      # app/dist/kg-spaces-nuxeo
```

With `npm start`, use Web UI where Nuxeo serves it, e.g. `http://localhost:8081/nuxeo/ui/` (or the deployment's
proxy, `http://localhost:8080/nuxeo/ui/`), with `kgspaces.url` pointing at the dev app
(`http://localhost:4300/kg-spaces-nuxeo/`; in KG Spaces Deployment, `KG_SPACES_NUXEO_URL` in its `.env`). The
browser sends Nuxeo's session cookie to any port of the same host, so the app shares Web UI's session. (Web UI
through the dev server, `http://localhost:4300/nuxeo/ui/`, is not a way to use it: Nuxeo's sign-in sends the browser
on to Nuxeo's own port.)

The app needs `@flexible-graphrag/angular-ui` 0.10.0 or later (the GRAPH tab; 0.9.0 brought its title bar,
Dark / Light theme and the `hostSourceAuth` and `runInBackground` options), with the library's `styles/fg-theme.scss` in `angular.json`'s
`styles`.

To use a library from a local Flexible GraphRAG checkout (unreleased changes), run `scripts/install-local-lib.sh`
(Windows: `scripts\install-local-lib.bat`). It packs the library (`npm run pack:lib`), installs it into `app/`
without changing `package.json` (`--no-save`), puts the tarball in `docker/lib/` for image builds, and clears
`app/.angular/cache`. The checkout is found at `../flexible-graphrag` or `../../newdev3/flexible-graphrag`; set
`FG_UI` (its `flexible-graphrag-ui/frontend-angular`) otherwise. A later `npm install` in `app/` puts the published
version back (a root `npm install` uses the tarball in `docker/lib/` again).

Settings, read at startup from `assets/config.json`:

| Setting | Meaning |
|---|---|
| `apiUrl` | Flexible GraphRAG's API, from the browser (`/api`) |
| `nuxeoBrowserUrl` | Nuxeo, from the browser (`/nuxeo`) |
| `nuxeoBackendUrl` | Nuxeo, from the Flexible GraphRAG backend (server to server); keep it the same as the backend's `NUXEO_URL` |
| `enabledSources` | data sources the OTHER SOURCES tab offers (`nuxeo` is left out: Web UI is the Nuxeo picker here) |
| `agentIconUrl` | the AI chat's assistant icon |

## Docker image

```bash
docker build -f docker/Dockerfile -t kg-spaces/kg-spaces-nuxeo .     # the app, served by nginx on port 8080
```

To build against a library not yet on npm, put its tarball (`flexible-graphrag-angular-ui-<version>.tgz`, from
`npm run pack:lib` in Flexible GraphRAG's `flexible-graphrag-ui/frontend-angular`) in `docker/lib/` first;
`scripts/install-local-lib.sh` does that.

Container settings:

| Variable | Meaning |
|---|---|
| `KG_SPACES_NUXEO_BACKEND_URL` | written into `assets/config.json` as `nuxeoBackendUrl` at start (unset: keep the image's) |
| `NUXEO_URL` | where the image's own nginx sends `/nuxeo/`, when the app is used on its own port (default `http://host.docker.internal:8081`) |
| `FLEXIBLE_GRAPHRAG_URL` | where it sends `/api/` (default `http://host.docker.internal:8000`) |

## License

Apache License 2.0
