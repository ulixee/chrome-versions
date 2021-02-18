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

NOTE: you have to keep a containing "chrome-version" folder with starting and ending numbers (ie, `/86.0.4240.111/`), although they don't need to be an exact match for the true Chrome revision.

## Mac

Mac distributions have had auto-updating removed. You should be able to copy the included `Google Chrome.app` files to directories on your computer.

Updates have been removed by:

- Updating `Contents/Info.plist` to a `localhost` url
- Removing the code-signing signature from the binary so that Mac will be able to open the files.

### Linux

Linux distributions have had desktop and auto-updating removed. The top level folder is the version of Chrome.

#### Install Dependencies

Inside each tar.gz, an "install-dependencies.deb" has been included. It's a debian installer that installs all the dependencies for the given version of chrome.

Run: `apt -y install <path>/install-dependencies.deb`

Chown: You may need to run `chown _apt {path to chrome}/install-dependencies.deb` to be able to run apt install.

NOTE: Dependencies should be automatically resolved by apt. If this proves not to be the case, please share your experience!

### Linux Side-by-Side Debian Installers

Linux also includes Debian and Ubuntu ".deb" files that can be installed with `apt -y install <path>`. Installers have had cron, user/desktop settings and apt updating removed. Each installer has also been modified to install at /opt/google/chrome/{version}/.

The debian package is also renamed to google-chrome-{version}, allowing you to install many side-by-side.

Chown: You may need to run `chown _apt {path to installer.deb}` to be able to run apt install.

## Updating Versions

This repository is checking for new Chrome versions from the Google update service daily at 10am. Those new versions are recorded in the versions.json file. NOTE: files are not downloaded until a new release or push is made against the repository.

Anytime an update is pushed to this repository, Github Actions will update any missing release assets. If you wish to regenerate a version, simply delete the release (or asset) and it will be re-created.
