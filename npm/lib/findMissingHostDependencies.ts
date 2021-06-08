import { spawn } from 'child_process';
import path from 'path';
import { constants as FsConstants, promises as Fs } from 'fs';

export async function findMissingHostDependencies(directoryPath: string): Promise<Set<string>> {
  const allPaths = (await Fs.readdir(directoryPath)).map(file => path.resolve(directoryPath, file));

  const missingDeps = await Promise.all(
    allPaths.map(async filePath => {
      const stat = await Fs.stat(filePath);
      if (!stat.isFile()) return [];

      const basename = path.basename(filePath).toLowerCase();
      if (basename.endsWith('.dll')) {
        return await spawnMissingDepsCheck(filePath);
      }

      try {
        await Fs.access(filePath, FsConstants.X_OK);
        return await spawnMissingDepsCheck(filePath);
      } catch (error) {
        // just break through and return if we can't access
      }
      return [];
    }),
  );

  return new Set<string>([].concat(...missingDeps));
}

async function spawnMissingDepsCheck(filePath: string): Promise<string[]> {
  let executable: string;
  if (process.platform === 'linux') executable = 'ldd';
  // NOTE: don't have a plan yet for how to include this exe (from playwright)
  if (process.platform === 'win32') executable = ''; // `bin/PrintDeps.exe`;

  if (!executable) return [];

  let stdout = '';
  let exitCode = 0;
  const spawned = spawn(executable, [filePath], {
    cwd: path.dirname(filePath),
    env: process.env,
  });
  spawned.stdout.setEncoding('utf8');
  spawned.stdout.on('data', data => (stdout += (data ?? '').toLowerCase()));

  await new Promise<void>(resolve => {
    spawned.once('close', code => {
      exitCode = code;
      resolve();
    });
    spawned.once('error', resolve);
  });
  if (exitCode !== 0) {
    return [];
  }

  return stdout
    .split(/\r?\n/g)
    .filter(line => line.trim().endsWith('not found') && line.includes('=>'))
    .map(line => line.split('=>')[0].trim());
}
