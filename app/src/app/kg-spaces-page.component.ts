import { Component, HostListener, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { FlexibleGraphragUiModule, ProcessingSessionService } from '@flexible-graphrag/angular-ui';
import type { AskScope } from '@flexible-graphrag/angular-ui';
import { NuxeoNodeDetail, NuxeoService } from './nuxeo.service';
import { SETTINGS } from './settings';

/**
 * The KG Spaces page: Flexible GraphRAG's four tabs, opened from Nuxeo Web UI's "Add to KG Spaces" (with the
 * selected documents' ids) or "Ask KG Spaces about this document / folder" (with one id). The same query parameters
 * as kg-spaces-aca's page:
 *
 *   #/kg-spaces?tab=processing&nodeIds=<uid>,<uid>,...
 *   #/kg-spaces?tab=chat&nodeId=<uid>&nodeName=<title>&isFolder=true|false
 *
 * Nuxeo is read as the signed-in Web UI user (same origin, shared session), and Flexible GraphRAG gets that user's
 * Nuxeo token in nuxeo_config, so an ingest reads exactly what the user may read.
 */
@Component({
  selector: 'kgs-kg-spaces-page',
  imports: [CommonModule, MatCardModule, MatTabsModule, MatToolbarModule, FlexibleGraphragUiModule],
  templateUrl: './kg-spaces-page.component.html',
  styleUrls: ['./kg-spaces-page.component.scss'],
})
export class KgSpacesPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly nuxeo = inject(NuxeoService);
  private readonly session = inject(ProcessingSessionService);

  private static readonly PROCESSING_TAB = 1;
  // The browser sends Nuxeo's session cookie to any port of the same host: Web UI on Nuxeo's own port or on the proxy
  private static readonly NOT_SIGNED_IN = 'Not signed in to Nuxeo: use the KG Spaces actions in Nuxeo Web UI.';
  private static readonly CHAT_TAB = 3;

  user: string | null = null;
  /** The Nuxeo server, for the title bar's tooltip. */
  readonly nuxeoUrl = new URL(SETTINGS.nuxeoBrowserUrl, window.location.href).href.replace(/\/+$/, '');
  message = '';

  selectedTabIndex = 0;

  hasConfiguredSources = false;
  configuredDataSource = '';
  configuredFiles: any[] = [];
  configuredFolderPath = '';
  repositoryItemsHidden = false;
  configuredCmisConfig: any = null;
  configuredAlfrescoConfig: any = null;
  configuredNuxeoConfig: any = null;
  configuredWebConfig: any = null;
  configuredWikipediaConfig: any = null;
  configuredYoutubeConfig: any = null;
  configuredCloudConfig: any = null;
  configuredEnterpriseConfig: any = null;
  configurationTimestamp = 0;
  /** AI CHAT answers only from this document / folder ("Ask KG Spaces about ..."). */
  chatScope: AskScope | null = null;

  ngOnInit(): void {
    this.nuxeo.currentUser().then((user) => {
      this.user = user;
      if (!user) {
        this.message = KgSpacesPageComponent.NOT_SIGNED_IN;
      } else {
        void this.nuxeo.userToken();   // questions carry it (search / chat filtered by what the user may read)
      }
    });
    // Web UI reuses one browser tab for KG Spaces, so a later click changes the parameters of this page
    this.route.queryParamMap.subscribe((params) => {
      if (params.get('tab') === 'chat' && params.get('nodeId')) {
        this.askAbout(params.get('nodeId')!, params.get('nodeName') || '', params.get('isFolder') === 'true');
      } else {
        const nodeIds = (params.get('nodeIds') || '').split(',').map((s) => s.trim()).filter(Boolean);
        if (!nodeIds.length) {
          return;
        }
        this.selectedTabIndex = KgSpacesPageComponent.PROCESSING_TAB;
        this.useSelection(nodeIds);
      }
      // Read once: take the hand-over out of the address, so a page refresh starts clean instead of setting the
      // same selection up again (and the same selection sent again is a new address, so it arrives)
      void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    });
  }

  /**
   * Back to this tab: whoever is signed in to Nuxeo now. Signing out happens in Web UI's tab, so a selection and a
   * Processing tab set up for the previous user must not stay here for the next one.
   */
  @HostListener('window:focus')
  async onFocus(): Promise<void> {
    const user = await this.nuxeo.currentUser();
    if (user === this.user) {
      return;
    }
    if (this.user !== null) {
      this.clearSelection();
    }
    this.user = user;
    this.nuxeo.forgetToken();   // the previous user's
    if (user) {
      void this.nuxeo.userToken();
    }
    this.message = user ? '' : KgSpacesPageComponent.NOT_SIGNED_IN;
  }

  private clearSelection(): void {
    this.session.tab = null;
    this.nuxeo.forgetToken();
    this.chatScope = null;
    this.hasConfiguredSources = false;
    this.configuredDataSource = '';
    this.configuredFiles = [];
    this.configuredFolderPath = '';
    this.configuredNuxeoConfig = null;
    this.configuredAlfrescoConfig = null;
    this.configuredCmisConfig = null;
    this.configuredWebConfig = null;
    this.configuredWikipediaConfig = null;
    this.configuredYoutubeConfig = null;
    this.configuredCloudConfig = null;
    this.configuredEnterpriseConfig = null;
    this.configurationTimestamp = Date.now();
  }

  /** "Add to KG Spaces": the selected documents become the Processing tab's rows. */
  private async useSelection(nodeIds: string[]): Promise<void> {
    const nodeDetails = await this.nuxeo.resolve(nodeIds);
    if (!nodeDetails.length) {
      this.message = 'None of the selected Nuxeo documents could be read (deleted, or no permission).';
      return;
    }
    this.message = nodeDetails.length < nodeIds.length
      ? `${nodeIds.length - nodeDetails.length} of the selected documents could not be read and were left out.`
      : '';
    const path = nodeDetails.length === 1 ? nodeDetails[0].path : this.commonParent(nodeDetails.map((n) => n.path));
    this.configuredDataSource = 'nuxeo';
    this.configuredFolderPath = path;
    this.configuredNuxeoConfig = {
      url: SETTINGS.nuxeoBackendUrl,
      path,
      nodeIds: nodeDetails.map((n) => n.id),
      nodeDetails,
      recursive: await this.defaultRecursive(),
      ...(await this.userAuth()),
    };
    this.repositoryItemsHidden = false;
    this.hasConfiguredSources = true;
    this.configurationTimestamp = Date.now();
  }

  /** "Ask KG Spaces about this document / folder": AI CHAT scoped to it. */
  private askAbout(nodeId: string, name: string, isFolder: boolean): void {
    this.selectedTabIndex = KgSpacesPageComponent.CHAT_TAB;
    this.chatScope = { data_source: 'nuxeo', url: SETTINGS.nuxeoBackendUrl, node_id: nodeId, is_folder: isFolder,
                       name: name || undefined };
    // a folder covers everything below it, by path
    this.nuxeo.resolve([nodeId]).then(([node]) => {
      if (node && this.chatScope?.node_id === nodeId) {
        this.chatScope = { ...this.chatScope, path: node.path, name: name || node.name, is_folder: node.isFolder };
      }
    });
  }

  /** The signed-in user's Nuxeo token, so Flexible GraphRAG reads Nuxeo as that user. */
  private async userAuth(): Promise<Record<string, string>> {
    const token = await this.nuxeo.userToken();
    return token ? { auth_method: 'token', token } : {};
  }

  /** Where the Deep checkbox starts: the backend's DEFAULT_RECURSIVE (GET /api/ui-defaults), else off. */
  private async defaultRecursive(): Promise<boolean> {
    try {
      const res = await fetch(`${SETTINGS.apiUrl.replace(/\/+$/, '')}/ui-defaults`);
      return res.ok ? !!(await res.json()).recursive : false;
    } catch {
      return false;
    }
  }

  /** The folder every selected document sits in, or "/" when they do not share one. */
  private commonParent(paths: string[]): string {
    const parents = paths.map((p) => p.substring(0, p.lastIndexOf('/')) || '/');
    return parents.every((p) => p === parents[0]) ? parents[0] : '/';
  }

  onConfigureProcessing(): void {
    this.selectedTabIndex = KgSpacesPageComponent.PROCESSING_TAB;
  }

  /** The OTHER SOURCES tab: any other data source, configured by hand. */
  onSourcesConfigured(sourceConfig: any): void {
    this.hasConfiguredSources = true;
    this.configuredDataSource = sourceConfig.dataSource || '';
    this.configuredFiles = sourceConfig.files || [];
    this.configuredFolderPath = sourceConfig.folderPath || sourceConfig.path || '';
    this.configuredCmisConfig = sourceConfig.cmisConfig || null;
    this.configuredAlfrescoConfig = sourceConfig.alfrescoConfig || null;
    this.configuredNuxeoConfig = sourceConfig.nuxeoConfig || null;
    this.configuredWebConfig = sourceConfig.webConfig || null;
    this.configuredWikipediaConfig = sourceConfig.wikipediaConfig || null;
    this.configuredYoutubeConfig = sourceConfig.youtubeConfig || null;
    this.configuredCloudConfig = sourceConfig.cloudConfig || null;
    this.configuredEnterpriseConfig = sourceConfig.enterpriseConfig || null;
    this.repositoryItemsHidden = false;
    this.configurationTimestamp = Date.now();
  }

  /** A row's ✕ on the Processing tab: drop that document from the selection (rows are the nodeDetails, in order). */
  removeRepositoryFile(index: number): void {
    const cfg = this.configuredNuxeoConfig;
    const nodes: NuxeoNodeDetail[] = this.configuredDataSource === 'nuxeo' ? cfg?.nodeDetails || [] : [];
    if (!nodes.length) {
      this.repositoryItemsHidden = true;
      return;
    }
    const nodeDetails = nodes.filter((_, i) => i !== index);
    if (!nodeDetails.length) {
      this.hasConfiguredSources = false;
      this.configuredDataSource = '';
      this.configuredFolderPath = '';
      this.configuredNuxeoConfig = null;
      return;
    }
    const path = nodeDetails.length === 1 ? nodeDetails[0].path : this.commonParent(nodeDetails.map((n) => n.path));
    this.configuredFolderPath = path;
    this.configuredNuxeoConfig = { ...cfg, path, nodeDetails, nodeIds: nodeDetails.map((n) => n.id) };
  }

  removeUploadFile(index: number): void {
    this.configuredFiles = this.configuredFiles.filter((_, i) => i !== index);
  }
}
