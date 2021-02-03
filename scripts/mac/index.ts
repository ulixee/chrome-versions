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

export async function process(agent: Agent, os: string, version: string, releases: GithubReleases) {
  const assetPath = getAssetPath(os, version);
  const downloadPage = Versions.get(version);

  const downloadInfo = await UpToDown.getInstallerDownloadLink(agent, downloadPage);
  // take SecretAgent off the download page
  await agent.close();
  const downloaded = await downloadInstaller(downloadInfo.url, os, version, downloadInfo.headers);

  await convertMacDmg(downloaded, assetPath, version);

  const release = await releases.get(version);
  await releases.uploadAsset(release, assetPath);
}
