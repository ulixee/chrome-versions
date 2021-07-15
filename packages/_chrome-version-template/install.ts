const Chrome = require('./index');
const { installChrome } = require('@ulixee/chrome-app/lib/installChrome');

installChrome(new Chrome()).catch(() => null);
