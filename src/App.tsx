import { useMemo, useState } from "react";
import "./App.css";
import FilePanel from "./FilePanel";
import { FileTree } from "./FileTree";
import { TreeDiff } from "./TreeDiff";

export default function App() {
  const [leftTree, setLeftTree] = useState<FileTree>();
  const [rightTree, setRightTree] = useState<FileTree>();
  
  const [showDuplicate, setShowDuplicate] = useState(true);
  const [showAdded, setShowAdded] = useState(true);
  const [showDeleted, setShowDeleted] = useState(true);

  const diff = useMemo(() => {
    if (leftTree !== undefined && rightTree !== undefined)
      return new TreeDiff(leftTree, rightTree);
    else
      return undefined;
  }, [leftTree, rightTree]);

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
            <button className={`button ${showDuplicate ? "is-dark" : "is-white"}`} onClick={() => setShowDuplicate(!showDuplicate)} title="Show/Hide duplicate files">Duplicate</button>
            <button className={`button ${showDeleted ? "is-danger" : "is-white"}`} onClick={() => setShowDeleted(!showDeleted)} title="Show/Hide deleted files">Deleted</button>
            <button className={`button ${showAdded ? "is-success" : "is-white"}`} onClick={() => setShowAdded(!showAdded)} title="Show/Hide added files">Added</button>
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
      <FilePanel path={undefined} onLoaded={setLeftTree} diff={diff} options={{ showDuplicate: showDuplicate, showDeleted: showDeleted, showAdded: showAdded }} />
      <FilePanel path={undefined} onLoaded={setRightTree} diff={diff} options={{ showDuplicate: showDuplicate, showDeleted: showDeleted, showAdded: showAdded }} />
    </div>
    <div className="status">
      <div className="buttons are-small">
        {/* <button className="button is-warning">Button 1</button>
        <button className="button is-danger">Button 2</button> */}
      </div>
    </div>
  </div>
}


