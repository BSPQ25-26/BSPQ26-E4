@ECHO OFF
REM Windows counterpart of the Makefile.
REM Lets you build the docs with `make.bat html` from cmd or PowerShell.

pushd %~dp0

REM Default command if none is provided.
if "%SPHINXBUILD%" == "" (
	set SPHINXBUILD=sphinx-build
)
set SOURCEDIR=source
set BUILDDIR=_build

REM No arguments -> show Sphinx help.
if "%1" == "" goto help

REM Make sure sphinx-build is on PATH.
%SPHINXBUILD% >NUL 2>NUL
if errorlevel 9009 (
	echo.
	echo The 'sphinx-build' command was not found. Install the backend
	echo dependencies first: pip install -r ..\requirements.txt
	echo.
	exit /b 1
)

%SPHINXBUILD% -M %1 %SOURCEDIR% %BUILDDIR% %SPHINXOPTS% %O%
goto end

:help
%SPHINXBUILD% -M help %SOURCEDIR% %BUILDDIR% %SPHINXOPTS% %O%

:end
popd
