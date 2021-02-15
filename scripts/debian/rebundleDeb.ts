import * as Fs from 'fs';
import { mkTempDir } from '../dirUtils';
import { execSync } from 'child_process';

/**
 * 1. Extract .deb
 * 2. Remove cron
 * 3. Make version specific
 * 4. Remove control files for desktop settings
 * 5. Repackage
 */
export default async function rebundleDeb(
  downloadedDeb: string,
  extractToPath: string,
  chromeVersion: string,
): Promise<void> {
  const tmpDir = mkTempDir();

  console.log('Modifying Chrome@%s', chromeVersion, downloadedDeb);

  console.log('dpkg -x', execSync(`dpkg -x "${downloadedDeb}" "${tmpDir}"`, { encoding: 'utf8' }));
  console.log(
    'dpkg -e',
    execSync(`dpkg -e "${downloadedDeb}" "${tmpDir}/DEBIAN"`, { encoding: 'utf8' }),
  );

  console.log('Listing extracted dirs', Fs.readdirSync(tmpDir));
  // remove cron
  console.log('Removing cron', `${tmpDir}/opt/google/chrome/cron`, `${tmpDir}/etc`);
  Fs.rmdirSync(`${tmpDir}/opt/google/chrome/cron`, { recursive: true });
  Fs.rmdirSync(`${tmpDir}/etc`, { recursive: true });
  console.log('Removing usr', `${tmpDir}/usr`);
  Fs.rmdirSync(`${tmpDir}/usr`, { recursive: true });

  let appBlock = Fs.readFileSync(`${tmpDir}/opt/google/chrome/default-app-block`, 'utf8');
  appBlock = appBlock.replace(/\/opt\/google\/chrome\//g, `/opt/google/chrome/${chromeVersion}/`);
  appBlock = appBlock.replace(
    '<name>Google Chrome</name>',
    `<name>Google Chrome ${chromeVersion}</name>`,
  );
  console.log('Changing default-app-block to', appBlock);
  Fs.writeFileSync(`${tmpDir}/opt/google/chrome/default-app-block`, appBlock, 'utf8');

  console.log(
    `Moving '${tmpDir}/opt/google/chrome' -> '${tmpDir}/opt/google/chrome/${chromeVersion}'`,
  );
  execSync(`mv "${tmpDir}/opt/google/chrome/" "${tmpDir}/opt/google/tmp/"`);
  Fs.mkdirSync(`${tmpDir}/opt/google/chrome/`);
  execSync(`mv "${tmpDir}/opt/google/tmp/" "${tmpDir}/opt/google/chrome/${chromeVersion}"`);

  // change control files
  console.log(
    'Removing control files',
    `${tmpDir}/DEBIAN/postinst`,
    `${tmpDir}/DEBIAN/postrm`,
    `${tmpDir}/DEBIAN/prerm`,
  );
  Fs.unlinkSync(`${tmpDir}/DEBIAN/postinst`);
  Fs.unlinkSync(`${tmpDir}/DEBIAN/postrm`);
  Fs.unlinkSync(`${tmpDir}/DEBIAN/prerm`);

  let control = Fs.readFileSync(`${tmpDir}/DEBIAN/control`, 'utf8');
  control = control.replace(
    'google-chrome-stable',
    `google-chrome-${chromeVersion.replace(/\./g, '-')}`,
  );
  console.log('Changing control to', control);
  Fs.writeFileSync(`${tmpDir}/DEBIAN/control`, control, 'utf8');

  console.log('dpkg -b', execSync(`dpkg -b "${tmpDir}" "${extractToPath}"`, { encoding: 'utf8' }));

  console.log(`${chromeVersion} for linux converted`);
}
