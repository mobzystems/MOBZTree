import { invoke } from "@tauri-apps/api/core";
import * as Path from '@tauri-apps/api/path';

interface DirEntry {
  name: string;
  is_directory: boolean;
  size: number;
  time_modified: number; // Seconds since UNIX epoch
}

export class DiskItem {
  // Seconds since epoch
  constructor(public name: string, public modifiedTime: number) { }
}

export class TreeFile extends DiskItem {
  constructor(name: string, public size: number, modifiedTime: number) {
    super(name, modifiedTime);
  }
}

export class TreeDirectory extends DiskItem {
  public directories: TreeDirectory[] = [];
  public files: TreeFile[] = [];
  public fullPath: string = "";

  constructor(public parentDirectory: TreeDirectory | undefined, name: string, modifiedTime: number) {
    super(name, modifiedTime);
  }

  // Populate a tree by filling its files and directories
  async loadTree(): Promise<void> {
    // If we have a parent, append our name to theirs, otherwise use our own path
    this.fullPath = this.parentDirectory !== undefined
      ? await Path.join(this.parentDirectory.fullPath, this.name)
      : this.name;

    console.info(`Loading ${this.fullPath}`);

    const json = await invoke<string>("read_directory", { path: this.fullPath });
    const result = JSON.parse(json);

    if (typeof result === "string") {
      // Handle error case
      throw new Error(result);
    }

    const entries = result as DirEntry[];
    const files = entries.filter(file => !file.is_directory);
    const directories = entries?.filter(file => file.is_directory);

    this.files = files.map(file => new TreeFile(file.name, file.size, file.time_modified));
    this.directories = [];
    for (const dir of directories) {
      const directory = new TreeDirectory(this, dir.name, dir.time_modified);
      try {
        await directory.loadTree();
        this.directories.push(directory);
      }
      catch (e: any) {
        console.error(`Skipping directory ${directory.name} because ${e.toString()}`)
      }
    }
  }
}

export class FileTree extends TreeDirectory {
  constructor(public rootPath: string) {
    super(undefined, rootPath, 0);
  }

  static async load(path: string): Promise<FileTree> {
    const tree = new FileTree(path);
    // This may raise an error!
    await tree.loadTree();
    return tree;
  }
}

