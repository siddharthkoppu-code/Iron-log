@echo off
echo Starting Iron Log local server...
echo.
echo Opening http://localhost:8000 in your browser...
start http://localhost:8000

where python >nul 2>&1
if %ERRORLEVEL% equ 0 (
    python -m http.server 8000
    goto end
)

where py >nul 2>&1
if %ERRORLEVEL% equ 0 (
    py -m http.server 8000
    goto end
)

where npx >nul 2>&1
if %ERRORLEVEL% equ 0 (
    npx serve -l 8000 .
    goto end
)

echo No Python or Node found. Opening directly in default browser...
start index.html

:end
pause
