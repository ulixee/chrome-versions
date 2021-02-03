import { Agent } from 'secret-agent';
import Versions from '../Versions';

export default class UpToDown {
  static async updateMacDownloadPages(agent: Agent) {
    await agent.configure({ humanEmulatorId: 'skipper' });
    await agent.goto('https://google-chrome.en.uptodown.com/mac/versions');

    await agent.waitForPaintingStable();
    await agent.waitForMillis(3e3);

    console.log('Mac versions page loaded');
    const { document } = agent;
    const links = await document.querySelectorAll('#versions-items-list > div').length;

    for (let i = 0; i < links; i += 1) {
      const link = await document.querySelectorAll('#versions-items-list > div')[i];
      const date = await link.querySelector('span').textContent;
      const version = (await link.textContent).replace(date, '').trim();
      Versions.set(version, {
        mac: await link.getAttribute('data-url'),
        linux: `http://dl.google.com/linux/chrome/deb/pool/main/g/google-chrome-stable/google-chrome-stable_${version}-1_amd64.deb`,
      });
    }
  }

  static async getInstallerDownloadLink(
    agent: Agent,
    downloadPage: string,
  ): Promise<{ url: string; headers: { [key: string]: string } }> {
    console.log('Loading Windows installer download page: %s', downloadPage);
    await agent.goto(downloadPage);
    const agentMeta = await agent.meta;
    const userAgentString = agentMeta.userAgentString;
    const url = await agent.document.querySelector('#detail-download-button').getAttribute('href');

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
}
