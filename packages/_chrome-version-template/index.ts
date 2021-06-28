const ChromeApp = require('@secret-agent/chrome-app').default;
const { fullVersion } = require('./package.json');

export = class Chrome extends ChromeApp {
  constructor(options?: { executablePathEnvVar?: string; osPlatformName?: string }) {
    super(fullVersion, options);
  }
}
