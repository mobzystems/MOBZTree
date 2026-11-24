import { ReactElement, useEffect, useRef, useState } from "react";
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
  onChangeCurrentDirectory: (relativePath: string) => void,
  requestedCurrentFile: string | undefined,
  onChangeCurrentFile: (filename: string) => void,
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

  return <div className="file-panel">
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
                selectedFileName={props.requestedCurrentFile}
                onFileChanged={props.onChangeCurrentFile}
              />}
          </tbody>
        </table>
      }
    </div>
    <div className="status">
      <StatusBar status={status} loadingPath={loadingPath} />
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
  options: FilterOptions,
  selectedFileName: string | undefined,
  onFileChanged: (filename: string) => void
}) {
  return props.files.map(file =>
    <FileItem key={file.name}
      tree={props.tree}
      diff={props.diff}
      directoryPath={props.directoryPath}
      file={file}
      options={props.options}
      selectedFilename={props.selectedFileName}
      onFileChanged={props.onFileChanged}
    />
  )
}

function duration(s1: number, s2: number): string {
  if (s1 > s2) {
    [s1, s2] = [s2, s1];
  }

  const d1 = new Date(s1 * 1000);
  const d2 = new Date(s2 * 1000);

  let s = "";

  const y = d2.getFullYear() - d1.getFullYear();
  if (y === 1)
    s += "1 year, ";
  else if (y > 1)
    s += `${y} years, `;

  const m = d2.getMonth() - d1.getMonth();
  if (m === 1)
    s += "1 month, ";
  else if (m > 1)
    s += `${m} months, `;

  const d = d2.getMonth() - d1.getMonth();
  if (d === 1)
    s += "1 day, ";
  else if (d > 1)
    s += `${d} days, `;

  if (s === "")
    return s;

  // Cut off last ", "
  return s.substring(0, s.length - 2);
}

function FileItem(props: {
  tree: FileTree,
  diff: TreeDiff | undefined,
  directoryPath: string,
  file: TreeFile,
  options: FilterOptions,
  selectedFilename: string | undefined,
  onFileChanged: (filename: string) => void
}) {
  // Are we the requested file?
  const isSelected = props.selectedFilename !== undefined && props.selectedFilename === props.file.name;

  // Are we selected? Always start with false. If we select ourselves we'll
  // set this to true.
  const [selected, setSelected] = useState(false);

  const relativePath = props.tree.relativePath(props.directoryPath + Path.sep() + props.file.name);
  const diffMap = props.diff?.diffMap.get(relativePath);
  const [text, style] = diffMap === undefined ? [undefined, undefined] : diffMap;
  const status = (style !== undefined && <div className={`tag ${style}`}>{text}</div>) || "-";

  const currentFile = useRef(null);

  const companion = props.diff?.getCompanion(props.tree, relativePath);
  let extraSizeStatus: string = "";
  let extraTimeStatus: string = "";

  if (companion !== undefined && "size" in companion) {
    const otherFile = companion as TreeFile;

    if (props.options.compareSize) {
      if (props.file.size < otherFile.size) {
        extraSizeStatus = ` (${f(props.file.size - otherFile.size)})`;
      } else if (props.file.size > otherFile.size) {
        extraSizeStatus = ` (+${f(props.file.size - otherFile.size)})`;
      }
    }

    if (props.options.compareTime) {
      if (props.file.modifiedTime < otherFile.modifiedTime) {
        extraTimeStatus = ` (${duration(props.file.modifiedTime, otherFile.modifiedTime)})`;
      } else if (props.file.modifiedTime > otherFile.modifiedTime) {
        extraTimeStatus = ` (+${duration(props.file.modifiedTime, otherFile.modifiedTime)})`;
      }
    }
  }

  // Scroll the selected element into view, but only if we are the current file
  // and we're not selected yet
  useEffect(() => {
    if (props.selectedFilename === props.file.name && currentFile.current !== null) {
      if (!selected) {
        (currentFile.current as Element).scrollIntoView();
        setSelected(true);
      }
    } else {
      setSelected(false);
    }
  }, [props.selectedFilename, selected]);

  // Notify others that we have selected ourselves
  function selectFileName(filename: string) {
    // Mark ourselves as selected so we don't scrollIntoView
    setSelected(true);
    props.onFileChanged(filename);
  }

  if (text !== undefined) {
    // Suppress showing files that were filtered out
    if (text === "unchanged" && props.options.showUnchanged === false)
      return undefined;
    if (text === "changed" && props.options.showChanged == false)
      return undefined;
    if (text === "extra" && props.options.showExtra == false)
      return undefined;
  }

  return <tr className={isSelected ? "is-selected" : ""} onClick={() => selectFileName(props.file.name)} ref={currentFile}>
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
    <td align="right">{f(props.file.size)} {extraSizeStatus !== "" && <span className="tag is-dark is-small">{extraSizeStatus.trim()}</span>}</td>
    <td>{new Date(props.file.modifiedTime * 1000).toLocaleString()}{extraTimeStatus}</td>
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
        title="Open an directory tree"
        onClick={() => openPath()}
      >
        <span className="icon is-small"><FontAwesomeIcon icon={openIcon} /></span>
      </button>;
      break;
    case "loading":
      heading = <span className="is-italic">Loading. Press Cancel to interrupt.</span>;
      buttons = <button className="button is-warning"
        title="Cancel loading the directory tree"
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
      return <div className="level is-mobile">
        <div className="level-left">
          <div className="level-item">
            <span className="is-italic">No directory selected</span>
          </div>
        </div>
      </div>;
    case "loading":
      return <span className="is-italic is-float-right nowrap">{props.loadingPath ?? props.status.requestedPath}...</span>
    case "loaded":
      return <div className="level is-mobile">
        <div className="level-left">
          <div className="level-item">
            <div className="tags has-addons">
              <span className="tag is-warning">Dirs: {props.status.currentDirectory.directories.length}</span>
              <span className="tag is-info">Files: {props.status.currentDirectory.files.length}</span>
            </div>
          </div>
          <div className="level-item">
            {props.status.message !== undefined
              ? <span className="has-text-danger">{props.status.message}</span>
              : <span className="is-small">{`...${Path.sep()}${props.status.tree.relativePath(props.status.currentDirectory.fullPath)}`}</span>
            }
          </div>
        </div>
      </div>;
    case "error":
      return <span className="has-text-danger">There was an error loading the directory</span>
  }
}