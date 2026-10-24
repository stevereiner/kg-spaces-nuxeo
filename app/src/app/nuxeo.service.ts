import { Injectable } from '@angular/core';
import { SETTINGS } from './settings';

/** A selected document as Flexible GraphRAG's nuxeo_config.nodeDetails takes it. */
export interface NuxeoNodeDetail {
  id: string;
  name: string;
  path: string;
  isFile: boolean;
  isFolder: boolean;
}

/**
 * Nuxeo, as the signed-in Web UI user. The app is served from the same host as Nuxeo (through the proxy), so the
 * browser sends Nuxeo's session cookie (JSESSIONID, path /nuxeo) with these requests: no second sign-in.
 */
/** The signed-in Web UI user's token once fetched (null before, or with no session): every search / chat
 *  question carries it (main.ts, hostSourceAuth), so answers come only from what that user may read in Nuxeo. */
let currentToken: string | null = null;

export function currentNuxeoToken(): string | null {
  return currentToken;
}

/** The signed-in Web UI user once known: the owner of this app's ingests and of its Jobs list (main.ts). */
let currentUserId: string | null = null;

export function currentNuxeoUser(): string | null {
  return currentUserId;
}

@Injectable({ providedIn: 'root' })
export class NuxeoService {
  private token?: Promise<string | null>;

  private get base(): string {
    return SETTINGS.nuxeoBrowserUrl.replace(/\/+$/, '');
  }

  /** The documents behind the ids Web UI sent; ids that can't be read (deleted, no permission) are left out. */
  async resolve(ids: string[]): Promise<NuxeoNodeDetail[]> {
    const found = await Promise.all(ids.map(async (id) => {
      try {
        const res = await fetch(`${this.base}/api/v1/id/${encodeURIComponent(id)}`, {
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) {
          console.warn(`[KG Spaces] Nuxeo document ${id}: HTTP ${res.status}`);
          return null;
        }
        const doc = await res.json();
        const folder = (doc.facets || []).includes('Folderish');
        const path: string = doc.path || '';
        return {
          id: doc.uid,
          name: doc.title || path.substring(path.lastIndexOf('/') + 1),
          path,
          isFile: !folder,
          isFolder: folder,
        } as NuxeoNodeDetail;
      } catch (e) {
        console.warn(`[KG Spaces] Nuxeo document ${id}:`, e);
        return null;
      }
    }));
    return found.filter((d): d is NuxeoNodeDetail => d !== null);
  }

  /** The signed-in user's name, or null when there is no Nuxeo session. */
  async currentUser(): Promise<string | null> {
    try {
      const res = await fetch(`${this.base}/api/v1/me`, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
      currentUserId = res.ok ? (await res.json()).id || null : null;
      return currentUserId;
    } catch {
      currentUserId = null;
      return null;
    }
  }

  /**
   * A Nuxeo authentication token for the signed-in user, for Flexible GraphRAG to read Nuxeo as that user
   * (nuxeo_config auth_method "token"). Nuxeo issues it from the session and returns the same token for the same
   * user, application and device; tokens don't expire, so the device id is kept per browser, not made per visit.
   */
  userToken(): Promise<string | null> {
    if (!this.token) {
      this.token = (async () => {
        const params = new URLSearchParams({
          applicationName: 'KG Spaces',
          deviceId: this.deviceId(),
          deviceDescription: 'KG Spaces for Nuxeo',
          permission: 'rw',
        });
        try {
          const res = await fetch(`${this.base}/authentication/token?${params}`, { credentials: 'same-origin' });
          const text = (await res.text()).trim();
          // a token is a bare id; anything else (a login page) means there is no session
          currentToken = res.ok && /^[\w-]{8,}$/.test(text) ? text : null;
          return currentToken;
        } catch {
          currentToken = null;
          return null;
        }
      })();
    }
    return this.token;
  }

  /** Forget the cached token (another user signed in): the next ingest asks Nuxeo for theirs. */
  forgetToken(): void {
    this.token = undefined;
    currentToken = null;
  }

  private deviceId(): string {
    const key = 'kgSpaces.nuxeoDeviceId';
    try {
      let id = localStorage.getItem(key);
      if (!id) {
        id = `kg-spaces-${crypto.randomUUID()}`;
        localStorage.setItem(key, id);
      }
      return id;
    } catch {
      return 'kg-spaces-browser';
    }
  }
}
