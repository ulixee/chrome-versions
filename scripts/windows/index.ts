import { Agent } from 'secret-agent';
import GithubReleases from '../GithubReleases';
import FilePuma from '../windows/FilePuma';
import extractWindowsExe from '../windows/extractWindowsExe';
import { getAssetPath } from '../dirUtils';
import { downloadInstaller } from '../downloadInstaller';
import Versions from '../Versions';

export function updateVersions(agent: Agent) {
  return FilePuma.updateWindowsDownloadPages(agent);
}

export async function process(agent: Agent, os: string, version: string, releases: GithubReleases) {
  const assetPath = getAssetPath(os, version);
  const downloadPage = Versions.get(version)[os];

  const downloadInfo = await FilePuma.getInstallerDownload(agent, downloadPage);
  // take SecretAgent off the download page
  await agent.close();
  const downloaded = await downloadInstaller(downloadInfo.url, os, version, downloadInfo.headers);
  await extractWindowsExe(downloaded, assetPath, version);
  let release = await releases.get(version);
  await releases.uploadAsset(release, assetPath);
}
