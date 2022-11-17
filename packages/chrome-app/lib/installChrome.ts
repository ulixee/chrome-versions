import ProgressBar from 'progress';
import * as http from 'http';
import * as https from 'https';
import { getRequestOptionsWithProxy } from './proxy';
import { createGunzip } from 'zlib';
import * as Tar from 'tar';
import * as Fs from 'fs';
import { existsSync } from 'fs';
import ChromeApp from '../index';

const downloadSource = `https://github.com/ulixee/chrome-versions/releases/download`;
const skipDownloadEnvVar = 'HERO_SKIP_CHROME_DOWNLOAD';

export async function installChrome(chromeApp: ChromeApp) {
  if (shouldSkipDownload()) return;

  const fullVersion = chromeApp.fullVersion;

  // Do nothing if the revision is already downloaded.
  if (chromeApp.isInstalled) {
    npmlog(`Chrome ${fullVersion} is already installed; skipping download.`);
    return;
  }

  try {
    const osPlatformName = chromeApp.osPlatformName;
    const downloadFilename = `chrome_${fullVersion}_${osPlatformName}.tar.gz`;

    const url = `${downloadSource}/${fullVersion}/${downloadFilename}`;
    npmlog(`Downloading Chrome ${fullVersion} from ${url}.`);

    const cwd = chromeApp.workingDir;
    if (!existsSync(cwd)) Fs.mkdirSync(cwd, { recursive: true });
    await downloadFile(chromeApp.fullVersion, url, cwd);
    await Fs.promises.chmod(chromeApp.executablePath, 0o755);
    if (chromeApp.symlinkVersionDir) {
      await Fs.promises.symlink(chromeApp.versionDir, chromeApp.symlinkVersionDir, 'dir');
    }

    // don't blow up during install process if host requirements can't be met
    await chromeApp.validateHostRequirements().catch(err => npmlog(err.toString()));

    npmlog(`Chrome (${fullVersion}) downloaded to ${chromeApp.executablePath}`);
  } catch (error) {
    console.error(
      `ERROR: Failed to set up Chrome ${fullVersion}! Set "${skipDownloadEnvVar}" env variable to skip download.`,
    );
    console.error(error);
    process.exit(1);
  }
}

function downloadFile(fullVersion: string, url: string, cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = httpGet(url, response => {
      if (response.statusCode !== 200) {
        const error = new Error(
          `Download failed: server returned code ${response.statusCode}. URL: ${url}`,
        );
        // consume response data to free up memory
        response.resume();
        reject(error);
        return;
      }

      response
        .pipe(createGunzip())
        .pipe(
          Tar.extract({
            cwd,
          }),
        )
        .on('finish', resolve);

      const totalBytes = parseInt(response.headers['content-length'], 10);
      const mb = totalBytes / 1e3 / 1e3;
      const mbString = `${Math.round(mb * 10) / 10} Mb`;

      const progressBar = new ProgressBar(
        `Downloading Chrome ${fullVersion} - ${mbString} [:bar] :percent :etas `,
        {
          complete: '=',
          incomplete: ' ',
          width: 20,
          total: totalBytes,
        },
      );

      let downloadedBytes = 0;
      let lastDownloadedBytes = 0;
      response.on('data', chunk => {
        downloadedBytes += Buffer.byteLength(chunk);
        progressBar.tick(downloadedBytes - lastDownloadedBytes);
        lastDownloadedBytes = downloadedBytes;
      });
    });
    request.once('error', reject);
  });
}

export function shouldSkipDownload() {
  if (getEnv(skipDownloadEnvVar)) {
    npmlog(
      `**INFO** Skipping browser download. "${skipDownloadEnvVar}" environment variable was found.`,
    );
    return true;
  }
  if (getEnv(`NPM_CONFIG_${skipDownloadEnvVar}`)) {
    npmlog(`**INFO** Skipping browser download. "${skipDownloadEnvVar}" was set in npm config.`);
    return true;
  }
  if (getEnv(`NPM_PACKAGE_CONFIG_${skipDownloadEnvVar}`)) {
    npmlog(
      `**INFO** Skipping browser download. "${skipDownloadEnvVar}" was set in project config.`,
    );
    return true;
  }

  return false;
}

function httpGet(url: string, response: (x: http.IncomingMessage) => void): http.ClientRequest {
  const options = getRequestOptionsWithProxy(url);
  const httpModule = options.protocol === 'https:' ? https : http;

  const request = httpModule.request(options, (res: http.IncomingMessage): void => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      httpGet(res.headers.location, response);
    } else {
      response(res);
    }
  });
  request.end();
  return request;
}

function getEnv(key: string): string {
  return process.env[key] ?? process.env[key.toUpperCase()] ?? process.env[key.toUpperCase()];
}

function npmlog(toBeLogged) {
  const logLevel = process.env.npm_config_loglevel;
  const logLevelDisplay = ['silent', 'error', 'warn'].indexOf(logLevel) > -1;

  // eslint-disable-next-line no-console
  if (!logLevelDisplay) console.log(toBeLogged);
}
