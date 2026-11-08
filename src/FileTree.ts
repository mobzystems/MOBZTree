import { invoke } from "@tauri-apps/api/core";
import * as Path from '@tauri-apps/api/path';

/**
 * This is the structure of the data returned by Rusts read_directory
 */
interface DirEntry {
  name: string;
  is_directory: boolean;
  size: number;
  time_modified: number; // Seconds since UNIX epoch
}

/**
 * Base class for a file and a directory
 */
export class DiskItem {
  // Seconds since epoch
  constructor(public name: string, public modifiedTime: number) { }
}

/**
 * A file in a file tree
 */
export class TreeFile extends DiskItem {
  constructor(name: string, public size: number, modifiedTime: number) {
    super(name, modifiedTime);
  }
}

/**
 * A directory in a file treee
 */
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

    this.files = files.map(file => new TreeFile(file.name, file.size, file.time_modified)).sort((f1, f2) => f1.name.localeCompare(f2.name, 'en-US'));
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
    this.directories.sort((d1, d2) => d1.name.localeCompare(d2.name, 'en-US'));
  }
}

/**
 * A file tree. In fact a directory, but without a parent and a modification time of 0.
 */
export class FileTree extends TreeDirectory {
  public entryMap = new Map<string, DiskItem>();

  constructor(public rootPath: string) {
    super(undefined, rootPath, 0);
  }

  /**
   * Get the relative path of a path name. The relative path name of the root directory is ""
   */
  public relativePath(path: string) {
    return path.substring(this.rootPath.length + 1);
  }

  static async load(path: string): Promise<FileTree> {
    const tree = new FileTree(path);
    // This may raise an error!
    await tree.loadTree();
    // Patch the name of the topmost directory item
    tree.name = await Path.basename(path);
    
    // Now fill the entry map
    function mapEntries(directory: TreeDirectory) {
      // Add all files with a RELATIVE path
      for (let file of directory.files) {
        const fullName = directory.fullPath + Path.sep() + file.name;
        tree.entryMap.set(tree.relativePath(fullName), file);
      }
      // Then all subdirectories
      for (let dir of directory.directories) {
        const fullName = directory.fullPath + Path.sep() + dir.name;
        tree.entryMap.set(tree.relativePath(fullName), dir);
        // Then add all subdirectories
        mapEntries(dir);
      }
    }

    mapEntries(tree);

    return tree;
  }
}

