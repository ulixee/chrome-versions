import * as GithubActions from '@actions/github';
import { GitHub } from '@actions/github/lib/utils';
import * as Fs from 'fs';
import * as Path from 'path';

export default class GithubReleases {
  private octokit: InstanceType<typeof GitHub>;

  private repository = process.env.REPO ?? GithubActions.context.repo.repo;
  private owner = process.env.REPO_OWNER ?? GithubActions.context.repo.owner;

  private get repo() {
    return {
      repo: this.repository,
      owner: this.owner,
    };
  }

  private list: IGithubRelease[];

  constructor() {
    this.octokit = GithubActions.getOctokit(process.env.GH_TOKEN);
  }

  public async load() {
    if (!this.list) {
      let { data: releases } = await this.octokit.repos.listReleases({ ...this.repo });
      this.list = releases;
    }
    return this.list;
  }

  public async get(name: string) {
    const releases = await this.load();
    return releases.find(x => x.tag_name === name);
  }

  public async create(name: string) {
    const release = await this.octokit.repos.createRelease({
      ...this.repo,
      tag_name: name,
    });
    this.list.push(release.data);
    return release.data;
  }

  public async uploadAsset(release: IGithubRelease, zipFilepath: string) {
    const asset = await this.octokit.repos.uploadReleaseAsset({
      ...this.repo,
      headers: {
        'content-type': 'application/gzip',
        'content-length': Fs.statSync(zipFilepath).size,
      },
      release_id: release.id,
      name: Path.basename(zipFilepath),
      data: Fs.createReadStream(zipFilepath) as any,
    });
    release.assets.push(asset.data);
  }
}

interface IGithubRelease {
  upload_url: string;
  id: number;
  tag_name: string;
  assets: { name: string; id: number; browser_download_url: string }[];
}
