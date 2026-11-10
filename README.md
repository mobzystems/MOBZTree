# MOBZTree (working title)

First version with layout and directory reading. Comarison now work for both files and directories.
Names are now sorted using locale, which is case-insentitive?

## TODO

- [DONE] Introduce icons. The file and folder emoji are not available on every platform
- [DONE] Introduce syncing current directories, i.e. keeping both relative current directories the same
- Option to always show directories (for inspection and debugging)
- [DONE] Refresh
- [DONE] Enable cancel when loading
- [IN PROGRESS] Add favicon. Added so request doesn't fail anymore but icon only shows in web page, not window
- [DONE] Give files and folders an icon
- Multi-pick two folders?
- Some kind of output - a list of files? A script to reconcile both trees? A tree view of the differences?
- Command line arguments, i.e. mobztree ``[[left-path] [right=path]] [-time] [-size] [-changed] [-unchanged] [-extra]``
- Drag and drop for directories? See webViewWindow.onDragDropEvent
