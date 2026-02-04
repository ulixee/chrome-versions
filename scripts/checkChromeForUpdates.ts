import Axios from 'axios';
import xml2js from 'xml2js';
import Versions from './Versions';

const parser = new xml2js.Parser({ explicitArray: false, async: true });

const versionsByOs = {
  win: '10.0',
  mac: '80.0.2490.86',
};
const appidByOs = {
  win: '{8A69D345-D564-463C-AFF1-A69D9E530F96}',
  mac: 'com.google.Chrome',
};

async function getChromeUpdateUrls(os: 'win' | 'mac', arch: 'x64' | 'x86' | 'arm64') {
  const ver = versionsByOs[os];
  const appid = appidByOs[os];

  const postData = `<?xml version="1.0" encoding="UTF-8"?><request protocol="3.0"><os platform="${os}" version="${ver}" arch="${arch}"/><app appid="${appid}" version=""><updatecheck/></app></request>`;

  const request = await Axios.post('https://tools.google.com/service/update2', postData, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });

  const { response } = await parser.parseStringPromise(request.data);

  console.log('Response', JSON.stringify(response, null, 2));
  const update = response.app.updatecheck;

  const version = update.manifest.$.version;
  const urls = update.urls.url;
  let osKey: string = os;
  if (osKey === 'win') {
    if (arch === 'x64') osKey = 'win64';
    else osKey = 'win32';
  } else if (osKey === 'mac' && arch === 'arm64') {
    osKey = 'mac_arm64';
  }
  const pkg = update.manifest.packages.package.$.name;
  for (const urlBase of urls) {
    const url = urlBase.$.codebase;
    if (url.startsWith('http://dl.google.com/release2')) {
      Versions.set(version, {
        [osKey]: `${url}${pkg}`,
      });
    }
  }
}

async function getChromeUpdateUrlsLinux() {
  const request = await Axios.get('https://chromiumdash.appspot.com/fetch_releases?channel=stable&platform=linux&num=10&offset=0', {
    responseType: 'json',
  });
  const versions = request.data;
  for (const entry of versions) {
    const version = entry.version;
    Versions.set(version, {
      linux: `http://dl.google.com/linux/chrome/deb/pool/main/g/google-chrome-stable/google-chrome-stable_${version}-1_amd64.deb`,
      linux_rpm: `http://dl.google.com/linux/chrome/rpm/stable/x86_64/google-chrome-stable-${version}-1.x86_64.rpm`,
    });
  }
}

(async function main() {
  await getChromeUpdateUrls('mac', 'arm64');
  await getChromeUpdateUrls('mac', 'x64');
  await getChromeUpdateUrls('win', 'x86');
  await getChromeUpdateUrls('win', 'x64');
  await getChromeUpdateUrlsLinux();
})();
