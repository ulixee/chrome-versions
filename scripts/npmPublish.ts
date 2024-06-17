import * as Fs from 'fs';
import ChromeApp from '@ulixee/chrome-app';
import { execSync } from 'child_process';
import versions from '../versions.json';
import TemplatePackageJson from '../packages/_chrome-version-template/package.json';
import PublishedJson from '../npm-published-packages.json';
import Axios from 'axios';

const latestPackageVersion = TemplatePackageJson.version.split('.').pop();

type IPlatform = typeof ChromeApp.prototype.osPlatformName;

const MIN_MAJOR_VERSION_TO_UPDATE = 122;

async function main() {
  const versionMap: {
    [majorVersion: string]: [minor: number, patch: number, platforms: IPlatform[]][];
  } = {};
  for (const [version, platforms] of Object.entries(versions)) {
    const osList = Object.keys(platforms) as IPlatform[];
    if (!osList.length) continue;

    const [major, ...parts] = version.split('.').map(Number);
    versionMap[major] ??= [];
    versionMap[major].push([parts[1], parts[2], osList]);
    versionMap[major].sort((a, b) => {
      if (a[0] === b[0]) return a[1] - b[1];
      return a[0] - b[0];
    });
  }

  for (const [major, versions] of Object.entries(versionMap)) {
    const lastVersionByOs: Partial<Record<IPlatform, string>> = {};
    for (const [minor, patch, oses] of versions) {
      if (parseInt(major, 10) < MIN_MAJOR_VERSION_TO_UPDATE) continue;
      // we use Chrome's version
      const version = `${minor}.${patch}.${latestPackageVersion}`;
      const name = `@ulixee/chrome-${major}-0`;
      const fullVersion = `${major}.0.${minor}.${patch}`;

      for (const os of oses) {
        lastVersionByOs[os] = `${major}.0.${minor}.${patch}`;
      }

      PublishedJson[name] ??= { versions: [] };
      if (PublishedJson[name].versions.includes(version)) continue;

      // publish
      const newPackage: any = { ...TemplatePackageJson };
      newPackage.version = version;
      newPackage.name = name;
      newPackage.fullVersion = fullVersion;
      const versionOverridesByOs: Partial<Record<IPlatform, string>> = {};
      for (const [os, version] of Object.entries(lastVersionByOs)) {
        if (version !== fullVersion) versionOverridesByOs[os] = version;
      }
      newPackage.fullVersionOverridesByOs = versionOverridesByOs;
      newPackage.executablePathEnvVar = `CHROME_${major}_BIN`;
      newPackage.description = `Chrome browser executable pinned to Chrome ${major}. Package updates follow minor Chrome releases.`;
      newPackage.scripts.postinstall = 'node install.js';

      delete newPackage.private;

      const outDir = `${__dirname}/../packages/chrome-${major}-0`;
      const srcDir = `${__dirname}/../packages/_chrome-version-template`;
      if (Fs.existsSync(outDir)) Fs.rmdirSync(outDir, { recursive: true });
      Fs.mkdirSync(outDir);
      Fs.copyFileSync(`${srcDir}/index.js`, `${outDir}/index.js`);
      Fs.copyFileSync(`${srcDir}/index.d.ts`, `${outDir}/index.d.ts`);
      Fs.copyFileSync(`${srcDir}/index.d.ts.map`, `${outDir}/index.d.ts.map`);
      Fs.copyFileSync(`${srcDir}/install.js`, `${outDir}/install.js`);
      Fs.writeFileSync(`${outDir}/package.json`, JSON.stringify(newPackage, null, 2));

      console.log(`npm show ${name}@${version}`);

      try {
        const exists = execSync(`npm show ${name}@${version}`, { encoding: 'utf8' });
        if (exists) {
          PublishedJson[name].versions.push(version);
          PublishedJson[name].versions.sort(versionSort);
          continue;
        }
      } catch (err) {
        if (!String(err).includes(`code E404`)) {
          throw err;
        }
      }

      try {
        // make sure all assets exist before publishing
        let hasAllVersions = true;
        for (const [os, version] of Object.entries(lastVersionByOs)) {
          if (os === 'linux_rpm') continue;
          const downloadFilename = `chrome_${version}_${os}.tar.gz`;
          const url = `https://github.com/ulixee/chrome-versions/releases/download/${version}/${downloadFilename}`;
          const response = await Axios.head(url).catch(err => err.response);
          if (response.status !== 200) {
            console.warn('Chrome Asset not available on github', {
              downloadFilename,
              fullVersion,
              response: { status: response.status, headers: response.headers },
            });
            hasAllVersions = false;
            break;
          }
        }
        if (!hasAllVersions) continue;
      } catch (err) {
        console.error('ERROR checking for release assets %s', fullVersion, err);
        continue;
      }

      execSync('npm publish --access=public', {
        cwd: outDir,
      });

      PublishedJson[name].versions.push(version);
      PublishedJson[name].versions.sort(versionSort);
    }
  }
  Fs.writeFileSync(
    `${__dirname}/../npm-published-packages.json`,
    JSON.stringify(PublishedJson, null, 2),
  );
}

function versionSort(a: string, b: string): number {
  const verA = parseInt(a.split('.')[1], 10);
  const verB = parseInt(b.split('.')[1], 10);
  return verA - verB;
}

main().catch(err => {
  console.log('Exception occurred', err);
  process.exit(1);
});
