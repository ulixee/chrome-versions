# Chrome Versions

This project maintains versions of Google Chrome that can be run side-by-side and will preserve their original version (ie, no auto-updating).

## Releases

Each Chrome version has an associated Github release. The assets attached to each release are the pre-configured installs for each operating system.

You can also see the `versions.json` file in the root of the project for a list of all versions and the original source urls.

## Windows

We've included win32 and win64 files for the corresponding operating system architecture. These files are converted "offline installers" that have moved the `chrome.exe` file into the version folder (ie, `86.0.4240.111`). This approach is based on this [Stack Overflow answer](https://stackoverflow.com/a/10917231).

To run chrome, you'll want to launch it as follows (Modify your path as needed!). 
```
"C:\Chromes\86.0.4240.111\chrome.exe" --user-data-dir="<dir>" --chrome-version="86.0.4240.111"
```

NOTE: you have to keep a containing "chrome-version" folder with starting and ending numbers, although they don't need to be an exact match for the true Chrome revision. 



## Updating Versions

2 [Secret Agent](https://secretagent.dev) scripts have been included to update the `versions.json` file.
 1. `./extract/checkMacVersions` - this script will check `uptodown.com` for new versions, and grabs the corresponding Mac OSX url. It also guesses the corresponding debian linux filename.
 2. `./extract/windowsVersions` - this script will check `neowin.net` for articles announcing new Chrome releases. It looks for matching `versions.json` entries and updates win32 and win64 urls.
 
 Anytime an update is pushed to this repository, Github Actions will update any missing release assets. If you wish to regenerate a version, simply delete the release (or asset) and it will be re-created. 
