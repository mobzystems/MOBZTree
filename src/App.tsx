import "./App.css";
import FilePanel from "./FilePanel";

export default function App() {
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
            <button className="button is-info" onClick={() => alert(123)}>Button 1</button>
            <button className="button is-link">Button 2</button>
          </div>
        </div>
      </div>
    </div>
    <div className="main">
      <FilePanel path={undefined} />
      <FilePanel path={undefined} />
    </div>
    <div className="status">
      <div className="buttons are-small">
        <button className="button is-warning">Button 1</button>
        <button className="button is-danger">Button 2</button>
      </div>
    </div>
  </div>
}


