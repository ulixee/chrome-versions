import { Agent } from 'secret-agent';
import UpToDown from './UpToDown';
import GithubReleases from '../GithubReleases';
import { getAssetPath } from '../dirUtils';
import { downloadInstaller } from '../downloadInstaller';
import convertMacDmg from './convertMacDmg';
import Versions from '../Versions';

export function updateVersions(agent: Agent) {
  return UpToDown.updateMacDownloadPages(agent);
}

export async function process(os: string, version: string, releases: GithubReleases) {
  const assetPath = getAssetPath(os, version);
  const downloadPage = Versions.get(version)[os];

  const downloadedPath = await downloadInstaller(downloadPage, os, version);
  await convertMacDmg(downloadedPath, assetPath, version);

  const release = await releases.get(version);
  await releases.uploadAsset(release, assetPath);
}
