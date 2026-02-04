import * as Fs from 'fs';
import { promises as fs } from 'fs';
import { mkTempDir } from '../dirUtils';
import childProcess, { execSync } from 'child_process';
import { createTarGz } from '../createTarGz';
import Plist from 'plist';
import path from 'path';

/**
 * 1. extract the Chrome.app from the zip
 * 2. remove codesign
 * 3. update info.plist "updateurl" location
 * 4. Re-tar and gz
 */
export default async function convertMacDmg(
  downloadedDmg: string,
  extractToPath: string,
  chromeVersion: string,
  needsSignature: boolean,
): Promise<void> {
  const tmp = mkTempDir();

  console.log('Modifying Chrome@%s', chromeVersion, downloadedDmg);

  if (downloadedDmg.endsWith('.crx3')) {
    await extractCrx3(downloadedDmg, tmp);
  } else {
    await extractDmg(downloadedDmg, tmp);
  }

  console.log('Removing app signing at %s', `${tmp}/Google Chrome.app`);

  execSync(`codesign --remove-signature "${tmp}/Google Chrome.app"`);

  const plistPath = `${tmp}/Google Chrome.app/Contents/Info.plist`;
  const plist = Plist.parse(Fs.readFileSync(plistPath, 'utf8'));

  plist.KSUpdateURL = 'https://localhost/service/update2';
  Fs.writeFileSync(plistPath, Plist.build(plist), 'utf8');

  if (needsSignature) {
    execSync(`xattr -dr com.apple.FinderInfo "${tmp}/Google Chrome.app"`)
    execSync(`xattr -lr "${tmp}/Google Chrome.app"`, { stdio: 'inherit' });
    execSync(
      `codesign --force --deep --sign "Developer ID Application: Data Liberation Foundation INC (DY8K483XWV)" "${tmp}/Google Chrome.app" -v`,
      { stdio: 'inherit' },
    );
  }

  await createTarGz(extractToPath, `${tmp}`, ['Google Chrome.app']);
  console.log(`${chromeVersion} for mac converted`);
}

async function extractCrx3(downloaded: string, extractTo: string) {
  const buffer = Fs.readFileSync(downloaded);
  const magic = buffer.subarray(0, 4).toString('utf8');
  if (magic !== 'Cr24') throw new Error(`Unexpected CRX3 magic: ${magic}`);

  const headerSize = buffer.readUInt32LE(8);
  const zipStart = 12 + headerSize;
  const zipPath = path.join(extractTo, 'chrome.crx3.zip');
  Fs.writeFileSync(zipPath, buffer.subarray(zipStart));

  const unzipCommand = `ditto -x -k "${zipPath}" "${extractTo}"`;
  console.log(unzipCommand);
  execSync(unzipCommand);

  const appPath = findAppPath(extractTo);
  if (!appPath) throw new Error(`Cannot find "Google Chrome.app" in ${extractTo}`);

  const target = path.join(extractTo, 'Google Chrome.app');
  if (appPath !== target) {
    Fs.cpSync(appPath, target, { recursive: true });
  }
}

function findAppPath(root: string): string | undefined {
  const entries = Fs.readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name.endsWith('.app')) {
      return path.join(root, entry.name);
    }
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const nested = path.join(root, entry.name);
    const nestedEntries = Fs.readdirSync(nested, { withFileTypes: true });
    for (const n of nestedEntries) {
      if (n.isDirectory() && n.name.endsWith('.app')) {
        return path.join(nested, n.name);
      }
    }
  }

  return undefined;
}

async function extractDmg(downloaded: string, extractTo: string) {
  const mountCommand = `hdiutil attach -nobrowse -noautoopen "${downloaded}"`;
  console.log(mountCommand);
  const stdout = execSync(mountCommand, { encoding: 'utf8' });

  let mountPath: string;
  try {
    const volumes = stdout.match(/\/Volumes\/(.*)/m);

    if (!volumes) throw new Error(`Could not find volume path in ${stdout}`);
    mountPath = volumes[0];

    const fileNames = await fs.readdir(mountPath);

    if (!fileNames.includes('Google Chrome.app'))
      throw new Error(`Cannot find "Google Chrome.app" in ${mountPath}`);

    const copyPath = path.join(mountPath, `Google Chrome.app`);
    const copyCommand = `cp -R "${copyPath}" "${extractTo}"`;
    console.log(copyCommand);
    execSync(copyCommand);
  } finally {
    if (mountPath) {
      childProcess.exec(`hdiutil detach "${mountPath}" -quiet`, err => {
        // eslint-disable-next-line no-console
        if (err) console.error(`Error unmounting dmg: ${err}`);
      });
    }
  }
}
