import Path from 'path';
import Os from 'os';
import Fs from 'fs';

const tmp = Os.tmpdir();
const downloadsDir = Path.join(__dirname, '..', 'downloads');
const assetsDir = Path.join(__dirname, '..', 'assets');

const fileExts = {
  win32: 'exe',
  win64: 'exe',
  mac: 'dmg',
  linux: 'deb',
};

export { downloadsDir, assetsDir };

mkdirIfNeeded(downloadsDir);

export function getDownloadPath(os: string, version: string): string {
  return Path.join(downloadsDir, `chrome_${version}_${os}.${fileExts[os]}`);
}

export function mkTempDir(): string {
  const { sep } = require('path');
  return Fs.mkdtempSync(`${tmp}${sep}`);
}

export function getAssetName(os:string, version:string): string {
 return `chrome_${version}_${os}.zip`
}

export function getAssetPath(os: string, version: string): string {
  return Path.join(assetsDir, getAssetName(os,version));
}

export function getAssets(): { path: string; version: string }[] {
  return Fs.readdirSync(assetsDir)
    .map(assetPath => {
      if (!assetPath.endsWith('.zip')) return null;

      const version = assetPath.split('_')[1];
      return {
        path: Path.join(assetsDir, assetPath),
        version,
      };
    })
    .filter(Boolean);
}

function mkdirIfNeeded(dir): void {
  if (!Fs.existsSync(dir)) Fs.mkdirSync(dir, { recursive: true });
}
