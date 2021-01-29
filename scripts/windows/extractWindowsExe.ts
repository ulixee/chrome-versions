import * as Fs from 'fs';
import { mkTempDir } from '../dirUtils';
import { execSync } from 'child_process';
import { createGzip } from 'zlib';
import * as Tar from 'tar';
import Path from 'path';

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
  execSync(`7z.exe x -y "${tmp}\\chrome.7z" -o"${tmp}"`);

  console.log('Unzipped Chrome installer %s', Fs.readdirSync(`${tmp}/Chrome-bin`));

  // move chrome.exe into "version folder"
  Fs.renameSync(`${tmp}/Chrome-bin/chrome.exe`, `${tmp}/Chrome-bin/${chromeVersion}/chrome.exe`);

  console.log('Creating tar.br', {
    cwd: Path.resolve(`${tmp}/Chrome-bin/`),
    file: extractToPath,
    fileList: [chromeVersion],
  });

  const compress = createGzip({ level: 9 });
  await new Promise<void>((resolve, reject) => {
    Tar.create(
      {
        gzip: false,
        cwd: Path.resolve(`${tmp}/Chrome-bin/`),
      },
      [chromeVersion],
    )
      .pipe(compress)
      .pipe(Fs.createWriteStream(extractToPath, { autoClose: true }))
      .on('error', reject)
      .on('finish', resolve);
  });
}
