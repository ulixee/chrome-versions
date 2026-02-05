import Axios from 'axios';
import * as crypto from 'crypto';
import xml2js from 'xml2js';
import { v1 as uuid } from 'uuid';
import Versions from './Versions';

const parser = new xml2js.Parser({ explicitArray: false, async: true });
const DEBUG_UPDATE = process.env.DEBUG_UPDATE === '1';

const UPDATE2_URL = 'https://tools.google.com/service/update2';
const MAC_JSON_URL = 'https://update.googleapis.com/service/update2/json';

const WINDOWS_APP_ID = '{8A69D345-D564-463C-AFF1-A69D9E530F96}';
const MAC_APP_ID = 'com.google.Chrome';

const WINDOWS_VERSION = '10.0';
const MAC_OS_VERSION = '26.0.0';
const MAC_UPDATER_VERSION = '143.0.7482.0';

const CUP_KEY_ID = 8;
const CUP_NONCE_BYTES = 32;

const aplist = {
  win_stable_x86: '-multi-chrome',
  win_stable_x64: 'x64-stable-multi-chrome',
};

function buildUpdate2Url(body: string) {
  const nonce = crypto.randomBytes(CUP_NONCE_BYTES).toString('base64url');
  const cup2key = `${CUP_KEY_ID}:${nonce}`;
  const cup2hreq = crypto.createHash('sha256').update(body, 'utf8').digest('hex');
  const url = new URL(UPDATE2_URL);
  url.searchParams.set('cup2key', cup2key);
  url.searchParams.set('cup2hreq', cup2hreq);
  return url.toString();
}

async function getChromeUpdateUrls(os: 'win' | 'mac', arch: 'x64' | 'x86' | 'arm64') {
  if (os === 'mac') {
    await getChromeUpdateUrlsMacJson(arch as any);
    return;
  }

  const ap = aplist[`win_stable_${arch}`];
  const apAttr = ap ? ` ap='${ap}'` : '';
  const sessionId = `{${uuid()}}`;
  const requestId = `{${uuid()}}`;

  const postData = `<?xml version='1.0' encoding='UTF-8'?>
<request protocol='3.0' version='1.3.23.9' shell_version='1.3.21.103' ismachine='1'
    sessionid='${sessionId}' installsource='ondemandcheckforupdate'
    requestid='${requestId}' dedup='cr'>
    <hw sse='1' sse2='1' sse3='1' ssse3='1' sse41='1' sse42='1' avx='1' physmemory='12582912' />
    <os platform='win' version='${WINDOWS_VERSION}' arch='${arch}'/>
    <app appid='${WINDOWS_APP_ID}'${apAttr} version='0.0.0.0' brand='GGLS'>
        <updatecheck/>
    </app>
</request>`;

  const requestUrl = buildUpdate2Url(postData);
  if (DEBUG_UPDATE) {
    console.log('Update request', { os, arch, requestUrl });
    console.log('Update request body', postData);
  }

  const request = await Axios.post(requestUrl, postData, {
    headers: {
      'content-type': 'text/xml',
    },
  });

  if (DEBUG_UPDATE) {
    console.log('Update response body', request.data);
  }

  const { response } = await parser.parseStringPromise(request.data);
  const app = Array.isArray(response.app) ? response.app[0] : response.app;
  const update = app?.updatecheck;
  const status = update?.$?.status;
  if (status && status !== 'ok') {
    console.log('Update check status', status, 'for', os, arch);
    return;
  }
  if (!update?.manifest || !update?.urls?.url) {
    console.log('Update check missing manifest or urls');
    return;
  }

  const version = update.manifest.$.version;
  const urls = update.urls.url;
  const osKey = arch === 'x64' ? 'win64' : 'win32';
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

async function getChromeUpdateUrlsMacJson(arch: 'x64' | 'arm64') {
  const requestId = `{${uuid()}}`;
  const sessionId = `{${uuid()}}`;
  const archValue = arch === 'arm64' ? 'arm64' : 'x64';

  const body = {
    request: {
      '@os': 'mac',
      '@updater': 'updater',
      acceptformat: 'crx3,download,puff,run,xz,zucc',
      arch: archValue,
      dedup: 'cr',
      domainjoined: false,
      ismachine: false,
      os: {
        arch: archValue,
        platform: 'Mac OS X',
        version: MAC_OS_VERSION,
      },
      prodversion: MAC_UPDATER_VERSION,
      protocol: '4.0',
      requestid: requestId,
      sessionid: sessionId,
      updaterversion: MAC_UPDATER_VERSION,
      apps: [
        {
          appid: MAC_APP_ID,
          brand: 'GGRO',
          enabled: true,
          version: '0.0.0.0',
          updatecheck: {},
        },
      ],
    },
  };

  if (DEBUG_UPDATE) {
    console.log('Update request (mac json)', { arch, requestUrl: MAC_JSON_URL });
    console.log('Update request body (mac json)', JSON.stringify(body));
  }

  const request = await Axios.post(MAC_JSON_URL, body, {
    headers: {
      'content-type': 'application/json',
    },
  });

  let responseData: any = request.data;
  if (typeof responseData === 'string') {
    const trimmed = responseData.startsWith(")]}'") ? responseData.slice(4) : responseData;
    responseData = JSON.parse(trimmed);
  }

  if (DEBUG_UPDATE) {
    console.log('Update response body (mac json)', responseData);
  }

  const app = Array.isArray(responseData?.response?.apps) ? responseData.response.apps[0] : undefined;
  const update = app?.updatecheck;
  if (!update || update.status !== 'ok') {
    if (DEBUG_UPDATE) console.log('Update check status (mac json)', update?.status);
    return;
  }

  const nextVersion = update.nextversion;
  const osKey = arch === 'arm64' ? 'mac_arm64' : 'mac';
  for (const pipeline of update.pipelines ?? []) {
    for (const op of pipeline.operations ?? []) {
      if (op?.type !== 'download') continue;
      for (const urlEntry of op.urls ?? []) {
        const url = urlEntry?.url ?? urlEntry;
        if (url && url.startsWith('http://dl.google.com/release2') && url.endsWith('.crx3') && nextVersion) {
          Versions.set(nextVersion, {
            [osKey]: url,
          });
          return;
        }
      }
    }
  }

  if (DEBUG_UPDATE) {
    console.log('Update check missing CRX3 download url (mac json)');
  }
}

async function getChromeUpdateUrlsLinux() {
  const request = await Axios.get(
    'https://chromiumdash.appspot.com/fetch_releases?channel=stable&platform=linux&num=10&offset=0',
    { responseType: 'json' },
  );
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
