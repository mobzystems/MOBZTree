import { useMemo, useState } from "react";
import "./App.css";
import FilePanel, { FilterOptions } from "./FilePanel";
import { FileTree } from "./FileTree";
import { TreeDiff } from "./TreeDiff";

export default function App() {
  const [leftTree, setLeftTree] = useState<FileTree>();
  const [rightTree, setRightTree] = useState<FileTree>();

  const [compareSize, setCompareSize] = useState(false);
  const [compareTime, setCompareTime] = useState(false);

  const [showUnchanged, setShowUnchanged] = useState(true);
  const [showAdded, setShowAdded] = useState(true);
  const [showDeleted, setShowDeleted] = useState(true);

  const diff = useMemo(() => {
    if (leftTree !== undefined && rightTree !== undefined)
      return new TreeDiff(leftTree, rightTree);
    else
      return undefined;
  }, [leftTree, rightTree, compareSize, compareTime]);

  const filterOptions: FilterOptions = {
    showUnchanged: showUnchanged,
    showDeleted: showDeleted,
    showAdded: showAdded,
    compareSize: compareSize,
    compareTime: compareTime
  }

  return <div className="app debug-NOT">
    <div className="header level is-mobile">
      <div className="level-left">
        <div className="level-item">
          <h1 className="title">MOBZTree</h1>
          {/* <h2 className="subtitle">A Tauri + React + Bulma test</h2> */}
        </div>
      </div>
      <div className="level-right">
        <div className="level-item">
          <div className="buttons are-small has-addons">
            <button className={`button is-info ${!compareSize ? "is-light" : ""}`} onClick={() => setCompareSize(!compareSize)} title="Compare files by size">Size</button>
            <button className={`button is-info ${!compareTime ? "is-light" : ""}`} onClick={() => setCompareTime(!compareTime)} title="Compare files by time">Time</button>
          </div>
        </div>
        <div className="level-item">
          <div className="buttons are-small has-addons">
            <button className={`button is-light ${!showUnchanged ? "is-dark" : ""}`} onClick={() => setShowUnchanged(!showUnchanged)} title="Show/Hide unchanged files">Unchanged</button>
            <button className={`button is-danger ${!showDeleted ? "is-dark" : ""}`} onClick={() => setShowDeleted(!showDeleted)} title="Show/Hide deleted files">Deleted</button>
            <button className={`button is-success ${!showAdded ? "is-dark" : ""}`} onClick={() => setShowAdded(!showAdded)} title="Show/Hide added files">Added</button>
          </div>
        </div>
        <div className="level-item">
          <div className="buttons are-small">
            <button className="button is-primary" onClick={() => alert(`${leftTree?.rootPath} / ${rightTree?.rootPath}`)}>Compare</button>
          </div>
        </div>
      </div>
    </div>
    <div className="main">
      <FilePanel path={undefined} onLoaded={setLeftTree} diff={diff} options={filterOptions} />
      <FilePanel path={undefined} onLoaded={setRightTree} diff={diff} options={filterOptions} />
    </div>
    <div className="status">
      <div className="buttons are-small">
        {/* <button className="button is-warning">Button 1</button>
        <button className="button is-danger">Button 2</button> */}
      </div>
    </div>
  </div>
}


