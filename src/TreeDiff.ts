import { FileTree, TreeDirectory } from "./FileTree";
import * as Path from '@tauri-apps/api/path';

// The result of a comparison of two items cen be one of these
export type DiffType = "unchanged" | "changed" | "deleted" | "added" | "???";

export class TreeDiff {
  public diffMap = new Map<string, [DiffType, string]>();

  constructor(protected left: FileTree, protected right: FileTree) {
    this.diffMap = this.getAllDiffs();
  }

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
        // Handle directories. In this phase, we just return "unchanged"
        // because the directory is present in both trees
        return ["unchanged", "is-light"];
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

  processDir(diffs: Map<string, [DiffType, string]>, directory: TreeDirectory, tree: FileTree, otherTree: FileTree, compareSize: boolean, compareTime: boolean) {
    // First loop over all our own files, counting states
    let unchangedCount = 0;
    let changedCount = 0;
    let addedCount = 0;
    let deletedCount = 0;

    for (let file of directory.files) {
      const relativePath = tree.relativePath(directory.fullPath + Path.sep() + file.name);
      if (!diffs.has(relativePath)) {
        const state = this.getState(relativePath, compareSize, compareTime);
        diffs.set(relativePath, state);
        switch (state[0]) {
          case "added":
            addedCount++;
            break;
          case "deleted":
            deletedCount++;
            break;
          case "changed":
            changedCount++;
            break;
          case "unchanged":
            unchangedCount++;
            break;
          case "???":
            break;
        }
      }
    }

    // Then process all subdirectories
    for (let dir of directory.directories) {
      const relativePath = tree.relativePath(dir.fullPath);
      if (!diffs.has(relativePath)) {
        const [added, deleted, changed, unchanged] = this.processDir(diffs, dir, tree, otherTree, compareSize, compareTime);
        // Get the state of the directory fist. Itmight be addded of deleted!
        let state = this.getState(relativePath, false, false);
        // Amend the state it is was unchanged - i.e. the directory exists on both sides:
        if (state[0] === "unchanged")
          state = (added + deleted + changed == 0)
            ? ["unchanged", "is-light"]
            : ["changed", "is-warning"];

        // Register this directory
        diffs.set(relativePath, state);

        addedCount += added;
        deletedCount += deleted;
        changedCount += changed;
        unchangedCount += unchanged;
      }
    }
    return [addedCount, deletedCount, changedCount, unchangedCount];
  }

  /**
   * Parse both the left and the right trees to produce a list of all
   * entries present in both with their associated status
   */
  getAllDiffs() {
    // A list of entries
    const diffs = new Map<string, [DiffType, string]>();

    this.processDir(diffs, this.left, this.left, this.right, false, false);
    this.processDir(diffs, this.right, this.right, this.left, false, false);

    return diffs;
  }
}