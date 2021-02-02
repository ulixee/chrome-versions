import Fs from 'fs';
import file from '../versions.json';

let json = file;

export default class Versions {
  static get(version: string) {
    return json[version];
  }

  static set(version: string, data: { [key: string]: string }) {
    console.log('Setting version %s url(s)', version, data);
    json[version] = {
      ...(json[version] ?? {}),
      ...data,
    };
    json = Object.keys(json)
      .sort((a, b) => {
        const pa = a.split('.');
        const pb = b.split('.');
        for (let i = 0; i < pa.length; i++) {
          const na = Number(pa[i]);
          const nb = Number(pb[i]);
          if (na > nb) return 1;
          if (nb > na) return -1;
          if (!isNaN(na) && isNaN(nb)) return 1;
          if (isNaN(na) && !isNaN(nb)) return -1;
        }
        return 0;
      })
      .reverse()
      .reduce(function (result, key) {
        result[key] = json[key];
        return result;
      }, {}) as any;

    Fs.writeFileSync(`${__dirname}/../versions.json`, JSON.stringify(json, null, 2));
  }
}
