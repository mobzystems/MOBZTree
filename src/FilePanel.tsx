import { ReactElement, useEffect, useState } from "react";
import { open } from '@tauri-apps/plugin-dialog';
import * as Path from '@tauri-apps/api/path';
import { TreeDirectory, FileTree, TreeFile } from "./FileTree";
import { TreeDiff } from "./TreeDiff";
import {
  faSync as refreshIcon,
  faHome as homeIcon,
  faClose as closeIcon,
  faArrowUp as upIcon,
  faFolderBlank as directoryIcon,
  faFileArchive as fileIcon
} from "@fortawesome/free-solid-svg-icons";
import { faFolderOpen as openIcon } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { f } from "./NumberFormat"

// The minimum time between state updates when loading directoy trees
const MIN_TIME_BETWEEN_UPDATES = 500;

// function sleep(ms: number) {
//   return new Promise(resolve => setTimeout(resolve, ms));
// }

// These types define the various states of this component. It starts off Clear,
// then switches to Loading and then to Loaded or Error. Each state contains all
// variables for that state.

type ClearState = {
  state: "clear";
};

type LoadingState = {
  state: "loading";
  requestedPath: string;
  cancel: boolean;
};

type LoadedState = {
  state: "loaded";
  path: string;
  tree: FileTree,
  currentDirectory: TreeDirectory,
  message: string | undefined
};

type ErrorState = {
  state: "error";
  errorPath: string;
  errorMessage: string;
};

type State = ClearState | LoadingState | LoadedState | ErrorState;

const Clear: ClearState = { state: "clear" };
const requestedPathState = (path: string): LoadingState => ({ state: "loading", requestedPath: path, cancel: false });

export interface FilterOptions {
  showUnchanged: boolean;
  showChanged: boolean;
  showExtra: boolean;
  compareSize: boolean;
  compareTime: boolean
}

export default function FilePanel(props: {
  name: string,
  path: string | undefined,
  onLoaded: (tree: FileTree | undefined) => void,
  diff: TreeDiff | undefined,
  options: FilterOptions,
  requestedCurrentDirectory: string | undefined,
  onChangeCurrentDirectory: (relativePath: string) => void
}) {
  const [status, setStatus] = useState<State>(Clear);

  const [lastPath, setlastPath] = useState<string | undefined>(props.path);
  const [loadingPath, setLoadingPath] = useState<string>();

  // React to a change in status
  useEffect(() => {
    console.info(`FilePanel '${props.name}': status changed to '${status.state}'`);

    (async function () {
      if (status.state === "clear") {
        props.onLoaded(undefined);
      } else if (status.state === "loading") {
        // await sleep(1000); // Simulate a delay for testing

        setlastPath(status.requestedPath);

        let time = new Date().valueOf();

        try {
          const tree = await FileTree.load(status.requestedPath, (path: string) => {
            // console.info(`Loading '${path}'`);
            // Only update the loading path every ... ms
            const newTime = new Date().valueOf();
            if (newTime - time > MIN_TIME_BETWEEN_UPDATES) {
              setLoadingPath(() => path);
              time = newTime;
            }
            return status.cancel;
          });
          if (status.cancel)
            throw new Error("Loading was cancelled");

          setStatus({ state: "loaded", path: status.requestedPath, tree: tree, currentDirectory: tree, message: undefined })
          props.onLoaded(tree);
        }
        catch (e: any) {
          // Handle error case
          setStatus({ state: "error", errorPath: status.requestedPath, errorMessage: ("message" in e ? e.message : e.toString()) })
        }
      // } else if (status.state === "loaded") {
      //   status.currentDirectory = status.tree;
      }
    })();
  }, [status]);

  // React to a change in the REQUESTED current directory, which is triggered by the other FilePanel (or the app)
  useEffect(() => {
    // console.info(`FilePanel '${props.name}': current directory is now '${props.currentDirectory}'`);
    if (props.requestedCurrentDirectory !== undefined && status.state === "loaded") {
      const entry = status.tree.entryMap.get(props.requestedCurrentDirectory);
      if (entry !== undefined) {
        if (entry instanceof TreeDirectory) {
          setStatus({ ...status, currentDirectory: entry as TreeDirectory, message: undefined });
        } else {
          setStatus({ ...status, message: `FilePanel ''${props.requestedCurrentDirectory}' is a file in this tree` });
        }
      } else {
        setStatus({ ...status, message: `'${props.requestedCurrentDirectory}' is not part of this tree` });
      }
    }
  }, [props.requestedCurrentDirectory]);

  // React to a change in the path supplied by the caller
  useEffect(() => {
    if (props.path !== undefined)
      setStatus(requestedPathState(props.path));
  }, [props.path]);

  function changeDir(newDirectory: TreeDirectory) {
    if (status.state === "loaded") {
      setStatus({ ...status, currentDirectory: newDirectory });
      props.onChangeCurrentDirectory(status.tree.relativePath(newDirectory.fullPath));
    }
  }

  return <div className="file-panel box-NOT">
    <Heading status={status} setStatus={setStatus} onDirectoryChanged={changeDir} lastPath={lastPath} />
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
                options={props.options}
                onDirectoryClick={newDirectory => changeDir(newDirectory)}
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
      <div className="level is-mobile">
        <div className="level-left">
          <StatusBar status={status} loadingPath={loadingPath} />
        </div>
      </div>
    </div>
  </div>
}

function DirectoryList(props: {
  tree: FileTree,
  diff: TreeDiff | undefined,
  directories: TreeDirectory[],
  onDirectoryClick: (newDirectory: TreeDirectory) => void,
  options: FilterOptions
}) {
  return <>{
    props.directories.map(directory =>
      <DirectoryItem key={directory.name}
        tree={props.tree}
        diff={props.diff}
        directory={directory}
        options={props.options}
        onClick={() => props.onDirectoryClick(directory)}
      />
    )
  }</>;
}

function DirectoryItem(props: {
  tree: FileTree,
  diff: TreeDiff | undefined,
  directory: TreeDirectory,
  onClick: () => void,
  options: FilterOptions
}) {
  const relativePath = props.tree.relativePath(props.directory.fullPath);
  // const diffState = props.diff === undefined
  //   ? undefined
  //   : props.diff.getState(relativePath, false, false);
  const diffState = props.diff?.diffMap.get(relativePath);
  const status = (diffState && <div className={`tag ${diffState[1]}`}>{diffState[0]}</div>) || "-";

  const [text, _style] = diffState === undefined ? [undefined, undefined] : diffState;

  if (text !== undefined) {
    if (text === "unchanged" && props.options.showUnchanged === false)
      return undefined;
    if (text === "changed" && props.options.showChanged == false)
      return undefined;
    if (text === "extra" && props.options.showExtra == false)
      return undefined;
  }

  return <tr>
    <td>
      <a href="#" onClick={(e) => { e.preventDefault(); props.onClick() }}>
        <span className="icon-text">
          <span className="icon has-text-warning">
            <FontAwesomeIcon icon={directoryIcon} />
          </span>
          <span>
            {props.directory.name}
          </span>
        </span>
      </a>
    </td>
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
  const diffMap = props.diff?.diffMap.get(relativePath);
  const [text, style] = diffMap === undefined ? [undefined, undefined] : diffMap;
  const status = (style !== undefined && <div className={`tag ${style}`}>{text}</div>) || "-";

  if (text !== undefined) {
    // Suppress showing files that were filtered out
    if (text === "unchanged" && props.options.showUnchanged === false)
      return undefined;
    if (text === "changed" && props.options.showChanged == false)
      return undefined;
    if (text === "extra" && props.options.showExtra == false)
      return undefined;
  }

  return <tr>
    <td>
      <span className="icon-text">
        <span className="icon has-text-info">
          <FontAwesomeIcon icon={fileIcon} />
        </span>
        <span>
          {props.file.name}
        </span>
      </span>
    </td>
    <td align="center">{status}</td>
    <td align="right">{f(props.file.size)}</td>
    <td>{new Date(props.file.modifiedTime * 1000).toLocaleString()}</td>
  </tr>
}

function Heading(props: {
  status: State,
  setStatus: (newStatus: State) => void,
  onDirectoryChanged: (newDirectory: TreeDirectory) => void,
  lastPath: string | undefined
}) {
  let heading: ReactElement;
  let buttons: ReactElement;

  function openPath() {
    open({ title: "Open directory", directory: true, defaultPath: props.lastPath })
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
      if (props.status.state === "loaded") {
        props.onDirectoryChanged(newDirectory);
      }
    }
  }

  switch (props.status.state) {
    case "clear":
      heading = <div className="level-item">
        <a href="#"
          onClick={e => { e.preventDefault(); openPath(); }}
        >Open a directory</a>&nbsp;to get started
      </div>;
      buttons = <button className={`button is-small is-primary`}
        onClick={() => openPath()}
      >
        <span className="icon is-small"><FontAwesomeIcon icon={openIcon} /></span>
      </button>;
      break;
    case "loading":
      heading = <span className="is-italic">Loading. Press Cancel to interrupt.</span>;
      buttons = <button className="button is-warning"
        disabled={props.status.cancel}
        onClick={() => (props.status as LoadingState).cancel = true}
      >
        {props.status.cancel ? "Cancelled" : "Cancel"}
      </button>
      break;
    case "loaded":
      heading = <>
        <h2 className="title is-marginless is-size-5" title={props.status.tree.rootPath}>{props.status.tree.name}</h2>
        {/* <p className="help subtitle">{props.status.tree.rootPath}</p> */}
      </>;
      buttons = <>
        <button className="button is-info"
          title="Go to the top of the directory tree"
          disabled={props.status.currentDirectory.fullPath === props.status.tree.rootPath}
          onClick={() => setPath((props.status as LoadedState).tree)}
        >
          <span className="icon is-small"><FontAwesomeIcon icon={homeIcon} /></span>
        </button>
        <button className="button is-info"
          title="Go one level up in directory tree"
          disabled={props.status.currentDirectory.parentDirectory === undefined}
          onClick={() => setPath((props.status as LoadedState).currentDirectory.parentDirectory ?? (props.status as LoadedState).tree)}
        >
          <span className="icon is-small"><FontAwesomeIcon icon={upIcon} /></span>
        </button>
        <button className="button is-primary"
          title="Refresh the current directory tree"
          onClick={() => props.setStatus(requestedPathState((props.status as LoadedState).tree.rootPath))}
        >
          <span className="icon is-small"><FontAwesomeIcon icon={refreshIcon} /></span>
        </button>
        <button className="button is-danger"
          title="Close the current directory tree"
          onClick={() => setPath(undefined)}
        >
          <span className="icon is-small"><FontAwesomeIcon icon={closeIcon} /></span>
        </button>
      </>;
      break;
    case "error":
      heading = <span className="has-text-danger">{props.status.errorPath}</span>;
      buttons = <button className={`button is-small is-primary`} onClick={() => openPath()}>
        <span className="icon is-small"><FontAwesomeIcon icon={openIcon} /></span>
      </button>;
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

function StatusBar(props: { status: State, loadingPath: string | undefined }) {
  switch (props.status.state) {
    case "clear":
      return <>No directory selected</>;
    case "loading":
      // console.info(`Rendering status bar with ${props.loadingPath}`);
      return <span className="is-italic">Loading {props.loadingPath ?? props.status.requestedPath}...</span>;
    case "loaded":
      return <>
        <div className="level-item">
          <div className="tags has-addons">
            <span className="tag is-warning">Dirs: {props.status.currentDirectory.directories.length}</span>
            <span className="tag is-info">Files: {props.status.currentDirectory.files.length}</span>
          </div>
        </div>
        <div className="level-item">
          {props.status.message !== undefined
            ? <span className="has-text-danger">{props.status.message}</span>
            : `...${Path.sep()}${props.status.tree.relativePath(props.status.currentDirectory.fullPath)}`
          }
        </div>
      </>;
    case "error":
      return <span className="has-text-danger">Error: {props.status.errorMessage}</span>
  }
}