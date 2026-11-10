import { useEffect, useMemo, useState } from "react";
import "./App.css";
import FilePanel, { FilterOptions } from "./FilePanel";
import { FileTree } from "./FileTree";
import { TreeDiff } from "./TreeDiff";
import { faMoon as darkThemeIcon, faSun as lightThemeIcon, faClock as timeIcon } from "@fortawesome/free-regular-svg-icons";
import { faRuler as sizeIcon } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getCurrentWindow, Theme } from '@tauri-apps/api/window';
import { VisibleIcon } from "./CheckBoxIcon";

export default function App() {
  const [leftTree, setLeftTree] = useState<FileTree>();
  const [rightTree, setRightTree] = useState<FileTree>();

  // const [lastPathLeft, setLastPathLeft] = useState<string>();
  // const [lastPathRight, setLastPathRight] = useState<string>();

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
    // TODO: if syncing
    console.info(`Changing current directory from '${currentDirectory}' to '${relativePath}'`)
    setCurrentDirectory(relativePath);
  }

  useEffect(() => {
    document.getElementsByTagName("html")[0].setAttribute("data-theme", isDarkTheme ? "dark" : "light");
  }, [isDarkTheme]);

  useEffect(() => {
    function applyTheme(theme: Theme | null) {
      if (theme !== null) {
        if (theme === "dark")
          setIsDarkTheme(true);
        else
          setIsDarkTheme(false);
      }
    }

    (async function () {
      const appWindow = getCurrentWindow();

      // Get initial theme ('light' | 'dark' | null)
      const theme = await appWindow.theme();
      applyTheme(theme);

      // Listen for system theme changes
      const unlisten = await appWindow.onThemeChanged(({ payload: theme }) => {
        // console.log(`Theme changed to: ${theme}`);
        applyTheme(theme);
      });

      return unlisten;
    })();
  }, []);

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
        {/* <div className="level-item">
          <div className="buttons are-small">
            <button className="button is-primary" onClick={() => alert(`${leftTree?.rootPath} / ${rightTree?.rootPath}`)}>Compare</button>
          </div>
        </div> */}
      </div>
    </div>
    <div className="main">
      <FilePanel name="Left" path={undefined} onLoaded={setLeftTree} diff={diff} options={filterOptions} currentDirectory={currentDirectory} onChangeCurrentDirectory={changeDir} />
      <FilePanel name="Right" path={undefined} onLoaded={setRightTree} diff={diff} options={filterOptions} currentDirectory={currentDirectory} onChangeCurrentDirectory={changeDir} />
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


