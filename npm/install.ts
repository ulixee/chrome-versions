import ProgressBar from "progress";
import { ChromeApp } from "./index";
import * as PackageJson from "./package.json";
import * as Fs from "fs";
import { existsSync } from "fs";
import * as http from "http";
import * as https from "https";
import { getRequestOptionsWithProxy } from "./lib/proxy";
import { createGunzip } from "zlib";
import * as Tar from "tar";

const majorVersion = PackageJson.name.split('-').pop();
const fullVersion = `${majorVersion}.${PackageJson.version}`;
const skipDownloadEnvVar = 'SA_SKIP_CHROME_DOWNLOAD';
const downloadSource = `https://github.com/ulixee/chrome-versions/releases/download/`;

(async function install() {
  if (shouldSkipDownload()) return;

  const browser = new ChromeApp();

  // Do nothing if the revision is already downloaded.
  if (browser.isInstalled) {
    npmlog(`Chrome ${fullVersion} is already installed; skipping download.`);
    return;
  }

  try {
    const osPlatformName = browser.osPlatformName;
    const downloadFilename = `chrome_${fullVersion}_${osPlatformName}.tar.gz`;

    const url = `${downloadSource}/${fullVersion}/${downloadFilename}`;
    npmlog(`Downloading Chrome ${fullVersion} from ${url}.`);

    const cwd = browser.workingDir;
    if (!existsSync(cwd)) Fs.mkdirSync(cwd, { recursive: true });
    await downloadFile(url, cwd);
    await Fs.promises.chmod(browser.executablePath, 0o755);

    // don't blow up during install process if host requirements can't be met
    await browser.validateHostRequirements().catch(err => npmlog(err.toString()));

    npmlog(`Chrome (${fullVersion}) downloaded to ${browser.executablePath}`);
  } catch (error) {
    console.error(
      `ERROR: Failed to set up Chrome ${fullVersion}! Set "${skipDownloadEnvVar}" env variable to skip download.`,
    );
    console.error(error);
    process.exit(1);
  }
})();

function downloadFile(url: string, cwd: string): Promise<void> {
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
      const mb = totalBytes / 1024 / 1024;
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

function shouldSkipDownload() {
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

function getEnv(key: string): string {
  return process.env[key] ?? process.env[key.toUpperCase()] ?? process.env[key.toUpperCase()];
}

function npmlog(toBeLogged) {
  const logLevel = process.env.npm_config_loglevel;
  const logLevelDisplay = ['silent', 'error', 'warn'].indexOf(logLevel) > -1;

  // eslint-disable-next-line no-console
  if (!logLevelDisplay) console.log(toBeLogged);
}
