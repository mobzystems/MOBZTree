import { useEffect, useMemo, useState } from "react";
import "./App.css";

import { faMoon as darkThemeIcon, faSun as lightThemeIcon, faClock as timeIcon, faCircleUp as updateIcon } from "@fortawesome/free-regular-svg-icons";
import { faRuler as sizeIcon } from "@fortawesome/free-solid-svg-icons";

import * as tauriApp from '@tauri-apps/api/app';
import * as tauriWindow from '@tauri-apps/api/window';
import * as tauriCli from '@tauri-apps/plugin-cli';

import FilePanel, { FilterOptions } from "./FilePanel";
import { FileTree } from "./FileTree";
import { TreeDiff } from "./TreeDiff";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { VisibleIcon } from "./CheckBoxIcon";

import { Version, getUpdateVersion } from "./update";

export default function App() {
  const [appName, setAppName] = useState<string>();
  const [version, setVersion] = useState<Version>();
  const [updateVersion, setUpdateVersion] = useState<Version>();

  const [leftTree, setLeftTree] = useState<FileTree>();
  const [initialLeftPath, setInitialLeftPath] = useState<string>();
  const [helpMessage, setHelpMessage] = useState<string>();

  const [rightTree, setRightTree] = useState<FileTree>();
  const [initialRightPath, setInitialRightPath] = useState<string>();

  const [isDarkTheme, setIsDarkTheme] = useState(false);

  const [compareSize, setCompareSize] = useState(false);
  const [compareTime, setCompareTime] = useState(false);

  const [showUnchanged, setShowUnchanged] = useState(true);
  const [showChanged, setShowChanged] = useState(true);
  const [showExtra, setShowExtra] = useState(true);

  const [currentDirectory, setCurrentDirectory] = useState<string>();

  const diff = useMemo(() => {
    if (leftTree !== undefined && rightTree !== undefined)
      return new TreeDiff(leftTree, rightTree, compareSize, compareTime);
    else
      return undefined;
  }, [leftTree, rightTree, compareSize, compareTime]);

  const filterOptions: FilterOptions = {
    showUnchanged: showUnchanged,
    showChanged: showChanged,
    showExtra: showExtra,
    compareSize: compareSize,
    compareTime: compareTime
  }

  function changeDir(relativePath: string) {
    // TODO: if syncing, i.e. if both file panels have a tree loaded
    console.info(`Changing current directory from '${currentDirectory}' to '${relativePath}'`)
    setCurrentDirectory(relativePath);
  }

  // Update the DOM when the theme changes
  useEffect(() => {
    document.getElementsByTagName("html")[0].setAttribute("data-theme", isDarkTheme ? "dark" : "light");
  }, [isDarkTheme]);

  // This hook runs on startup:
  useEffect(() => {
    console.info("Initializing app");

    function applyTheme(theme: tauriWindow.Theme | null) {
      if (theme !== null) {
        if (theme === "dark")
          setIsDarkTheme(true);
        else
          setIsDarkTheme(false);
      }
    }

    (async function () {
      const appWindow = tauriWindow.getCurrentWindow();

      const appVersion = await tauriApp.getVersion();
      const appName = await tauriApp.getName();

      await appWindow.setTitle(`${appName} v${appVersion}`)
      // await appWindow.setIcon("/mobzystems.png");

      setVersion(new Version(appVersion));
      setAppName(appName);

      // Get initial theme ('light' | 'dark' | null)
      const theme = await appWindow.theme();
      applyTheme(theme);

      // Listen for system theme changes
      const unlisten = await appWindow.onThemeChanged(({ payload: theme }) => {
        // console.log(`Theme changed to: ${theme}`);
        applyTheme(theme);
      });

      // Parse the command line. To pass arguments, call
      // npm run tauri dev -- -- -- [left-path [right-path]]
      try {
        const matches = await tauriCli.getMatches();
        if (matches.args.left?.value) {
          console.info(`Left path: ${matches.args.left.value}`);
          setInitialLeftPath(matches.args.left.value as string);
        }
        if (matches.args.right?.value) {
          console.info(`Right path: ${matches.args.right.value}`);
          setInitialRightPath(matches.args.right.value as string);
        }
        if (matches.args.help) {
          setHelpMessage(matches.args.help.value as string);
        }
      }
      catch (e: any) {
        setHelpMessage(typeof(e) === "string" ? e : "message" in e ? e.message : e.toString());
      }

      // Launch an update check, but don't await it!
      getUpdateVersion(appName).then(version => setUpdateVersion(version));

      // This is actually not returned. TODO
      return unlisten;
    })();
  }, []);

  return <div className="app debug-NOT">
    <div className="header level is-mobile">
      <div className="level-left">
        <div className="level-item">
          <h1 className="title" title={`${appName} version ${version}`}>{appName}</h1>
        </div>
      </div>
      <div className="level-right">
        <div className="level-item">
          <div className="buttons are-small has-addons">
            <button className={`button ${isDarkTheme ? "is-dark" : "is-light"}`}
              onClick={() => setIsDarkTheme(!isDarkTheme)} title="Switch dark/light mode">
              <span className="icon">
                <FontAwesomeIcon icon={isDarkTheme ? darkThemeIcon : lightThemeIcon} />
              </span>
              <span>{isDarkTheme ? "Dark" : "Light"}</span>
            </button>
          </div>
        </div>
        <div className="level-item">
          <div className="buttons are-small has-addons">
            <button className={`button is-info ${!compareSize ? "is-light" : ""}`} onClick={() => setCompareSize(!compareSize)} title="Compare files by size">
              <span className="icon">
                <FontAwesomeIcon icon={sizeIcon} />
              </span>
              <span>Size</span>
            </button>
            <button className={`button is-info ${!compareTime ? "is-light" : ""}`} onClick={() => setCompareTime(!compareTime)} title="Compare files by time">
              <span className="icon">
                <FontAwesomeIcon icon={timeIcon} />
              </span>
              <span>Time</span>
            </button>
          </div>
        </div>
        <div className="level-item">
          <div className="buttons are-small has-addons">
            <button className={`button ${!showUnchanged ? "is-light" : "is-dark"}`} onClick={() => setShowUnchanged(!showUnchanged)} title="Show/Hide unchanged files">
              <VisibleIcon state={showUnchanged} />
              <span>Unchanged</span>
            </button>
            <button className={`button is-warning ${!showChanged ? "is-light" : ""}`} onClick={() => setShowChanged(!showChanged)} title="Show/Hide changed files">
              <VisibleIcon state={showChanged} />
              <span>Changed</span>
            </button>
            <button className={`button is-success ${!showExtra ? "is-light" : ""}`} onClick={() => setShowExtra(!showExtra)} title="Show/Hide extra files">
              <VisibleIcon state={showExtra} />
              <span>Extra</span>
            </button>
          </div>
        </div>
        {helpMessage &&
          <div className="level-item">
            <div className="buttons are-small">
              <button className="button is-danger" onClick={() => alert(helpMessage)}>?</button>
            </div>
          </div>
        }
        {updateVersion !== undefined && version !== undefined && updateVersion.value() > version.value() &&
          <div className="level-item">
            <div className="buttons are-small">
              <button className="button is-info" onClick={() => alert(`A new version of ${appName} is available: ${updateVersion.asString()}. Download it at\n\nhttps://www.mobzystems.com/tools/${appName}`)}>
                <span className="icon">
                  <FontAwesomeIcon icon={updateIcon} />
                </span>
              </button>
            </div>
          </div>
        }
      </div>
    </div>
    <div className="main">
      <FilePanel name="Left" path={initialLeftPath} onLoaded={setLeftTree} diff={diff} options={filterOptions} requestedCurrentDirectory={currentDirectory} onChangeCurrentDirectory={changeDir} />
      <FilePanel name="Right" path={initialRightPath} onLoaded={setRightTree} diff={diff} options={filterOptions} requestedCurrentDirectory={currentDirectory} onChangeCurrentDirectory={changeDir} />
    </div>
    {/* <div className="status">
      <div className="buttons are-small">
        <button className="button is-warning">Button 1</button>
        <button className="button is-danger">Button 2</button>
      </div>
      MOBZTree v0.7.0 by <a target="_blank">MOBZystems, Home of Tools</a>
    </div> */}
  </div>
}


