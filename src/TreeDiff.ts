import { FileTree, TreeDirectory } from "./FileTree";
import * as Path from '@tauri-apps/api/path';

// The result of a comparison of two items cen be one of these
export type DiffType = "unchanged" | "changed" | "extra" | "???";

export class TreeDiff {
  public diffMap = new Map<string, [DiffType, string]>();

  constructor(public leftTree: FileTree, public rightTree: FileTree, compareSize: boolean, compareTime: boolean) {
    this.diffMap = this.getAllDiffs(compareSize, compareTime);
  }

  protected getState(left: FileTree, right: FileTree, path: string, compareSize: boolean, compareTime: boolean): [DiffType, string] {
    const leftItem = left.entryMap.get(path);
    const rightItem = right.entryMap.get(path);

    // Item appears in left tree only
    if (leftItem !== undefined && rightItem === undefined)
      return ["extra", "is-success"];

    // Right tree only
    else if (leftItem === undefined && rightItem !== undefined)
      return ["extra", "is-success"];

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
          return ["unchanged", "is-white"];
        else
          return ["changed", "is-warning"];
      } else if (!leftIsFile && !rightIsFile) {
        // Handle directories. In this phase, we just return "unchanged"
        // because the directory is present in both trees
        return ["unchanged", "is-white"];
      } else
        // One file, one directory
        return ["extra", "is-success"];
    }

    throw new Error(`Unhandled case in TreeDiff.ts comparing '${path}'`);
  }

  processDir(diffs: Map<string, [DiffType, string]>, directory: TreeDirectory, tree: FileTree, otherTree: FileTree, compareSize: boolean, compareTime: boolean) {
    // First loop over all our own files, counting states
    let unchangedCount = 0;
    let changedCount = 0;
    let extraCount = 0;

    for (let file of directory.files) {
      const relativePath = tree.relativePath(directory.fullPath + Path.sep() + file.name);
      if (!diffs.has(relativePath)) {
        const state = this.getState(tree, otherTree, relativePath, compareSize, compareTime);
        diffs.set(relativePath, state);
        switch (state[0]) {
          case "unchanged":
            unchangedCount++;
            break;
          case "changed":
            changedCount++;
            break;
          case "extra":
            extraCount++;
            break;
          case "???":
            break;
        }
      }
    }

    // Then process all subdirectories
    for (let dir of directory.directories) {
      const relativePath = tree.relativePath(dir.fullPath);
      const [unchanged, changed, extra] = this.processDir(diffs, dir, tree, otherTree, compareSize, compareTime);

      // Get the state of the directory first. It might be extra!
      let state = this.getState(tree, otherTree, relativePath, false, false);

      // Amend the state from unchanged to changed if we hae any differences:
      if (state[0] === "unchanged") {
        if (changed + extra !== 0) {
          state = ["changed", "is-warning"];
          // ALWAYS register the change in state:
          diffs.set(relativePath, state);
        }
      } 
      
      // Register this directory if it was't already
      if (!diffs.has(relativePath)) {
        diffs.set(relativePath, state);
      }

      // Count this difference fo the return valuue
      switch (state[0]) {
        case "unchanged": unchangedCount++; break;
        case "changed": changedCount++; break;
        case "extra": extraCount++; break;
      }

      extraCount += extra;
      changedCount += changed;
      unchangedCount += unchanged;
    }
    return [unchangedCount, changedCount, extraCount];
  }

  /**
   * Parse both the left and the right trees to produce a list of all
   * entries present in both with their associated status
   */
  getAllDiffs(compareSize: boolean, compareTime: boolean) {
    // A list of difference states for each entry
    const diffs = new Map<string, [DiffType, string]>();

    // Process left to right, then right to left:
    this.processDir(diffs, this.leftTree, this.leftTree, this.rightTree, compareSize, compareTime);
    this.processDir(diffs, this.rightTree, this.rightTree, this.leftTree, compareSize, compareTime);

    return diffs;
  }
}