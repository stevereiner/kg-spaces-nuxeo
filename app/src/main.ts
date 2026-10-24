import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, withHashLocation } from '@angular/router';
import { FLEXIBLE_GRAPHRAG_CONFIG } from '@flexible-graphrag/angular-ui';
import type { SourceDocument } from '@flexible-graphrag/angular-ui';
import { AppComponent } from './app/app.component';
import { KgSpacesPageComponent } from './app/kg-spaces-page.component';
import { KgSpacesSettings, loadSettings } from './app/settings';
import { currentNuxeoToken, currentNuxeoUser } from './app/nuxeo.service';

// The tab Web UI's KG Spaces actions reuse (window.open(..., 'kg-spaces-nuxeo')): this one, even when opened another way
// (the landing page, a bookmark), so an action never opens a second KG Spaces tab.
window.name = 'kg-spaces-nuxeo';

/**
 * A Nuxeo document named in search results or an answer: open it in Web UI's tab (the add-on names it
 * "kg-spaces-nuxeo-web-ui"), bringing that tab to the front, so the user keeps working with one Web UI tab and this one. A
 * document of another Nuxeo server (its link elsewhere than this deployment's Nuxeo) opens its own link in a new tab.
 */
function nuxeoDocumentOpener(settings: KgSpacesSettings) {
  const isNuxeo = (doc: SourceDocument) => doc.source_type === 'nuxeo' && !!doc.node_id;
  const ours = (url: string): boolean => {
    try {
      const origin = new URL(url, location.href).origin;
      // the browser's address of Nuxeo, or the backend's (links from a backend without NUXEO_WEBUI_URL)
      return origin === location.origin || origin === new URL(settings.nuxeoBackendUrl, location.href).origin;
    } catch {
      return true;
    }
  };
  const onThisHost = (url: string): boolean => {
    try {
      return new URL(url, location.href).hostname === location.hostname;
    } catch {
      return false;
    }
  };
  const open = (doc: SourceDocument): boolean => {
    if (!isNuxeo(doc)) {
      return false;
    }
    if (doc.open_url && !ours(doc.open_url)) {
      window.open(doc.open_url, '_blank', 'noopener');
      return true;
    }
    // The backend's link as it is when it is on this host (Nuxeo's own port, e.g. with npm start: Web UI through the dev
    // server is not usable); else, e.g. a backend in Docker linking to http://nuxeo:8080, Web UI where the browser
    // reaches Nuxeo
    const webUi = doc.open_url && onThisHost(doc.open_url)
      ? doc.open_url
      : `${settings.nuxeoBrowserUrl.replace(/\/+$/, '')}/ui/#!/doc/${encodeURIComponent(doc.node_id)}`;
    const tab = window.open(webUi, 'kg-spaces-nuxeo-web-ui');
    tab?.focus();
    return true;
  };
  return { openDocument: open, canOpenDocument: isNuxeo };
}

// Settings first (assets/config.json), so the shared library gets this deployment's addresses.
loadSettings().then((settings) =>
  bootstrapApplication(AppComponent, {
    providers: [
      provideAnimations(),
      provideHttpClient(),
      // hash routing: the app works under any path prefix the proxy gives it, with no base href to set
      provideRouter(
        [
          { path: 'kg-spaces', component: KgSpacesPageComponent },
          { path: '**', redirectTo: 'kg-spaces' },
        ],
        withHashLocation(),
      ),
      {
        provide: FLEXIBLE_GRAPHRAG_CONFIG,
        useValue: {
          apiUrl: settings.apiUrl,
          nuxeoBaseUrl: settings.nuxeoBackendUrl,
          enabledSources: settings.enabledSources,
          agentIconUrl: settings.agentIconUrl,
          noSourcesMessage: 'Nothing selected yet: in Nuxeo Web UI, select documents or open one, then use '
            + 'Add to KG Spaces. Or pick another data source in OTHER SOURCES.',
          goToSourcesLabel: 'Other sources',
          chatWelcomeTitle: 'KG Spaces',
          showChatScope: true,
          // the user goes back to Web UI, or sends another selection, while a job runs: jobs carry on
          // and are followed on the Jobs sub-tab (needs @flexible-graphrag/angular-ui 0.9.0)
          runInBackground: true,
          // Questions carry the Web UI user's Nuxeo token (taken from the Web UI session), so Nuxeo documents
          // are filtered by what that user may read; Nuxeo needs no sign-in here. Every other server or source
          // in the stores (Alfresco, CMIS, Box, Microsoft 365, ... added through OTHER SOURCES) uses the
          // library's sign-ins: the title bar's pill, a sign-in before a question, the forms' sign-in rows.
          // The Web UI user owns the ingests they start: the Jobs sub-tab lists (and clears) only theirs, plus the
          // auto-sync runs everyone sees
          currentUser: () => currentNuxeoUser(),
          hostSourceAuth: () => {
            const token = currentNuxeoToken();
            return token ? { source: 'nuxeo', url: settings.nuxeoBackendUrl, auth: { auth_method: 'token', token } } : null;
          },
          ...nuxeoDocumentOpener(settings),
        },
      },
    ],
  }),
).catch((err) => console.error(err));
