import ChromeApp from '@ulixee/chrome-app';
const { fullVersion } = require('./package.json');

class Chrome extends ChromeApp {
  constructor(options?: { executablePathEnvVar?: string; osPlatformName?: ChromeApp['osPlatformName'] }) {
    super(fullVersion, options);
  }
}

export = Chrome;
