import * as Fs from 'fs';
import { mkTempDir } from '../dirUtils';
import { execSync } from 'child_process';
import { createTarGz } from '../createTarGz';

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

  console.log('Listing extracted dirs', Fs.readdirSync(tmpDir));
  // remove cron
  console.log('Removing cron', `${tmpDir}/opt/google/chrome/cron`, `${tmpDir}/etc`);
  Fs.rmdirSync(`${tmpDir}/opt/google/chrome/cron`, { recursive: true });
  console.log('Removing default app block');
  Fs.unlinkSync(`${tmpDir}/opt/google/chrome/default-app-block`);

  // make new control file
  const controlDir = mkTempDir();
  console.log(
    'dpkg -e',
    execSync(`dpkg -e "${downloadedDeb}" "${controlDir}/DEBIAN"`, { encoding: 'utf8' }),
  );
  // change control files
  console.log(
    'Removing control files',
    `${controlDir}/DEBIAN/postinst`,
    `${controlDir}/DEBIAN/postrm`,
    `${controlDir}/DEBIAN/prerm`,
  );
  Fs.unlinkSync(`${controlDir}/DEBIAN/postinst`);
  Fs.unlinkSync(`${controlDir}/DEBIAN/postrm`);
  Fs.unlinkSync(`${controlDir}/DEBIAN/prerm`);

  let control = Fs.readFileSync(`${controlDir}/DEBIAN/control`, 'utf8');
  control = control
    .replace('google-chrome-stable', `google-chrome-${chromeVersion.replace(/\./g, '-')}`)
    .replace(/Maintainer: .+\n/, 'Maintainer: Ulixee Foundation, Inc. <staff@ulixee.org>')
    .replace(/Installed-Size: .+\n/, '');

  Fs.writeFileSync(`${controlDir}/DEBIAN/control`, control, 'utf8');

  console.log(
    'dpkg-deb -Zxz',
    execSync(`dpkg-deb -Zxz --build "${controlDir}" "${tmpDir}/opt/google/chrome/install-dependencies.deb"`, {
      encoding: 'utf8',
    }),
  );
  console.log(execSync(`ls -lart "${tmpDir}/opt/google/chrome/install-dependencies.deb"`));

  Fs.renameSync(`${tmpDir}/opt/google/chrome`, `${tmpDir}/opt/google/${chromeVersion}`);
  await createTarGz(extractToPath, `${tmpDir}/opt/google/`, [chromeVersion]);
  console.log(`${chromeVersion} for linux converted`);
}

/**
 On Rhel, the rpm does this:

 NSS_FILES="libnspr4.so.0d libplds4.so.0d libplc4.so.0d libssl3.so.1d \
 libnss3.so.1d libsmime3.so.1d libnssutil3.so.1d"
 LIBDIR=lib64

 add_nss_symlinks() {

  for f in $NSS_FILES
  do
    target=$(echo $f | sed 's/\.[01]d$//')
    if [ -f "/$LIBDIR/$target" ]; then
      ln -snf "/$LIBDIR/$target" "/opt/google/chrome/$f"
    elif [ -f "/usr/$LIBDIR/$target" ]; then
      ln -snf "/usr/$LIBDIR/$target" "/opt/google/chrome/$f"
    else
      echo $f not found in "/$LIBDIR/$target" or "/usr/$LIBDIR/$target".
      exit 1
    fi
  done
}

 get requires: rpm -q --requires google-chrome-stable-$VERSION.x86_64.rpm

 */
