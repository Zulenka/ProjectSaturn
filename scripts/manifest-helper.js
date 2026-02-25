const fs = require('fs').promises;
const yaml = require('js-yaml');
const { getVersion, isBeta } = require('./version-helper');

async function readManifest() {
  const input = await fs.readFile('src/manifest.yml', 'utf8');
  const data = yaml.load(input);
  return data;
}

function getTargetBrowser() {
  return (process.env.TARGET_BROWSER || '').toLowerCase() || null;
}

function getTargetManifest() {
  return (process.env.TARGET_MANIFEST || 'mv2').toLowerCase();
}

function applyManifestTarget(data) {
  const targetManifest = getTargetManifest();
  if (targetManifest === 'mv2') return;
  if (targetManifest !== 'mv3') {
    throw new Error(`Unsupported TARGET_MANIFEST: ${targetManifest}`);
  }
  const targetBrowser = getTargetBrowser();
  if (!['chrome', 'opera'].includes(targetBrowser)) {
    throw new Error(`TARGET_MANIFEST=mv3 requires TARGET_BROWSER=chrome|opera (got ${targetBrowser || 'unset'})`);
  }
  data.manifest_version = 3;
  if (data.browser_action) {
    data.action = {
      ...data.browser_action,
    };
    delete data.action.browser_style;
    delete data.browser_action;
  }
  if (data.commands?._execute_browser_action != null) {
    data.commands = {
      ...data.commands,
      _execute_action: data.commands._execute_browser_action,
    };
    delete data.commands._execute_browser_action;
  }
  data.background ||= {};
  delete data.background.scripts;
  data.background.service_worker ||= 'background/index.js';
  const permissions = [];
  const hostPermissions = new Set(data.host_permissions || []);
  (data.permissions || []).forEach((perm) => {
    if (perm === 'webRequestBlocking') return;
    if (perm === '<all_urls>' || /^\w+:\/\//.test(perm)) {
      hostPermissions.add(perm);
      return;
    }
    permissions.push(perm);
  });
  if (!permissions.includes('declarativeNetRequest')) permissions.push('declarativeNetRequest');
  if (!permissions.includes('scripting')) permissions.push('scripting');
  data.permissions = permissions;
  if (hostPermissions.size) data.host_permissions = [...hostPermissions];
  else delete data.host_permissions;
  data.minimum_chrome_version = '88.0';
}

function mergeManifest(template, base) {
  if (!base) return { ...template };
  const data = {
    ...template,
    ...base,
  };
  if (template.background || base.background) {
    data.background = {
      ...template.background,
      ...base.background,
    };
  }
  if (template.browser_action || base.browser_action) {
    data.browser_action = {
      ...template.browser_action,
      ...base.browser_action,
    };
  }
  if (template.options_ui || base.options_ui) {
    data.options_ui = {
      ...template.options_ui,
      ...base.options_ui,
    };
  }
  if (template.browser_specific_settings || base.browser_specific_settings) {
    data.browser_specific_settings = {
      ...template.browser_specific_settings,
      ...base.browser_specific_settings,
    };
    if (template.browser_specific_settings?.gecko || base.browser_specific_settings?.gecko) {
      data.browser_specific_settings.gecko = {
        ...template.browser_specific_settings?.gecko,
        ...base.browser_specific_settings?.gecko,
      };
    }
  }
  return data;
}

function applyBrowserTarget(data) {
  const targetBrowser = getTargetBrowser();
  if (!targetBrowser) return;
  if (targetBrowser === 'chrome' || targetBrowser === 'opera') {
    if (process.env.TARGET === 'selfHosted') {
      throw new Error(`TARGET=selfHosted requires TARGET_BROWSER=firefox (got ${targetBrowser})`);
    }
    delete data.browser_specific_settings;
  } else if (targetBrowser !== 'firefox') {
    throw new Error(`Unsupported TARGET_BROWSER: ${targetBrowser}`);
  }
}

async function buildManifest(base) {
  const template = await readManifest();
  const data = mergeManifest(template, base);
  data.version = getVersion();
  applyBrowserTarget(data);
  applyManifestTarget(data);
  if (process.env.TARGET === 'selfHosted') {
    data.browser_specific_settings ||= {};
    data.browser_specific_settings.gecko ||= {};
    data.browser_specific_settings.gecko.update_url = 'https://raw.githubusercontent.com/violentmonkey/violentmonkey/updates/updates.json';
  }
  if (isBeta()) {
    // Do not support i18n in beta version
    const name = 'Violentmonkey BETA';
    data.name = name;
    if (data.browser_action) data.browser_action.default_title = name;
    if (data.action) data.action.default_title = name;
  }
  return data;
}

async function buildUpdatesList(version, url) {
  const manifest = await readManifest();
  const data = {
    addons: {
      [manifest.browser_specific_settings.gecko.id]: {
        updates: [
          {
            version,
            update_link: url,
          },
        ],
      },
    },
  };
  return data;
}

class ListBackgroundScriptsPlugin {
  constructor({ minify } = {}) {
    this.minify = minify;
  }

  apply(compiler) {
    compiler.hooks.afterEmit.tap(this.constructor.name, async compilation => {
      const dist = compilation.outputOptions.path;
      const path = `${dist}/manifest.json`;
      const manifest = await buildManifest();
      const bgId = 'background/index';
      const bgEntry = compilation.entrypoints.get(bgId);
      const scripts = bgEntry.chunks.flatMap(c => [...c.files]);
      const bgScript = scripts.find(file => file.endsWith('.js')) || scripts[0];
      const isMv3 = manifest.manifest_version === 3;
      if (isMv3) {
        manifest.background.service_worker = bgScript;
        delete manifest.background.scripts;
      } else {
        manifest.background.scripts = scripts;
      }
      await fs.writeFile(path,
        JSON.stringify(manifest, null, this.minify ? 0 : 2),
        { encoding: 'utf8' });
    });
  }
}

exports.readManifest = readManifest;
exports.getTargetBrowser = getTargetBrowser;
exports.buildManifest = buildManifest;
exports.buildUpdatesList = buildUpdatesList;
exports.ListBackgroundScriptsPlugin = ListBackgroundScriptsPlugin;
