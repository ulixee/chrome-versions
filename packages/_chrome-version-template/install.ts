const Chrome = require('./index');
const { installChrome } = require('@secret-agent/chrome-app/lib/installChrome');

installChrome(new Chrome()).catch(() => null);
