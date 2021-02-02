import * as Fs from 'fs';
import {HttpClient} from '@actions/http-client';
import versions from '../versions.json';
import {getDownloadPath} from './dirUtils';

export async function downloadInstaller(chromeOs: string, chromeVersion: string) {
  const url = versions[chromeVersion][chromeOs];
  const destinationPath = getDownloadPath(chromeOs, chromeVersion);

  if (Fs.existsSync(destinationPath)) return destinationPath;

  console.log('Downloading Chrome@%s on %s at url: %s', chromeVersion, chromeOs, url);

  const client = new HttpClient();
  const response = await client.get(url);

  const file = Fs.createWriteStream(destinationPath);
  response.message.pipe(file);
  await new Promise((resolve, reject) => {
    file.on('finish', resolve);
    file.on('error', reject);
  });
  console.log('Finished download at %s', destinationPath);
  return destinationPath;
}
