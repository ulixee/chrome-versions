import { Agent } from 'secret-agent';
import UpToDown from './UpToDown';
import GithubReleases from '../GithubReleases';
import { getAssetPath } from '../dirUtils';
import { downloadInstaller } from '../downloadInstaller';
import convertMacDmg from './convertMacDmg';
import Versions from '../Versions';

export function updateVersions(agent: Agent) {
  return UpToDown.updateMacVersions(agent);
}

export async function process(agent: Agent, os: string, version: string, releases: GithubReleases) {
  const assetPath = getAssetPath(os, version);
  const url = Versions.get(version);
  const downloaded = await downloadInstaller(url, os, version);
  await convertMacDmg(downloaded, assetPath, version);

  const release = await releases.get(version);
  await releases.uploadAsset(release, assetPath);
}
