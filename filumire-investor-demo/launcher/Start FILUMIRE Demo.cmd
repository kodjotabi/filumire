@echo off
title FILUMIRE Demo (close the demo window to stop)
cd /d "%~dp0"
echo Starting the offline FILUMIRE demo. No internet connection is needed.
"%~dp0node\node.exe" "%~dp0launcher\launch.mjs" %*
if errorlevel 1 (
  echo.
  echo The demo could not start. Details are in data\launcher.log and data\server.log.
  pause
)
