import { useState } from "react";
import "./App.css";
import FilePanel from "./FilePanel";
import { FileTree } from "./FileTree";

export default function App() {
  const [leftTree, setLeftTree] = useState<FileTree>();
  const [rightTree, setRightTree] = useState<FileTree>();

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
          <div className="buttons are-small">
            <button className="button is-primary" onClick={() => alert(`${leftTree?.rootPath} / ${rightTree?.rootPath}`)}>Compare</button>
          </div>
        </div>
      </div>
    </div>
    <div className="main">
      <FilePanel path={undefined} onLoaded={setLeftTree} otherTree={rightTree} />
      <FilePanel path={undefined} onLoaded={setRightTree} otherTree={leftTree} />
    </div>
    <div className="status">
      <div className="buttons are-small">
        <button className="button is-warning">Button 1</button>
        <button className="button is-danger">Button 2</button>
      </div>
    </div>
  </div>
}


