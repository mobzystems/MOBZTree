import { useState } from "react";
import { TreeDirectory } from "./FileTree";
import { TreeDiff } from "./TreeDiff";
import { faCaretRight as rightIcon, faCaretDown as downIcon, faFolderBlank as directoryIcon } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export default function DifferenceDialog(props: {
  diff: TreeDiff,
  onClose: () => void
}) {

  return <>
    <div className="box">
      <h2 className="title is-size-4">Differences between '{props.diff.leftTree.name}' and '{props.diff.rightTree.name}'</h2>
      <DifferenceTree diff={props.diff} />
      <div className="buttons is-right">
        <button className="button is-info" onClick={() => props.onClose()}>Close</button>
      </div>
    </div>
  </>;
}
type UniqueState = "both" | "leftOnly" | "rightOnly";

function DiffList(props: {
  name: string,
  state: UniqueState,
  left: TreeDirectory | undefined,
  right: TreeDirectory | undefined,
  collapsed: boolean;
}) {
  const [collapsed, setCollapsed] = useState(props.collapsed);

  function mergeDirectories(left: TreeDirectory | undefined, right: TreeDirectory | undefined) {
    const map = new Map<string, UniqueState>();
    if (left)
      left.directories.forEach(dir => map.set(dir.name, "leftOnly"));
    if (right) {
      right.directories.forEach(dir => {
        if (map.has(dir.name))
          map.set(dir.name, "both");
        else
          map.set(dir.name, "rightOnly");
      });
    }
    return map;
  }

  const d = mergeDirectories(props.left, props.right);
  const subdirectories = Array.from(d.entries())
    .sort(([dirName1, _state1], [dirName2, _state2]) => dirName1.localeCompare(dirName2));

  const style = props.state === "both"
    ? "light"
    : props.state === "leftOnly"
      ? "success"
      : "danger";

  return <li className={collapsed ? "collapsed" : ""}>
    <span className="icon-text">
      {subdirectories.length === 0
        ? <>
          <span className="icon"></span>
          <span className="icon">
            <FontAwesomeIcon icon={directoryIcon} className={`has-text-${style}`} />
          </span>
          <span>{props.name}</span>
        </>
        : <>
          <span className="icon" onClick={() => setCollapsed(!collapsed)}>
            <FontAwesomeIcon icon={collapsed ? rightIcon : downIcon} />
          </span>
          <span className="icon">
            <FontAwesomeIcon icon={directoryIcon} className="has-text-warning" />
          </span>
          <span>{props.name}</span>
        </>
      }
      <span className={`tag is-${style} is-float-right`}>{props.state}</span>
    </span>
    {!collapsed && <ul>
      {subdirectories.map(([dirName, state]) =>
        <DiffList key={dirName}
          name={dirName}
          state={state}
          left={props.left?.directories.find(d => d.name === dirName)}
          right={props.right?.directories.find(d => d.name === dirName)}
          collapsed={true}
        />
      )}
    </ul>}
  </li>;
}

function DifferenceTree(props: {
  diff: TreeDiff
}) {
  return <ul className="content is-fullheight tree">
    <DiffList name="/" state="both" left={props.diff.leftTree} right={props.diff.rightTree} collapsed={false} />
  </ul>;
}
