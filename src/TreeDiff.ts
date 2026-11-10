import { FileTree, TreeDirectory } from "./FileTree";
import * as Path from '@tauri-apps/api/path';

// The result of a comparison of two items cen be one of these
export type DiffType = "unchanged" | "changed" | "extra" | "???";

export class TreeDiff {
  public diffMap = new Map<string, [DiffType, string]>();

  constructor(protected left: FileTree, protected right: FileTree, compareSize: boolean, compareTime: boolean) {
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
      if (!diffs.has(relativePath)) {
        const [unchanged, changed, extra] = this.processDir(diffs, dir, tree, otherTree, compareSize, compareTime);
        // Get the state of the directory first. It might be extra!
        let state = this.getState(tree, otherTree, relativePath, false, false);
        // Amend the state if is was unchanged - i.e. the directory exists on both sides:
        if (state[0] === "unchanged")
          state = (changed + extra == 0)
            ? ["unchanged", "is-white"]
            : ["changed", "is-warning"];

        switch (state[0]) {
          case "unchanged": unchangedCount++; break;
          case "changed": changedCount++; break;
          case "extra": extraCount++; break;
        }
        // Register this directory
        diffs.set(relativePath, state);

        extraCount += extra;
        changedCount += changed;
        unchangedCount += unchanged;
      }
    }
    return [unchangedCount, changedCount, extraCount];
  }

  /**
   * Parse both the left and the right trees to produce a list of all
   * entries present in both with their associated status
   */
  getAllDiffs(compareSize: boolean, compareTime: boolean) {
    // A list of entries
    const diffs = new Map<string, [DiffType, string]>();

    this.processDir(diffs, this.left, this.left, this.right, compareSize, compareTime);
    // This is not enough!
    // this.processDir(diffs, this.right, this.right, this.left, compareSize, compareTime);
    
    // Now mark all entries in the right tree that have no status as Extra
    for (let path of this.right.entryMap.keys()) {
      if (!this.left.entryMap.has(path)) {
        let entry = this.right.entryMap.get(path);
        // Mark this entry as extra
        diffs.set(path, ["extra", "is-success"]);
        // Mark all parents as changed if this is a directory!
        if (entry instanceof TreeDirectory && entry.parentDirectory !== undefined) {
          diffs.set(this.right.relativePath(entry.parentDirectory.fullPath), ["changed", "is-warning"]);
          entry = entry.parentDirectory;
        }
      }
    }

    return diffs;
  }
}