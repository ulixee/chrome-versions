import * as Fs from "fs";
import { mkTempDir } from "../dirUtils";
import { execSync } from "child_process";
import { createTarGz } from "../createTarGz";

// This function simply pulls the core executable out of the installer and moves it into a fixed version file.
// This breaks the updater (possibly also stops parts of it from installing)
export default async function extractWindowsExe(
  downloadExecutable: string,
  extractToPath: string,
  chromeVersion: string,
): Promise<void> {
  const tmp = mkTempDir();

  console.log('Modifying Chrome@%s', chromeVersion, downloadExecutable);

  // extract executable
  execSync(`7z.exe x -y "${downloadExecutable}" -o"${tmp}\\"`);
  console.log(`After extraction, files are`, Fs.readdirSync(tmp));

  if (Fs.existsSync(`${tmp}/chrome.7z`)) {
    execSync(`7z.exe x -y "${tmp}\\chrome.7z" -o"${tmp}"`);

    console.log('Unzipped Chrome installer %s', Fs.readdirSync(`${tmp}/Chrome-bin`));
  }

  Fs.renameSync(`${tmp}/Chrome-bin/chrome.exe`, `${tmp}/Chrome-bin/${chromeVersion}/chrome.exe`);
  const autoUpdateFilesToRemove = [
    'os_update_handler.exe', // Communicates with Windows Update APIs and Omaha for policy-based updates
    'elevation_service.exe', // Elevates privilege for system install/update tasks
    'elevation_tracing_service.exe', // Collects diagnostics on privilege elevation and update behavior
  ];
  for (const file of autoUpdateFilesToRemove) {
    try {
      Fs.rmSync(`${tmp}/Chrome-bin/${chromeVersion}/${file}`, { force: true });
    } catch (err) {
    }
  }
  await createTarGz(extractToPath, `${tmp}/Chrome-bin/`, [chromeVersion]);
  console.log('Finished extracting windows exe', extractToPath);
}
