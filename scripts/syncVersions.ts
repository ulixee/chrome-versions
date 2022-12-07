import versions from '../versions.json';
import GithubReleases from './GithubReleases';
import { getAssetName } from './dirUtils';
import * as Mac from './mac';
import * as Windows from './windows';
import * as Debian from './debian';

const osesToSync = process.env.SYNC_OS_KEYS.split(',').map(x => x.trim());

async function syncVersions() {
  const releases = new GithubReleases();
  const versionEntries = Object.entries(versions);
  // sort by version key descending
  versionEntries.sort((a, b) => {
    return a[0].localeCompare(b[0]);
  });
  for (const [version, urls] of versionEntries) {
    let release = await releases.get(version);
    if (!release) {
      console.log('Creating missing Chrome Release for %s', version);
      release = await releases.create(version);
    }

    for (const osToSync of osesToSync) {
      let assetName = getAssetName(osToSync, version);
      const existingAsset = release.assets.find(a => a.name === assetName);
      if (existingAsset) {
        continue;
      }
      const url = urls[osToSync];
      if (!url) {
        continue;
      }

      console.log(`Asset needed for Chrome %s on %s`, version, osToSync);

      if (osToSync === 'win32' || osToSync === 'win64') {
        await Windows.process(osToSync, version, releases);
      } else if (osToSync === 'mac' || osToSync === 'mac_arm64') {
        await Mac.process(osToSync, version, releases);
      } else if (osToSync === 'linux') {
        await Debian.process(osToSync, version, releases);
      }
    }
  }

  process.exit();
}

syncVersions().catch(err => {
  console.log('Exception occurred', err);
  process.exit(1);
});
