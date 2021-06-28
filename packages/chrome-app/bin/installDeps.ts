#!/usr/bin/env node

import * as Fs from 'fs';
import * as Path from 'path';
import { isDebianFlavor } from '../lib/LinuxUtils';
import ChromeApp from '../index';

function noOp() {
  process.stdout.write(Path.join(__dirname, 'no-op.sh'));
}

if (process.platform === 'linux') {
  (async () => {
    const isDebian = await isDebianFlavor();
    if (isDebian) {
      const path = ChromeApp.aptScriptPath;
      if (Fs.existsSync(path)) {
        process.stdout.write(path);
        return;
      }
    }
    noOp();
  })().catch(() => null);
} else {
  noOp();
}
