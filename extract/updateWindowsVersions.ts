import SecretAgent from 'secret-agent';
import { ISecretAgent } from '@secret-agent/client';
import Versions from './Versions';

async function updateWindowsVersions() {
  const agent = new SecretAgent({
    showReplay: false,
    humanEmulatorId: 'skipper',
    renderingOptions: ['None'],
  });

  await loadPage(agent, 'https://www.filepuma.com/download/google_chrome_32bit_-40/versions/');
  await loadPage(agent, 'https://www.filepuma.com/download/google_chrome_32bit_-40/versions/2');
  await loadPage(agent, 'https://www.filepuma.com/download/google_chrome_64bit_-932/versions/');
  await loadPage(agent, 'https://www.filepuma.com/download/google_chrome_64bit_-932/versions/2');
  console.log('Extracted data');
  await agent.close();
  process.exit();
}

async function loadPage(agent: ISecretAgent, url: string) {
  await agent.goto(url);
  await agent.waitForAllContentLoaded();

  console.log('Windows versions page loaded', url);
  const { document } = agent;
  const versionPages: { version: string; page: string; os: 'win32' | 'win64' }[] = [];
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
    versionPages.push({ version, page: `https:${href}`, os });
    console.log('Version', version);
  }

  for (const page of versionPages) {
    console.log('Loading %s', page.page);
    await agent.goto(page.page);
    const url = await getDownloadUrl(agent);
    await agent.goBack();
    Versions.set(page.version, {
      [os]: url,
    });
  }
}

async function getDownloadUrl(agent: ISecretAgent) {
  for (const script of await agent.document.querySelectorAll('script')) {
    const content = await script.textContent;
    const match = content.match(/location.href='(\/\/www.filepuma.com\/file\/.+\/0\/0\/)'/);
    let url = match ? match[1] : null;
    if (!url) continue;
    return `https:${url}`;
  }
}

updateWindowsVersions();
