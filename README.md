# MOBZTree (working title)

First version with layout and directory reading. Comparison now works for both files and directories.
Names are sorted using locale (which is case-insentitive?)

## TODO

- Option to always show directories (for inspection and debugging)
- [WONT'T FIX] Multi-pick two folders?
- Some kind of output - a list of files? A script to reconcile both trees? A tree view of the differences?
- Add command line options?
- Drag and drop for directories? See webViewWindow.onDragDropEvent
- Check for updates?
- Fix correct path casing in Windows. Extra call to stat()? Only matters for command line

## Done

- Introduce icons. The file and folder emoji are not available on every platform
- Introduce syncing current directories, i.e. keeping both relative current directories the same
- Refresh
- Enable cancel when loading
- Give files and folders an icon
- Command line arguments, i.e. mobztree ``[[left-path] [right=path]] [-time] [-size] [-changed] [-unchanged] [-extra]``
- Normalize paths before loading (from command line, but also from open dialog)
- Show version number in title bar

## In progress

- Add favicon. Added so request doesn't fail anymore but icon only shows in web page, not window

