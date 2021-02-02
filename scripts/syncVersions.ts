import versions from '../versions.json';
import GithubReleases from './GithubReleases';
import { getAssetName } from './dirUtils';
import { Handler } from 'secret-agent';
import * as Mac from './mac';
import * as Windows from './windows';

const osesToSync = process.env.SYNC_OS_KEYS.split(',').map(x => x.trim());

async function syncVersions() {
  const handler = new Handler({ maxConcurrency: 2 });

  if (process.env.UPDATE_VERSIONS === 'true' || process.env.UPDATE_VERSIONS === '1') {
    if (osesToSync.includes('mac')) {
      handler.dispatchAgent(Mac.updateVersions);
    }
    if (osesToSync.includes('win32')) {
      handler.dispatchAgent(Windows.updateVersions);
    }
    await handler.waitForAllDispatches();
  }

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

      if (osToSync === 'win32' || osToSync === 'win64') {
        handler.dispatchAgent(agent => Windows.process(agent, osToSync, version, releases));
      } else if (osToSync === 'mac') {
        handler.dispatchAgent(agent => Mac.process(agent, osToSync, version, releases));
      }
    }
  }

  await handler.waitForAllDispatches();
  await handler.close();
}

syncVersions().catch(err => {
  console.log('Exception occurred', err);
  process.exit(1);
});
