import * as Fs from 'fs';
import {mkTempDir} from '../dirUtils';
import {execSync} from 'child_process';
import {createTarGz} from '../createTarGz';

// This function simply pulls the core executable out of the installer and moves it into a fixed version file.
// This breaks the updater (possibly also stops parts of it from installing)
export default async function extractWindowsExe(
  downloadExecutable: string,
  extractToPath: string,
  chromeVersion: string,
): Promise<void> {
  const tmp = mkTempDir();

  console.log('Modifying Chrome@%s', chromeVersion, downloadExecutable);

  // extract executable
  execSync(`7z.exe e -y "${downloadExecutable}" -o"${tmp}\\"`);
  console.log(`After extraction, files are`, Fs.readdirSync(tmp));
  const versionDir = `${tmp}/Chrome-bin/${chromeVersion}`;
  Fs.mkdirSync(versionDir, { recursive: true });

  if (Fs.existsSync(`${tmp}/chrome.7z`)) {
    execSync(`7z.exe x -y "${tmp}\\chrome.7z" -o"${tmp}"`);

    console.log('Unzipped Chrome installer %s', Fs.readdirSync(`${tmp}/Chrome-bin`));

    // move chrome.exe into "version folder"
    Fs.renameSync(`${tmp}/Chrome-bin/chrome.exe`, `${versionDir}/chrome.exe`);
  } else {
    Fs.renameSync(`${tmp}/chrome.exe`, `${versionDir}/chrome.exe`);
  }

  await createTarGz(extractToPath, `${tmp}/Chrome-bin/`, [chromeVersion]);
  console.log('Finished extracting windows exe', extractToPath);
}
