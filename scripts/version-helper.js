const pkg = require('../package.json');

/**
 * Derive extension version from package semver core and optional beta field.
 * - Stable: MAJOR.MINOR.PATCH
 * - Beta:   MAJOR.MINOR.PATCH.BETA
 */
function getVersion() {
  const core = pkg.version.match(/\d+\.\d+\.\d+/)?.[0];
  if (!core) {
    throw new Error(`Invalid package version: ${pkg.version}`);
  }
  const beta = Number.parseInt(pkg.beta, 10);
  return beta > 0 ? `${core}.${beta}` : core;
}

function isBeta() {
  return process.env.BETA || pkg.beta > 0;
}

exports.getVersion = getVersion;
exports.isBeta = isBeta;
