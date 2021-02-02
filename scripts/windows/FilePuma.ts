import Versions from '../Versions';
import { Agent } from 'secret-agent';
import { downloadInstaller } from '../downloadInstaller';

export default class FilePuma {
  static async updateWindowsDownloadPages(agent: Agent) {
    await agent.configure({
      humanEmulatorId: 'skipper',
      blockedResourceTypes: ['All'],
    });

    await this.extractDownloadPage(
      agent,
      'https://www.filepuma.com/download/google_chrome_32bit_-40/versions/',
    );
    await this.extractDownloadPage(
      agent,
      'https://www.filepuma.com/download/google_chrome_32bit_-40/versions/2',
    );
    await this.extractDownloadPage(
      agent,
      'https://www.filepuma.com/download/google_chrome_64bit_-932/versions/',
    );
    await this.extractDownloadPage(
      agent,
      'https://www.filepuma.com/download/google_chrome_64bit_-932/versions/2',
    );
    console.log('Extracted data');
  }

  static async extractDownloadPage(agent: Agent, url: string) {
    await agent.goto(url);
    await agent.waitForPaintingStable();

    console.log('Windows versions page loaded', url);
    const { document } = agent;
    const os = url.includes('32bit') ? 'win32' : 'win64';
    for (const link of await document.querySelectorAll('.download_now_search a')) {
      const href = await link.getAttribute('href');

      const match = href.match(/google_chrome_\d+bit_([\d.]+)-\d+/);
      if (!match || !match.length) continue;

      let version = match[1];

      const major = version.split('.').map(Number);
      if (major[0] < 80) {
        console.log('Version too old', version);
        continue;
      }

      Versions.set(version, {
        [os]: `https:${href}`,
      });
    }
  }

  static async getInstallerDownload(
    agent: Agent,
    downloadPage: string,
  ): Promise<{ url: string; headers: { [key: string]: string } }> {
    console.log('Loading Windows installer download page: %s', downloadPage);
    await agent.goto(downloadPage);
    const agentMeta = await agent.meta;
    const userAgentString = agentMeta.userAgentString;

    const url = await this.getDownloadUrl(agent);

    const cookies = (await agent.activeTab.cookieStorage.getItems())
      .map(x => `${x.name}=${x.value}`)
      .join('; ');

    return {
      url,
      headers: {
        Cookie: cookies,
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
        Connection: 'keep-alive',
        Host: 'www.filepuma.com',
        Referer: downloadPage,
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-GPC': '1',
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': userAgentString,
      },
    };
  }

  private static async getDownloadUrl(agent: Agent) {
    for (const script of await agent.document.querySelectorAll('script')) {
      const content = await script.textContent;
      const match = content.match(/location.href='(\/\/www.filepuma.com\/file\/.+\/0\/0\/)'/);
      let url = match ? match[1] : null;
      if (!url) continue;
      return `https:${url}`;
    }
  }
}
