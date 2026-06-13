import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '../..');

// Function to get git commit count since last VERSION modification
function getGitCommitsSinceLastVersion() {
  try {
    const lastCommit = execSync('git log -n 1 --pretty=format:"%H" -- VERSION', {
      encoding: 'utf8'
    }).trim();
    if (!lastCommit) return 1;
    const countStr = execSync(`git rev-list --count ${lastCommit}..HEAD`, {
      encoding: 'utf8'
    }).trim();
    const count = parseInt(countStr, 10);
    return isNaN(count) || count <= 0 ? 1 : count;
  } catch (err) {
    return 1;
  }
}

// Read VERSION from root
const versionFilePath = path.join(rootDir, 'VERSION');
let currentVersion = '1.6.0';
if (fs.existsSync(versionFilePath)) {
  currentVersion = fs.readFileSync(versionFilePath, 'utf8').trim();
} else {
  fs.writeFileSync(versionFilePath, currentVersion + '\n', 'utf8');
}

// Get the bump type: major, minor, patch (default is patch)
const args = process.argv.slice(2);
const bumpType = args[0] ? args[0].toLowerCase() : 'patch';

let incrementAmount = 1;
const amountArg = args[1];
if (!amountArg || amountArg.toLowerCase() === 'auto') {
  incrementAmount = getGitCommitsSinceLastVersion();
  console.log(`[Version] Auto-detected ${incrementAmount} commit(s) since last version change.`);
} else {
  const parsedAmount = parseInt(amountArg, 10);
  incrementAmount = isNaN(parsedAmount) || parsedAmount < 1 ? 1 : parsedAmount;
}

const versionParts = currentVersion.split('.');
let nextVersion = '';

if (bumpType === 'set') {
  if (!amountArg) {
    console.error(`[Version] Error: Silakan masukkan nama versi custom. Contoh: npm run version:bump set "P-1.8"`);
    process.exit(1);
  }
  nextVersion = amountArg;
} else {
  if (versionParts.length !== 3) {
    console.error(
      `[Version] Error: Format versi saat ini (${currentVersion}) tidak valid untuk SemVer!`
    );
    process.exit(1);
  }

  let major = parseInt(versionParts[0], 10);
  let minor = parseInt(versionParts[1], 10);
  let patch = parseInt(versionParts[2], 10);

  if (bumpType === 'major') {
    major += incrementAmount;
    minor = 0;
    patch = 0;
  } else if (bumpType === 'minor') {
    minor += incrementAmount;
    patch = 0;
  } else if (bumpType === 'patch') {
    patch += incrementAmount;
  } else {
    console.log(`[Version] Type '${bumpType}' unknown, keeping current version.`);
    nextVersion = currentVersion;
  }

  if (!nextVersion) {
    nextVersion = `${major}.${minor}.${patch}`;
  }
}

// Write back to VERSION file
fs.writeFileSync(versionFilePath, nextVersion + '\n', 'utf8');

// Update package.json
const packageJsonPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
pkg.version = nextVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');

// Update src/version.js
const versionJsPath = path.join(rootDir, 'src/version.js');
fs.writeFileSync(versionJsPath, `export const VERSION = '${nextVersion}';\n`);

console.log(
  `[Version] Berhasil melakukan bump (${bumpType}) dari ${currentVersion} ke ${nextVersion}!`
);
