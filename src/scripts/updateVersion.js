import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '../..');

// Generate CalVer: YY.MM.DD
const now = new Date();
const yy = String(now.getFullYear()).slice(-2);
const mm = String(now.getMonth() + 1).padStart(2, '0');
const dd = String(now.getDate()).padStart(2, '0');
const calVer = `${yy}.${mm}.${dd}`;

// Update package.json
const packageJsonPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
pkg.version = calVer;
fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');

// Update src/version.js
const versionJsPath = path.join(rootDir, 'src/version.js');
fs.writeFileSync(versionJsPath, `export const VERSION = '${calVer}';\n`);

console.log(`[Version] Updated to CalVer: ${calVer}`);
