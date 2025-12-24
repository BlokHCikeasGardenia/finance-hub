@echo off
echo ========================================
echo  Keuangan RT Modern - Restart Server
echo ========================================

echo [1/4] Menghentikan semua proses Python...
taskkill /f /im python.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Semua proses Python berhasil dihentikan
) else (
    echo - Tidak ada proses Python yang berjalan
)

echo.
echo [2/4] Menghentikan semua proses Node.js...
taskkill /f /im node.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Semua proses Node.js berhasil dihentikan
) else (
    echo - Tidak ada proses Node.js yang berjalan
)

echo.
echo [3/4] Building project...
call npm run build
if %errorlevel% equ 0 (
    echo ✓ Build berhasil
) else (
    echo ✗ Build gagal
    pause
    exit /b 1
)

echo.
echo [4/4] Menjalankan server development...
echo Server akan berjalan di: http://localhost:3000
echo Tekan Ctrl+C untuk menghentikan server
echo.
call npm run dev
