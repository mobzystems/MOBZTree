@echo off
rem Call the VC batch file to set the correct environment. This modifies the PATH. These modifications are
rem lost after this batch file ends so we return the new PATH. Call this with
rem
rem $env:PATH=(./getvcpath arm64)
rem
call "C:\Program Files\Microsoft Visual Studio\18\Professional\VC\Auxiliary\Build\vcvarsall.bat" %1 > NUL
echo %PATH%
