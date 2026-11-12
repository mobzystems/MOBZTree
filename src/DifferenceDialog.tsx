import { FileTree } from "./FileTree";
import { TreeDiff } from "./TreeDiff";

export default function DifferenceDialog(props: {
  leftTree: FileTree,
  rightTree: FileTree,
  diff: TreeDiff,
  onClose: () => void
}) {
  return <>
    <div className="box">
      <h2 className="title is-size-4">Differences between '{props.leftTree.name}' and '{props.rightTree.name}'</h2>
      <p>TO DO</p>
      <div className="buttons are-NOT-small is-right">
        <button className="button is-info" onClick={() => props.onClose()}>Close</button>
      </div>
    </div>
  </>;
}