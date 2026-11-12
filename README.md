# MOBZTree

Visually compare the contents of two directory trees.

Please see https://www.mobzystems.com/tools/mobztree/ for more information.

![MOBZTree](https://www.mobzystems.com/images/mobzystems/MOBZTree/mobztree.png)

## Cross platform builds

On every platform, ```npm run tauri build``` will build the 'right' version of the application.
On Windows ARM, versions can be built for both x64 and amr64:

- ```npm run build-x64``` Build for 64-bit on Windows
- ```npm run build-arm64``` Build for arm64 on Windows

## Note on ARM64

To build for arm64 on Windows, you need to run from a Visual Studio Developer prompt. If not, ```clang``` cannot be found and the application will not compile. The powershell-script ```p.ps1``` does this on my PC for Visual Studio 18 (2026). Start your development session by executing this script **once** in your Powershell terminal.

## Incrementing the version number

Change the version number in ```Cargo.toml```. (Turns out that if you leave the version number out of ```tauri.conf.json``` it will fall back to ```Cargo.toml```. And ```package.json``` works fine without a version number, so there is only one version.)

## Testing

To quickly open ne or two directories a startup, use:

```npm run tauri dev -- -- -- -- [left-path] [right-path]]```

## TODO

- Option to always show directories (for inspection and debugging)
- [WONT'T FIX] Multi-pick two folders?
- Some kind of output - a list of files? A script to reconcile both trees? A tree view of the differences?
- Add command line options?
- Drag and drop for directories? See webViewWindow.onDragDropEvent
- Fix correct path casing in Windows. Extra call to stat()? Only matters for command line
- Reveal a directory
- use "npm run tauri build -- -- --config '{ "version": "x.y.z" }' somehow. Doesn't work?
- Increment Cargo.toml version number automatically?

## Done

- Introduce icons. The file and folder emoji are not available on every platform
- Introduce syncing current directories, i.e. keeping both relative current directories the same
- Refresh
- Enable cancel when loading
- Give files and folders an icon
- Command line arguments, i.e. mobztree ``[[left-path] [right=path]] [-time] [-size] [-changed] [-unchanged] [-extra]``
- Normalize paths before loading (from command line, but also from open dialog)
- Show version number in title bar
- Add icon
- Check for updates
- Open the update URL
- Display some more platform and OS information in the hover of the title

## In progress


