import Axios from 'axios';
import xml2js from 'xml2js';
import { v1 as uuid } from 'uuid';
import Versions from './Versions';

const parser = new xml2js.Parser({ explicitArray: false, async: true });

const versionsByOs = {
  win: '6.3',
  mac: '80.0.2490.86',
};
const appidByOs = {
  win: '{8A69D345-D564-463C-AFF1-A69D9E530F96}',
  mac: 'com.google.Chrome',
};

const aplist = {
  win_stable_x86: '-multi-chrome',
  win_stable_x64: 'x64-stable-multi-chrome',
  mac_stable_x86: '',
  mac_stable_x64: '',
  mac_stable_arm64: '',
};

async function getChromeUpdateUrls(os: 'win' | 'mac', arch: 'x64' | 'x86' | 'arm64') {
  const ver = versionsByOs[os];
  const appid = appidByOs[os];
  const ap = aplist[`${os}_stable_${arch}`];

  const postData = `<?xml version='1.0' encoding='UTF-8'?>
<request protocol='3.0' version='1.3.23.9' shell_version='1.3.21.103' ismachine='1'
    sessionid='{${uuid()}' installsource='ondemandcheckforupdate'
    requestid='{CD7523AD-A40D-49F4-AEEF-8C114B804658}' dedup='cr'>
    <hw sse='1' sse2='1' sse3='1' ssse3='1' sse41='1' sse42='1' avx='1' physmemory='12582912' />
    <os platform='${os}' version='${ver}' arch='${arch}'/>
    <app appid='${appid}' ap='${ap}' version='' nextversion='' lang='' brand='GGLS' client=''>
        <updatecheck/>
    </app>
</request>`;

  const request = await Axios.post('https://tools.google.com/service/update2', postData, {
    headers: {
      'content-type': 'text/xml',
    },
  });

  const { response } = await parser.parseStringPromise(request.data);

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

  // if we have mac, we assume linux is here too
  if (osKey === 'mac') {
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
})();
