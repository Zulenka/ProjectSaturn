const KEY_CHILDREN = Symbol('children');

class XNode {
  constructor(node, nsMap) {
    this.node = node;
    this.nsMap = { ...nsMap };
    this.parseAttrs();
    this.parseName();
  }

  static fromXML(xml) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    return new XNode(doc);
  }

  parseAttrs() {
    const { node, nsMap } = this;
    const attrs = {};
    const { attributes } = node;
    if (attributes) {
      for (const attr of node.attributes) {
        const { name, value } = attr;
        if (name === 'xmlns') nsMap.$ = value;
        else if (name.startsWith('xmlns:')) nsMap[name.slice(6)] = value;
        attrs[name] = value;
      }
    }
    this.attrs = attrs;
  }

  parseName() {
    const { node, nsMap } = this;
    if (node.nodeType === 1) {
      let name = node.tagName;
      let ns = nsMap.$;
      if (name.includes(':')) {
        let prefix;
        [prefix, name] = name.split(':');
        ns = nsMap[prefix];
        if (!ns) throw new Error(`Unknown namespace: ${prefix}`);
      }
      this.name = ns + name;
    }
  }

  text() {
    const { node } = this;
    if (node) return (node.textContent || '').trim();
  }

  children() {
    if (!this[KEY_CHILDREN]) {
      const { node, nsMap } = this;
      this[KEY_CHILDREN] = [...node.children].map(
        child => new XNode(child, nsMap),
      );
    }
    return this[KEY_CHILDREN];
  }

  map(callback) {
    return this.children().map(callback);
  }

  getCallback(callback) {
    if (typeof callback === 'string') {
      return (
        tagName => node =>
          node.name === tagName
      )(callback);
    }
    return callback;
  }

  find(callback) {
    return this.children().find(this.getCallback(callback));
  }
}

/**
 * Parses a WebDAV PROPFIND XML response and returns file entries.
 * @param {string} xml
 * @param {(name: string) => boolean} isScriptFile
 * @returns {{ name: string, size: number }[]}
 */
export function parseWebDavDirectoryListing(xml, isScriptFile) {
  const doc = XNode.fromXML(xml);
  return doc
    .children()[0]
    .map((node) => {
      const prop = node.find('DAV:propstat').find('DAV:prop');
      const type = prop.find('DAV:resourcetype').find('DAV:collection')
        ? 'directory'
        : 'file';
      if (type !== 'file') return null;
      const displayNameNode = prop.find('DAV:displayname');
      const displayName = decodeURIComponent(
        displayNameNode
          ? displayNameNode.text() // some servers also encode DAV:displayname
          : node.find('DAV:href').text().split('/').pop(), // extracting file name
      );
      if (!isScriptFile(displayName)) return null;
      const size = prop.find('DAV:getcontentlength');
      return {
        name: displayName,
        size: size ? +size.text() : 0,
      };
    })
    .filter(Boolean);
}
