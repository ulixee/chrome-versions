import * as Path from 'path';
import * as Fs from 'fs';
import { mkTempDir } from '../dirUtils';
import { execSync } from 'child_process';

// This function simply pulls the core executable out of the installer and moves it into a fixed version file.
// This breaks the updater (possibly also stops parts of it from installing)
export default function extractWindowsExe(
  downloadExecutable: string,
  extractToPath: string,
  chromeVersion: string,
): void {
  const tmp = mkTempDir();

  console.log('Modifying Chrome@%s', chromeVersion, downloadExecutable);

  // extract executable
  execSync(`7z.exe e -y "${downloadExecutable}" -o"${tmp}\\"`);
  execSync(`7z.exe x -y "${tmp}\\chrome.7z" -o"${tmp}"`);

  console.log('Unzipped Chrome installer %s', Fs.readdirSync(tmp));

  // move chrome.exe into "version folder"
  Fs.renameSync(
    `${tmp}\\Chrome-bin\\chrome.exe`,
    `${tmp}\\Chrome-bin\\${chromeVersion}\\chrome.exe`,
  );

  // now save final
  execSync(`7z.exe a "${Path.resolve(extractToPath)}" "${tmp}\\Chrome-bin\\${chromeVersion}"`);
}
