import * as Tar from 'tar';
import Fs from 'fs';

export async function createTarGz(file: string, cwd: string, files: string[]): Promise<void> {
  console.log('Creating %s', file, {
    cwd,
    fileList: files,
  });
  await new Promise<void>((resolve, reject) => {
    Tar.create(
      {
        gzip: true,
        cwd,
      },
      files,
    )
      .pipe(Fs.createWriteStream(file, { autoClose: true }))
      .on('error', reject)
      .on('finish', resolve);
  });

  console.log('Created tar');
}
