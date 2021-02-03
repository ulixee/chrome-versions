import { Agent } from 'secret-agent';
import GithubReleases from '../GithubReleases';
import extractWindowsExe from '../windows/extractWindowsExe';
import { getAssetPath } from '../dirUtils';
import { downloadInstaller } from '../downloadInstaller';
import Versions from '../Versions';
import FileCr from './FileCr';

export function updateVersions(agent: Agent) {
  return FileCr.updateDownloadUrls(agent);
}

export async function process(os: string, version: string, releases: GithubReleases) {
  const assetPath = getAssetPath(os, version);
  const url = Versions.get(version)[os];

  const downloaded = await downloadInstaller(url, os, version);
  await extractWindowsExe(downloaded, assetPath, version);
  let release = await releases.get(version);
  await releases.uploadAsset(release, assetPath);
}
