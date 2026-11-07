import { ReactElement, useEffect, useState } from "react";
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from "@tauri-apps/api/core";
import * as Path from '@tauri-apps/api/path';

interface DirEntry {
  name: string;
  is_directory: boolean;
  size: number;
  time_modified: number; // Seconds since UNIX epoch
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
  parentPath: string | undefined;
  directories: DirEntry[];
  files: DirEntry[];
};

type ErrorState = {
  state: "error";
  errorPath: string;
  errorMessage: string;
};

type State = ClearState | LoadingState | LoadedState | ErrorState;

const Clear: ClearState = { state: "clear" };
const requestedPathState = (path: string): LoadingState => ({ state: "loading", requestedPath: path });

export default function FilePanel(props: { path: string | undefined }) {
  const [status, setStatus] = useState<State>(props.path === undefined ? Clear : requestedPathState(props.path));

  useEffect(() => {
    async function doit() {
      if (status.state === "loading") {
        let parentPath: string | undefined;

        try {
          parentPath = await Path.dirname(status.requestedPath);
        } catch (e) {
          // This is expected: console.error("Failed to get parent path:", e);
          parentPath = undefined;
        }
        await sleep(1000); // Simulate a delay for testing

        const json = await invoke<string>("read_directory", { path: status.requestedPath });
        const result = JSON.parse(json);
        if (typeof result === "string") {
          // Handle error case
          setStatus({ state: "error", errorPath: status.requestedPath, errorMessage: result })
        } else {
          const entries = result as DirEntry[];
          const files = entries.filter(file => !file.is_directory);
          const directories = entries?.filter(file => file.is_directory);

          setStatus({ state: "loaded", path: status.requestedPath, parentPath: parentPath, files: files, directories: directories })
        }
      }
    }

    doit();

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
              <th align="right">Size</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {status.directories && <DirectoryList directories={status.directories} onDirectoryClick={async (directoryName) => setStatus(requestedPathState(await Path.join(status.path, directoryName)))} />}
            {status.files && <FileList files={status.files} />}
          </tbody>
        </table>
      }
    </div>
    <div className="status">
      <StatusBar status={status} />
    </div>
  </div>
}

function DirectoryList(props: { directories: DirEntry[], onDirectoryClick: (directoryName: string) => void }) {
  return props.directories.map(directory => <DirectoryItem key={directory.name} directory={directory} onClick={() => props.onDirectoryClick(directory.name)} />);
}

function DirectoryItem(props: { directory: DirEntry, onClick: () => void }) {
  return <tr>
    <td><a href="#" onClick={(e) => {
      e.preventDefault();
      props.onClick()
    }}>📁&nbsp;{props.directory.name}</a></td>
    <td></td>
    <td>{new Date(props.directory.time_modified * 1000).toLocaleString()}</td>
  </tr>;
}

function FileList(props: { files: DirEntry[] }) {
  return props.files.map(file => <FileItem key={file.name} file={file} />)
}

function FileItem(props: { file: DirEntry }) {
  return <tr>
    <td>📄&nbsp;{props.file.name}</td>
    <td align="right">{props.file.size}</td>
    <td>{new Date(props.file.time_modified * 1000).toLocaleString()}</td>
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

  function setPath(path?: string) {
    if (path === undefined) {
      props.setStatus(Clear);
    } else {
      props.setStatus(requestedPathState(path));
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
      heading = <h2 className="is-marginless">{props.status.path}</h2>;
      buttons = <>
        <button className="button is-info" disabled={props.status.parentPath === undefined} onClick={() => setPath((props.status as LoadedState).parentPath)}>..</button>
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
      return <>{props.status.directories.length} directories, {props.status.files.length} files [{props.status.parentPath}]</>;
    case "error":
      return <>Error: {props.status.errorMessage}</>
  }
}