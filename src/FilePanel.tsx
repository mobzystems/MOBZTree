import { ReactElement, useEffect, useState } from "react";
import { open } from '@tauri-apps/plugin-dialog';
import * as Path from '@tauri-apps/api/path';
import { TreeDirectory, FileTree, TreeFile } from "./FileTree";
import { TreeDiff } from "./TreeDiff";

// function sleep(ms: number) {
//   return new Promise(resolve => setTimeout(resolve, ms));
// }

type ClearState = {
  state: "clear";
};

type LoadingState = {
  state: "loading";
  requestedPath: string;
};

type LoadedState = {
  state: "loaded";
  path: string;
  tree: FileTree,
  currentDirectory: TreeDirectory
};

type ErrorState = {
  state: "error";
  errorPath: string;
  errorMessage: string;
};

type State = ClearState | LoadingState | LoadedState | ErrorState;

const Clear: ClearState = { state: "clear" };
const requestedPathState = (path: string): LoadingState => ({ state: "loading", requestedPath: path });

export interface FilterOptions {
  showUnchanged: boolean;
  showDeleted: boolean;
  showAdded: boolean;
  compareSize: boolean;
  compareTime: boolean
}

export default function FilePanel(props: {
  path: string | undefined,
  onLoaded: (tree: FileTree | undefined) => void,
  diff: TreeDiff | undefined,
  options: FilterOptions
}) {
  const [status, setStatus] = useState<State>(props.path === undefined ? Clear : requestedPathState(props.path));

  useEffect(() => {
    (async function doit() {
      if (status.state === "loading") {
        // await sleep(1000); // Simulate a delay for testing

        try {
          const tree = await FileTree.load(status.requestedPath);
          setStatus({ state: "loaded", path: status.requestedPath, tree: tree, currentDirectory: tree })
          props.onLoaded(tree);
        }
        catch (e: any) {
          // Handle error case
          setStatus({ state: "error", errorPath: status.requestedPath, errorMessage: e.toString() })
        }
      } else if (status.state === "clear") {
        props.onLoaded(undefined);
      }
    })();
  }, [status]);

  return <div className="file-panel box">
    <Heading status={status} setStatus={setStatus} />
    <div className="main">
      {status.state === "error" && <div className="notification is-danger">{status.errorMessage}</div>}
      {status.state === "loaded" &&
        <table className="table is-striped is-narrow is-fullwidth nowrap">
          <thead>
            <tr>
              <th>Name</th>
              <th align="center">Status</th>
              <th align="right">Size</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {status.currentDirectory.directories.length !== 0 &&
              <DirectoryList
                tree={status.tree}
                diff={props.diff}
                directories={status.currentDirectory.directories}
                onDirectoryClick={newDirectory => setStatus({ ...status, currentDirectory: newDirectory })}
              />
            }
            {status.currentDirectory.files.length !== 0 &&
              <FileList
                tree={status.tree}
                diff={props.diff}
                directoryPath={status.currentDirectory.fullPath}
                files={status.currentDirectory.files}
                options={props.options}
              />}
          </tbody>
        </table>
      }
    </div>
    <div className="status">
      <StatusBar status={status} />
    </div>
  </div>
}

function DirectoryList(props: {
  tree: FileTree,
  diff: TreeDiff | undefined,
  directories: TreeDirectory[],
  onDirectoryClick: (newDirectory: TreeDirectory) => void
}) {
  return <>{
    props.directories.map(directory =>
      <DirectoryItem key={directory.name}
        tree={props.tree}
        diff={props.diff}
        directory={directory}
        onClick={() => props.onDirectoryClick(directory)}
      />
    )
  }</>;
}

function DirectoryItem(props: {
  tree: FileTree,
  diff: TreeDiff | undefined,
  directory: TreeDirectory,
  onClick: () => void
}) {
  const relativePath = props.tree.relativePath(props.directory.fullPath);
  const diffState = props.diff === undefined
    ? undefined
    : props.diff.getState(relativePath, false, false);
  const status = (diffState && <div className={`tag ${diffState[1]}`}>{diffState[0]}</div>) || "-";

  return <tr>
    <td><a href="#" onClick={(e) => {
      e.preventDefault();
      props.onClick()
    }}>📁&nbsp;{props.directory.name}</a></td>
    <td align="center">{status}</td>
    <td></td>
    <td>{new Date(props.directory.modifiedTime * 1000).toLocaleString()}</td>
  </tr>;
}

function FileList(props: {
  tree: FileTree,
  diff: TreeDiff | undefined,
  directoryPath: string,
  files: TreeFile[],
  options: FilterOptions
}) {
  return props.files.map(file =>
    <FileItem key={file.name}
      tree={props.tree}
      diff={props.diff}
      directoryPath={props.directoryPath}
      file={file}
      options={props.options}
    />
  )
}

function FileItem(props: {
  tree: FileTree,
  diff: TreeDiff | undefined,
  directoryPath: string,
  file: TreeFile,
  options: FilterOptions
}) {
  const relativePath = props.tree.relativePath(props.directoryPath + Path.sep() + props.file.name);
  const [text, style] = props.diff === undefined
    ? [undefined, undefined]
    : props.diff.getState(relativePath, props.options.compareSize, props.options.compareTime);
  const status = (style !== undefined && <div className={`tag ${style}`}>{text}</div>) || "-";

  if (text === "duplicate" && props.options.showUnchanged === false)
    return undefined;
  if (text === "deleted" && props.options.showDeleted == false)
    return undefined;
  if (text === "added" && props.options.showAdded == false)
    return undefined;

  return <tr>
    <td>📄&nbsp;{props.file.name}</td>
    <td align="center">{status}</td>
    <td align="right">{props.file.size}</td>
    <td>{new Date(props.file.modifiedTime * 1000).toLocaleString()}</td>
  </tr>
}

function Heading(props: { status: State, setStatus: (newStatus: State) => void }) {
  let heading: ReactElement;
  let buttons: ReactElement;

  function openPath() {
    open({ title: "Open directory", directory: true }) // TODO: , defaultPath: path
      .then((selectedPath) => {
        if (selectedPath) {
          props.setStatus(requestedPathState(selectedPath))
        }
      });
  }

  function setPath(newDirectory?: TreeDirectory) {
    if (newDirectory === undefined) {
      props.setStatus(Clear);
    } else {
      props.setStatus({ ...(props.status as LoadedState), currentDirectory: newDirectory });
    }
  }

  switch (props.status.state) {
    case "clear":
      heading = <>Please open a directory</>;
      buttons = <button className={`button is-small is-primary`} onClick={() => openPath()}>Open</button>;
      break;
    case "loading":
      heading = <>Loading</>;
      buttons = <button className="button is-warning">Cancel</button>
      break;
    case "loaded":
      heading = <h2 className="is-marginless">{props.status.currentDirectory.fullPath}</h2>;
      buttons = <>
        <button className="button is-info"
          disabled={props.status.currentDirectory.fullPath === props.status.tree.rootPath}
          onClick={() => setPath((props.status as LoadedState).tree)}
        >H</button>
        <button className="button is-info"
          disabled={props.status.currentDirectory.parentDirectory === undefined}
          onClick={() => setPath((props.status as LoadedState).currentDirectory.parentDirectory)}
        >..</button>
        <button className="button is-info" onClick={() => setPath(undefined)}>&times;</button>
      </>;
      break;
    case "error":
      heading = <span className="has-text-danger">{props.status.errorPath}</span>;
      buttons = <button className={`button is-small is-primary`} onClick={() => openPath()}>Open</button>;
  }

  return <div className="header">
    <div className="level is-mobile">
      <div className="level-left">
        {heading}
      </div>
      <div className="level-right">
        <div className="buttons has-addons are-small">
          {buttons}
        </div>
      </div>
    </div>
  </div>
}

function StatusBar(props: { status: State }) {
  switch (props.status.state) {
    case "clear":
      return <>No directory selected</>;
    case "loading":
      return <>Loading</>;
    case "loaded":
      return <>{props.status.currentDirectory.directories.length} directories, {props.status.currentDirectory.files.length} files</>;
    case "error":
      return <>Error: {props.status.errorMessage}</>
  }
}