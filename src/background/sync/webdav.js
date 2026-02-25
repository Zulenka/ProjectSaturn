import { tryUrl } from '@/common';
import {
  ANONYMOUS,
  PASSWORD,
  SERVER_URL,
  USER_CONFIG,
  USERNAME,
} from '@/common/consts-sync';
import {
  BaseService,
  getItemFilename,
  getURI,
  isScriptFile,
  register,
} from './base';
import { parseWebDavDirectoryListing } from '@/common/webdav-xml';
import { parseWebDavDirectoryInOffscreen } from '../utils/offscreen';

const IS_MV3 = extensionManifest.manifest_version === 3;

const DEFAULT_CONFIG = {
  [SERVER_URL]: '',
  [ANONYMOUS]: false,
  [USERNAME]: '',
  [PASSWORD]: '',
};

const WebDAV = BaseService.extend({
  name: 'webdav',
  displayName: 'WebDAV',
  properties: {
    authType: PASSWORD,
    [SERVER_URL]: null,
  },
  getUserConfig() {
    return (this[USER_CONFIG] ||= {
      ...DEFAULT_CONFIG,
      ...this.config.get(USER_CONFIG),
    });
  },
  setUserConfig(config) {
    Object.assign(this[USER_CONFIG], config);
    this.config.set(USER_CONFIG, this[USER_CONFIG]);
  },
  initToken() {
    const config = this.getUserConfig();
    let url = config[SERVER_URL]?.trim() || '';
    if (!url.includes('://')) url = `http://${url}`;
    if (!url.endsWith('/')) url += '/';
    if (!tryUrl(url)) {
      this.properties[SERVER_URL] = null;
      return false;
    }
    this.properties[SERVER_URL] = `${url}${VIOLENTMONKEY}/`;
    const { anonymous, username, password } = config;
    if (anonymous) return true;
    if (!username || !password) return false;
    const auth = globalThis.btoa(`${username}:${password}`);
    this.headers = { Authorization: `Basic ${auth}` };
    return true;
  },
  async requestAuth() {
    await this.list();
  },
  loadData(options) {
    // Bypassing login CSRF protection in Nextcloud / Owncloud by not sending cookies.
    // We are not using web UI and cookie authentication, so we don't have to worry about that.
    // See https://github.com/violentmonkey/violentmonkey/issues/976
    return BaseService.prototype.loadData.call(
      this,
      Object.assign(
        {
          credentials: 'omit',
        },
        options,
      ),
    );
  },
  metaError(res) {
    if (
      ![
        404, // File not exists
        409, // Directory not exists
      ].includes(res.status)
    )
      throw res;
  },
  list() {
    const { serverUrl } = this.properties;
    const mkdir = () =>
      this.loadData({
        method: 'MKCOL',
        url: serverUrl,
      });
    const readdir = () =>
      this.loadData({
        method: 'PROPFIND',
        url: serverUrl,
        headers: {
          depth: '1',
        },
      }).then(async (xml) => {
        const items = IS_MV3
          ? await parseWebDavDirectoryInOffscreen(xml)
          : parseWebDavDirectoryListing(xml, isScriptFile);
        return items.map(normalize);
      });
    return readdir().catch((err) => {
      if (err.status === 404) {
        return mkdir().then(readdir);
      }
      throw err;
    });
  },
  get(item) {
    const name = getItemFilename(item);
    const { serverUrl } = this.properties;
    return this.loadData({
      url: serverUrl + name,
    });
  },
  put(item, data) {
    const name = getItemFilename(item);
    const headers = {
      'Content-Type': 'text/plain',
    };
    const lock = this.config.get('lock');
    if (lock) headers.If = `(<${lock}>)`;
    const { serverUrl } = this.properties;
    return this.loadData({
      method: 'PUT',
      url: serverUrl + name,
      body: data,
      headers,
    });
  },
  remove(item) {
    const name = getItemFilename(item);
    const headers = {};
    const lock = this.config.get('lock');
    if (lock) headers.If = `(<${lock}>)`;
    const { serverUrl } = this.properties;
    return this.loadData({
      method: 'DELETE',
      url: serverUrl + name,
      headers,
    });
  },
});
register(WebDAV);

function normalize(item) {
  return {
    name: item.name,
    size: item.size,
    uri: getURI(item.name),
  };
}
