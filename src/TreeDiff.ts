import { FileTree } from "./FileTree";

// The result of a comparison of two items cen be one of these
export type DiffType = "unchanged" | "changed" | "deleted" | "added" | "???";

export class TreeDiff {
  constructor(protected left: FileTree, protected right: FileTree) { }

  getState(path: string, compareSize: boolean, compareTime: boolean): [DiffType, string] {
    const leftItem = this.left.entryMap.get(path);
    const rightItem = this.right.entryMap.get(path);

    // Item appears in left tree only
    if (leftItem !== undefined && rightItem === undefined)
      return ["deleted", "is-danger"];

    // Right tree only
    else if (leftItem === undefined && rightItem !== undefined)
      return ["added", "is-success"];

    // Both items are undefined - that's an error
    else if (leftItem === undefined && rightItem === undefined)
      throw new Error(`Internal error: the path '${path}' was not found in either tree`);

    // Both trees contain the item
    else if (leftItem !== undefined && rightItem !== undefined) {
      // Files contain the "size" attribute
      const leftIsFile = "size" in leftItem;
      const rightIsFile = "size" in rightItem;

      // Caveat: one may be a directory and the other one a file!
      if (leftIsFile && rightIsFile) {
        // Handle files:
        if (
          (!compareTime || leftItem.modifiedTime === rightItem.modifiedTime) &&
          (!compareSize || leftItem.size === rightItem.size)
        )
          return ["unchanged", "is-light"];
        else
          return ["changed", "is-warning"];
      } else if (!leftIsFile && !rightIsFile) {
        // Handle directories TODO
        return ["???", "is-info"];
      } else
        // One file, one directory
        return ["added", "is-success"];
      // else if (leftItem.modifiedTime < rightItem.modifiedTime)
      //   return ["older", "is-light"];
      // else
      //   return ["newer", "is-light"];
    }

    throw new Error(`Unhandled case in TreeDiff.ts comparing '${path}'`);
  }
}