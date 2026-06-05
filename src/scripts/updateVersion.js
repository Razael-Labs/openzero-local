import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '../..');

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

const versionParts = currentVersion.split('.');
if (versionParts.length !== 3) {
  console.error(`[Version] Error: Format versi saat ini (${currentVersion}) tidak valid untuk SemVer!`);
  process.exit(1);
}

let major = parseInt(versionParts[0], 10);
let minor = parseInt(versionParts[1], 10);
let patch = parseInt(versionParts[2], 10);

if (bumpType === 'major') {
  major += 1;
  minor = 0;
  patch = 0;
} else if (bumpType === 'minor') {
  minor += 1;
  patch = 0;
} else if (bumpType === 'patch') {
  patch += 1;
} else {
  console.log(`[Version] Type '${bumpType}' unknown, keeping current version.`);
}

const nextVersion = `${major}.${minor}.${patch}`;

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

console.log(`[Version] Berhasil melakukan bump (${bumpType}) dari ${currentVersion} ke ${nextVersion}!`);
