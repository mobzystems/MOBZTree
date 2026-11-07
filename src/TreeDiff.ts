import { FileTree } from "./FileTree";

export class TreeDiff {
  constructor(protected left: FileTree, protected right: FileTree) {}

  getState(path: string, compareSize: boolean, compareTime: boolean) {
    const leftItem = this.left.entryMap.get(path);
    const rightItem = this.right.entryMap.get(path);

    if (leftItem !== undefined && rightItem === undefined)
      return ["deleted", "is-danger"];
    else if (leftItem === undefined && rightItem !== undefined)
      return ["added", "is-success"];
    else if (leftItem !== undefined && rightItem !== undefined) {
      if (typeof(leftItem) === typeof(rightItem)) {
        // Handle files:
        if ("size" in leftItem && "size" in rightItem) {
          if (
            (!compareTime || leftItem.modifiedTime === rightItem.modifiedTime) &&
            (!compareSize || leftItem.size === rightItem.size)
          )
            return ["duplicate", "is-light"];
          else
            return ["changed", "is-warning"];
        } else {
          // Directories???
          return ["dir", "is-info"];
        }
        // else if (leftItem.modifiedTime < rightItem.modifiedTime)
        //   return ["older", "is-light"];
        // else
        //   return ["newer", "is-light"];
      } else
        return ["type?", "is-danger"];
    } else
      return ["???", " is-danger"];
  }
}