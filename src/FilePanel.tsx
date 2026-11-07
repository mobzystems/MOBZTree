import { useEffect, useMemo, useState } from "react";
// import { DirEntry, readDir } from "@tauri-apps/plugin-fs";
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

export default function FilePanel(props: { path: string | undefined }) {
  const [entries, setEntries] = useState<DirEntry[]>();
  const [path, setPath] = useState<string | undefined>(props.path);
  const [parentPath, setParentPath] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  // Derived state:
  const isOpen = path !== undefined;

  const files = useMemo(() => entries?.filter(file => !file.is_directory), [entries]);
  const directories = useMemo(() => entries?.filter(file => file.is_directory), [entries]);

  const fileCount = files?.length ?? 0;
  const directoryCount = directories?.length ?? 0;

  useEffect(() => {
    if (path === undefined) {
      setEntries([]);
      setParentPath(undefined);
      setError(undefined);
    } else {
      async function doit(path: string) {
        try {
          const parent = await Path.dirname(path);
          setParentPath(parent);
        } catch (e) {
          // This is expeted: console.error("Failed to get parent path:", e);
          setParentPath(undefined);
        }
        await sleep(0); // Simulate a delay for testing
        const json = await invoke<string>("read_directory", { path: path });
        const result = JSON.parse(json);
        if (typeof result === "string") {
          // Handle error case
          setError(result);
          setEntries([]);
        } else {
          const entries = result as DirEntry[];
          setEntries(entries);
          setError(undefined);
        }
      }
      doit(path);
    }
  }, [path]);

  function openPath() {
    open({ title: "Open directory", directory: true, defaultPath: path })
      .then((selectedPath) => {
        if (selectedPath) {
          setEntries(undefined);
          setPath(selectedPath);
        } else {
          setPath(undefined);
        }
      });
  }

  return <div className="file-panel box">
    <div className="header">
      <div className="level is-mobile">
        <div className="level-left">
          <h2 className="is-marginless">{
            isOpen
              ? path
              : "Open a directory to start"
          }</h2>
        </div>
        <div className="level-right">
          <div className="buttons has-addons">
            {isOpen && <button className="button is-small is-info" disabled={parentPath === undefined} onClick={() => setPath(parentPath)}>..</button>}
            {isOpen
              ? <button className="button is-small is-info" onClick={() => setPath(undefined)}>&times;</button>
              : <button className={`button is-small is-primary`} onClick={() => openPath()}>Open</button>
            }
          </div>
        </div>
      </div>
    </div>
    <div className="main">
      {!isOpen
        ? "No directory selected"
        : error !== undefined
          ? <div className="notification is-danger">{error}</div>
          : entries === undefined
            ? "Loading..."
            : <table className="table is-striped is-narrow is-fullwidth nowrap">
              <thead>
                <tr>
                  <th>Name</th>
                  <th align="right">Size</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {directories && <DirectoryList directories={directories} onDirectoryClick={async (directoryName) => setPath(await Path.join(path!, directoryName))} />}
                {files && <FileList files={files} />}
              </tbody>
            </table>
      }
    </div>
    <div className="status">
      {!isOpen
        ? "No directory selected"
        : entries === undefined
          ? "Loading..."
          : `${directoryCount} directories, ${fileCount} files (${parentPath})`
      }
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