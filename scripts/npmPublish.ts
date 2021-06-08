import * as Fs from 'fs';
import versions from '../versions.json';
import PackageJson from '../npm/package.json';
import PublishedJson from '../npm/published-packages.json';

const latestPackageVersion = PackageJson.version.split('.').pop();

async function main() {
  const versionMap: {
    [majorVersion: string]: [number, number][];
  } = {};
  for (const [version, platforms] of Object.entries(versions)) {
    if (!('mac' in platforms)) continue;
    if (!('win64' in platforms)) continue;
    if (!('linux' in platforms)) continue;

    const [major, ...parts] = version.split('.').map(Number);
    versionMap[major] ??= []
    versionMap[major].push([parts[1], parts[2]]);
    versionMap[major].sort((a, b) => {
      if (a[0] === b[0]) return a[1] - b[1];
      return a[0] - b[0];
    });
  }
  console.log(versionMap);

  for (const [major, versions] of Object.entries(versionMap)) {
    for (const [minor,patch] of versions) {
      // we use Chrome's version
      const version = `${minor}.${patch}.${latestPackageVersion}`;
      const name = `@secret-agent/chrome-${major}`;

      PublishedJson[name] ??= { versions: [] };
      if (!PublishedJson[name].versions.includes(version)) {
        PublishedJson[name].versions.push(version);

        // publish
        const newPackage = { ...PackageJson };
        newPackage.version = version;
        newPackage.name = name;
      }
    }
  }
  Fs.writeFileSync(`${__dirname}/../npm/published-packages.json`, JSON.stringify(PublishedJson, null, 2));
}

main().catch(err => {
  console.log('Exception occurred', err);
  process.exit(1);
});
