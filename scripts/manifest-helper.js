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
  if (process.env.TARGET === 'selfHosted') {
    data.browser_specific_settings ||= {};
    data.browser_specific_settings.gecko ||= {};
    data.browser_specific_settings.gecko.update_url = 'https://raw.githubusercontent.com/violentmonkey/violentmonkey/updates/updates.json';
  }
  if (isBeta()) {
    // Do not support i18n in beta version
    const name = 'Violentmonkey BETA';
    data.name = name;
    data.browser_action.default_title = name;
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
      if (`${manifest.background.scripts}` !== `${scripts}`) {
        manifest.background.scripts = scripts;
        await fs.writeFile(path,
          JSON.stringify(manifest, null, this.minify ? 0 : 2),
          { encoding: 'utf8' });
      }
    });
  }
}

exports.readManifest = readManifest;
exports.getTargetBrowser = getTargetBrowser;
exports.buildManifest = buildManifest;
exports.buildUpdatesList = buildUpdatesList;
exports.ListBackgroundScriptsPlugin = ListBackgroundScriptsPlugin;
