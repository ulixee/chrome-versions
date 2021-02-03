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
): Promise<void> {
  const tmp = mkTempDir();

  console.log('Modifying Chrome@%s', chromeVersion, downloadedDmg);

  await extractDmg(downloadedDmg, tmp);

  console.log('Removing app signing at %s', `${tmp}/Google Chrome.app`);

  execSync(`codesign --remove-signature "${tmp}/Google Chrome.app"`);

  const plistPath = `${tmp}/Google Chrome.app/Contents/Info.plist`;
  const plist = Plist.parse(Fs.readFileSync(plistPath, 'utf8'));

  plist.KSUpdateURL = 'https://localhost/service/update2';
  Fs.writeFileSync(plistPath, Plist.build(plist), 'utf8');

  await createTarGz(extractToPath, `${tmp}`, ['Google Chrome.app']);
  console.log(`${chromeVersion} for mac converted`);
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
