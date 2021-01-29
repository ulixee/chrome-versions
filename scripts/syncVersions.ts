import versions from '../versions.json';
import GithubReleases from './GithubReleases';
import { getAssetName, getAssetPath } from './dirUtils';
import { downloadInstaller } from './downloadInstaller';
import extractWindowsExe from './windows/extractWindowsExe';

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
      console.log(`Asset needed for Chrome %s on %s`, version, osToSync);

      const url = urls[osToSync];
      if (!url) {
        console.log(`No download url provided for Chrome %s asset on %s`, version, osToSync, urls);
        continue;
      }

      const downloaded = await downloadInstaller(osToSync, version);
      const assetPath = getAssetPath(osToSync, version);
      if (osToSync === 'win32' || osToSync === 'win64') {
        await extractWindowsExe(downloaded, assetPath, version);
      }

      await releases.uploadAsset(release, assetPath);
    }
  }
}

syncVersions().catch(err => {
  console.log('Exception occurred', err);
  process.exit(1);
});
