import SecretAgent from 'secret-agent';
import Versions from '../versions.json';
import * as Fs from 'fs';

async function windowsVersions() {
  const agent = new SecretAgent({ showReplay: false, humanEmulatorId: 'skipper' });
  await agent.goto('https://www.neowin.net/news/tags/chrome_offline_installer');
  await agent.waitForAllContentLoaded();

  console.log('Mac versions page loaded');
  const { document } = agent;
  const links = await document.querySelectorAll('h3.news-item-title > a').length;
  for (let i = 0; i < links; i += 1) {
    const headline = await document.querySelectorAll('h3.news-item-title > a')[i];
    const title = (await headline.textContent).trim();
    const match = title.match(/Google Chrome ([\d.]+) \(offline installer\)/);
    if (!match || !match.length) continue;
    console.log('Found offline installer links', match);

    let version = match[1];

    const entry = Versions[version];
    const shouldVisit = entry || version.length === 2;
    if (!shouldVisit) {
      console.log('Version not in versions file', version);
      continue;
    }
    if (entry?.win32) {
      console.log('Already have version', version, entry);
      continue;
    }

    await agent.click(headline);

    await agent.waitForLocation('change');

    const links = await agent.document.querySelectorAll('.article-content p > a');
    let linksFound = 0;
    for (const link of links) {
      const text = await link.textContent;
      if (!text.startsWith('Google Chrome Offline Installer')) {
        continue;
      }
      const url = await link.getAttribute('href');

      if (version.length === 2) {
        version = url.split('/').pop()?.split('_')?.shift();
        if (!Versions[version]) {
          Versions[version] = {};
        }
      }

      if (text.includes('32-bit')) {
        Versions[version].win32 = url;
        linksFound += 1;
      }
      if (text.includes('64-bit')) {
        Versions[version].win64 = url;
        linksFound += 1;
      }
      if (linksFound === 2) break;
    }
    if (linksFound > 0) {
      Fs.writeFileSync('../versions.json', JSON.stringify(Versions, null, 2));
    }

    await agent.goBack();
    await agent.waitForMillis(1e3);
  }

  console.log('Extracted data');
  await agent.close();
  process.exit();
}

windowsVersions();
