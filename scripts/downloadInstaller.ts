import * as Fs from "fs";
import Axios from "axios";
import * as Path from "path";
import { getDownloadPath } from "./dirUtils";

export async function downloadInstaller(
  url: string,
  chromeOs: string,
  chromeVersion: string,
  headers?: { [key: string]: string },
) {
  let extOverride: string | undefined;
  try {
    const pathname = new URL(url).pathname;
    const ext = Path.extname(pathname).replace('.', '');
    if (ext) extOverride = ext;
  } catch {
    // ignore url parse errors
  }

  const destinationPath = getDownloadPath(chromeOs, chromeVersion, extOverride);

  if (Fs.existsSync(destinationPath)) return destinationPath;

  console.log('Downloading Chrome@%s on %s at url: %s', chromeVersion, chromeOs, url, headers);

  const response = await Axios.get(url, {
    responseType: 'stream',
    maxRedirects: 5,
    method: 'GET',
    headers,
  });

  if (response.status === 404) throw new Error('Not found');

  const file = Fs.createWriteStream(destinationPath);
  response.data.pipe(file);
  await new Promise<void>((resolve, reject) => {
    file.on('finish', resolve);
    file.on('error', reject);
  });
  console.log('Finished download at %s', destinationPath);
  return destinationPath;
}
