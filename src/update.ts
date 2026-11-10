import { fetch } from '@tauri-apps/plugin-http';

export class Version {
  public major: number;
  public minor: number;
  public revision: number;

  constructor(versionString: string) {
    let [major, minor, revision] = versionString.split('.');
    this.major = parseInt(major);
    this.minor = parseInt(minor);
    this.revision = parseInt(revision);
  }

  public value() {
    return 1000 * (1000 * this.major + this.minor) + this.revision;
  }

  public asString() {
    return `${this.major}.${this.minor}.${this.revision}`;
  }
}

/**
 * Check if an updated version is available
 * 
 * @param name The name of the tool
 * @returns A version if a version number is available, otherwise undefined
 */
export async function getUpdateVersion(name: string): Promise<Version | undefined> {
  try {
    const versionString = await ((await fetch(`https://www.mobzystems.com/api/ToolVersion?t=${name}`)).json());
    const version = new Version(versionString);
    return version;
  }
  catch (_e: any) {
    return undefined;
  }
}