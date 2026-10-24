/**
 * This app's settings, read from assets/config.json before it starts, so a deployment can change them without a
 * rebuild (the Docker image rewrites that file at container start).
 */
export interface KgSpacesSettings {
  /** Flexible GraphRAG's API, from the browser: same origin through the proxy. */
  apiUrl: string;
  /** Nuxeo, from the browser: same origin through the proxy, so the user's Web UI session is shared. */
  nuxeoBrowserUrl: string;
  /**
   * Nuxeo, from the Flexible GraphRAG BACKEND (server to server), sent in nuxeo_config.url. It also names the
   * repository for the backend (its data sources and the OpenArch tree), so keep it the same as the backend's
   * NUXEO_URL.
   */
  nuxeoBackendUrl: string;
  /** Data sources the OTHER SOURCES tab offers ("nuxeo" left out: Web UI is the Nuxeo picker here). */
  enabledSources?: string[];
  agentIconUrl?: string;
}

export const DEFAULT_SETTINGS: KgSpacesSettings = {
  apiUrl: '/api',
  nuxeoBrowserUrl: '/nuxeo',
  nuxeoBackendUrl: 'http://localhost:8081/nuxeo',
  agentIconUrl: 'assets/agent.png',
};

export let SETTINGS: KgSpacesSettings = DEFAULT_SETTINGS;

export async function loadSettings(): Promise<KgSpacesSettings> {
  try {
    const res = await fetch('assets/config.json', { cache: 'no-store' });
    if (res.ok) {
      SETTINGS = { ...DEFAULT_SETTINGS, ...(await res.json()) };
    }
  } catch (e) {
    console.warn('[KG Spaces] assets/config.json not readable, using the defaults', e);
  }
  return SETTINGS;
}
