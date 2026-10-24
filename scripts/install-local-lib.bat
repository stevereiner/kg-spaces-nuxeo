@echo off
rem Rebuild @flexible-graphrag/angular-ui from a local Flexible GraphRAG checkout and use it here (Windows; see
rem install-local-lib.sh). FG_UI as there: by default a ..\flexible-graphrag (or ..\..\newdev3\flexible-graphrag)
rem checkout next to this repository. The tarball goes to docker\lib\ (image builds) and, with --no-save, into
rem app\node_modules (npm start), so app\package.json stays on the published version. Clears app\.angular\cache
rem (the library version doesn't change between dev packs, so the CLI would keep serving the old compiled copy).
setlocal
set "HERE=%~dp0.."
if "%FG_UI%"=="" if exist "%HERE%\..\flexible-graphrag\flexible-graphrag-ui\frontend-angular" set "FG_UI=%HERE%\..\flexible-graphrag\flexible-graphrag-ui\frontend-angular"
if "%FG_UI%"=="" if exist "%HERE%\..\..\newdev3\flexible-graphrag\flexible-graphrag-ui\frontend-angular" set "FG_UI=%HERE%\..\..\newdev3\flexible-graphrag\flexible-graphrag-ui\frontend-angular"
if "%FG_UI%"=="" (echo Flexible GraphRAG checkout not found: set FG_UI & exit /b 2)

echo ==^> building + packing the library in %FG_UI%
pushd "%FG_UI%" || exit /b 1
call npm run pack:lib || (popd & exit /b 1)
popd

set "TARBALL="
for /f "delims=" %%F in ('dir /b /o-d "%FG_UI%\dist\flexible-graphrag-angular-ui-*.tgz"') do if not defined TARBALL set "TARBALL=%FG_UI%\dist\%%F"
if "%TARBALL%"=="" (echo no library tarball in %FG_UI%\dist & exit /b 1)

echo ==^> %TARBALL% into docker\lib\ (image builds)
del /q "%HERE%\docker\lib\flexible-graphrag-angular-ui-*.tgz" 2>nul
copy /y "%TARBALL%" "%HERE%\docker\lib\" >nul || exit /b 1

echo ==^> installing it into app\ (npm start), without changing package.json
pushd "%HERE%\app" || exit /b 1
call npm install "%TARBALL%" --no-save --no-audit --no-fund || (popd & exit /b 1)
popd

echo ==^> clearing the Angular CLI cache
if exist "%HERE%\app\.angular\cache" rmdir /s /q "%HERE%\app\.angular\cache"
echo done - restart npm start in app\, or rebuild the image (the deployment's scripts\build-kg-spaces-nuxeo.bat)
exit /b 0
