import { promises as Fs } from 'fs';
import * as path from 'path';
import ChromeApp from '../index';
import { existsAsync } from './dirUtils';
import { isDebianFlavor } from './LinuxUtils';
import { DependenciesMissingError } from './DependenciesMissingError';
import { findMissingHostDependencies } from './findMissingHostDependencies';

export class DependencyInstaller {
  constructor(private chromeApp: ChromeApp, readonly aptScriptPath: string) {}

  public async validate() {
    const platform = this.chromeApp.osPlatformName;

    const isWindows64 = platform === 'win64';
    const isLinux = platform === 'linux';

    if (!isLinux && !isWindows64) return;
    if (await this.isValidated()) return;

    const installDirectory = path.dirname(this.chromeApp.executablePath);
    const missingDeps = await findMissingHostDependencies(installDirectory);
    const isDebian = isLinux && (await isDebianFlavor());
    if (!missingDeps.size) {
      await this.markValidated();
      return;
    }

    let resolutionMessage: string;
    if (isWindows64) {
      resolutionMessage = getWindowsResolutionMessage(missingDeps);
    } else if (isDebian) {
      const couldAppendInstaller = await this.appendAptInstallNeeded();
      if (!couldAppendInstaller) {
        resolutionMessage = `Your Chrome installation appears to be incomplete. Please install the following missing dependencies:

${[...missingDeps].join(', ')}

`;
      } else {
        resolutionMessage = `You can resolve this by running the apt dependency installer at:
-------------------------------------------------

${this.aptScriptPath}

-------------------------------------------------

missing: ${[...missingDeps].join(', ')}
`;
      }
    } else {
      resolutionMessage = `You need to install the following libraries: ${['', ...missingDeps].join(
        '\n    ',
      )}`;
    }
    throw new DependenciesMissingError(resolutionMessage, this.chromeApp.fullVersion, [
      ...missingDeps,
    ]);
  }

  private async appendAptInstallNeeded(): Promise<boolean> {
    const existing = await this.getAptScript();
    const installPath = path.dirname(this.chromeApp.executablePath);
    const hasInstaller = await existsAsync(`${installPath}/install-dependencies.deb`);
    if (!hasInstaller) return false;

    if (!existing.includes(installPath)) {
      await Fs.appendFile(
        this.aptScriptPath,
        `
if [ ! -f "${installPath}/.validated" ]; then
  chown _apt ${installPath}/install-dependencies.deb;
  apt-get update;
  apt install -y ${installPath}/install-dependencies.deb;
  apt-get -y autoremove;
  touch ${installPath}/.validated;
  chmod 777 ${installPath}/.validated;
fi
`,
      );
    }
    return true;
  }

  private isValidated(): Promise<boolean> {
    const validatedPath = this.getValidatedPath();
    return existsAsync(validatedPath);
  }

  private async markValidated(): Promise<void> {
    const validatedPath = this.getValidatedPath();
    await Fs.writeFile(validatedPath, '');
  }

  private getValidatedPath(): string {
    const installPath = path.dirname(this.chromeApp.executablePath);
    return `${installPath}/.validated`;
  }

  private async getAptScript(): Promise<string> {
    const aptScriptPath = this.aptScriptPath;
    const scriptExists = await existsAsync(aptScriptPath);
    if (scriptExists === false) {
      await Fs.writeFile(
        aptScriptPath,
        `#!/bin/bash

if [ "$(whoami)" != "root" ]; then
  read -p "This script helps install Chrome dependencies using APT installers. You'll be prompted for sudo access, so please look at the contents. (enter to continue)";
  su root;
fi

`,
      );
      await Fs.chmod(aptScriptPath, 0o755);
    }
    return await Fs.readFile(aptScriptPath, 'utf8');
  }
}

function getWindowsResolutionMessage(missingDeps: Set<string>): string {
  let isCrtMissing = false;
  let isMediaFoundationMissing = false;
  for (const dep of missingDeps) {
    if (dep.startsWith('api-ms-win-crt') || dep === 'vcruntime140.dll' || dep === 'msvcp140.dll')
      isCrtMissing = true;
    else if (
      dep === 'mf.dll' ||
      dep === 'mfplat.dll' ||
      dep === 'msmpeg2vdec.dll' ||
      dep === 'evr.dll' ||
      dep === 'avrt.dll'
    )
      isMediaFoundationMissing = true;
  }

  const details: string[] = [];
  if (isCrtMissing) {
    details.push(
      `Universal C Runtime files can't be found. You can fix that by installing Microsoft Visual C++ Redistributable for Visual Studio from:`,
      `https://support.microsoft.com/en-us/help/2977003/the-latest-supported-visual-c-downloads`,
      ``,
    );
  }

  if (isMediaFoundationMissing) {
    details.push(
      `Media Foundation files can't be found. If you're on Windows Server try fixing this by running the following command in PowerShell`,
      `as Administrator:`,
      ``,
      `    Install-WindowsFeature Server-Media-Foundation`,
      ``,
      `For Windows N editions visit:`,
      `https://support.microsoft.com/en-us/help/3145500/media-feature-pack-list-for-windows-n-editions`,
      ``,
    );
  }

  details.push(`Full list of missing libraries:`, `    ${[...missingDeps].join('\n    ')}`, ``);
  return details.join('\n');
}
