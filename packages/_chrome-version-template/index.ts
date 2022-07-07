import ChromeApp from '@ulixee/chrome-app';
const { fullVersion, fullVersionOverridesByOs } = require('./package.json');

class Chrome extends ChromeApp {
  constructor(options?: {
    executablePathEnvVar?: string;
    osPlatformName?: ChromeApp['osPlatformName'];
  }) {
    options ??= {};
    super(fullVersion, { ...options, fullVersionOverridesByOs });
  }
}

export = Chrome;
