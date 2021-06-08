import * as Os from 'os';
import * as FsSync from 'fs';
import * as Path from 'path';
import { assert } from '@secret-agent/commons/utils';
import PackageJson from './package.json';
import { DependencyInstaller } from './lib/DependencyInstaller';

const windowsLocalAppData = process.env.LOCALAPPDATA || Path.join(Os.homedir(), 'AppData', 'Local');

const majorVersion = PackageJson.name.split('-').pop();
const fullVersion = `${majorVersion}.${PackageJson.version}`;

export class ChromeApp {
  public static cacheDirectoryByPlatform = {
    linux: process.env.XDG_CACHE_HOME || Path.join(Os.homedir(), '.cache'),
    mac: Path.join(Os.homedir(), 'Library', 'Caches'),
    win32: windowsLocalAppData,
    win64: windowsLocalAppData,
  };

  public static aptScriptPath = `/tmp/apt-install-chrome-dependencies.sh`;

  private static relativeChromeExecutablePathsByOs = {
    mac: Path.join('Google Chrome.app', 'Contents', 'MacOS', 'Google Chrome'),
    linux: 'chrome',
    win32: 'chrome.exe',
    win64: 'chrome.exe',
  };

  public get cacheDir(): string {
    return ChromeApp.cacheDirectoryByPlatform[this.osPlatformName];
  }

  public get browsersDir(): string {
    return Path.join(this.cacheDir, 'secret-agent', 'chrome');
  }

  public get workingDir(): string {
    let cwd = this.browsersDir;
    // mac needs to be extracted directly into version directory
    if (this.osPlatformName === 'mac') {
      cwd = Path.join(cwd, fullVersion);
    }
    return cwd;
  }

  public readonly osPlatformName: 'linux' | 'mac' | 'win32' | 'win64';
  public readonly fullVersion: string;
  public readonly executablePath: string;

  public get isInstalled(): boolean {
    return FsSync.existsSync(this.executablePath);
  }

  public get launchArgs(): string[] {
    if (this.isWindows()) {
      return [`--chrome-version=${this.fullVersion}`];
    }
    return [];
  }

  constructor(executablePathEnvVar?: string, osPlatformName?: ChromeApp['osPlatformName']) {
    this.fullVersion = fullVersion;
    this.osPlatformName = osPlatformName ?? ChromeApp.getOsPlatformName();

    assert(this.osPlatformName, 'This operating system is not supported');

    const relativePath = ChromeApp.relativeChromeExecutablePathsByOs[this.osPlatformName];

    const envVar = executablePathEnvVar ? process.env[executablePathEnvVar] : undefined;
    this.executablePath = envVar ?? Path.join(this.browsersDir, this.fullVersion, relativePath);
  }

  public async validateHostRequirements(): Promise<void> {
    const dependencyInstaller = new DependencyInstaller(this, ChromeApp.aptScriptPath);
    await dependencyInstaller.validate();
  }

  private isWindows(): boolean {
    return this.osPlatformName === 'win32' || this.osPlatformName === 'win64';
  }

  private static getOsPlatformName(): ChromeApp['osPlatformName'] {
    const osPlatformName = Os.platform();
    if (osPlatformName === 'darwin') return 'mac';
    if (osPlatformName === 'linux') return 'linux';
    if (osPlatformName === 'win32') return Os.arch() === 'x64' ? 'win64' : 'win32';
  }
}
