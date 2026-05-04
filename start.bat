@echo off
REM ============================================
REM Threads Research Studio - 起動スクリプト（Windows用）
REM ダブルクリックで起動できます
REM ============================================

REM このスクリプトがあるフォルダに移動
cd /d "%~dp0"

echo.
echo ============================================
echo   Threads Research Studio
echo ============================================
echo.

REM Python が入っているか確認
python --version >nul 2>&1
if errorlevel 1 (
    echo Python が見つかりません。
    echo.
    echo Python のインストールが必要です：
    echo   https://www.python.org/downloads/
    echo.
    echo インストール時に "Add Python to PATH" にチェックを入れてください。
    echo.
    pause
    exit /b 1
)

REM Flask が入っているか確認、なければインストール
python -c "import flask" >nul 2>&1
if errorlevel 1 (
    echo Flask（必要なライブラリ）をインストールします...
    echo.
    pip install -r server\requirements.txt
    if errorlevel 1 (
        echo.
        echo Flask のインストールに失敗しました。
        echo 手動で次のコマンドを実行してください：
        echo   pip install flask
        echo.
        pause
        exit /b 1
    )
    echo インストール完了
    echo.
)

REM サーバーを起動
echo サーバーを起動します...
echo.
python server\app.py

echo.
pause
