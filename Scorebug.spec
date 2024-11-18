# -*- mode: python ; coding: utf-8 -*-
import os

block_cipher = None

# Helper function to collect all files from a directory
def collect_static_files(static_dir):
    static_files = []
    for root, dirs, files in os.walk(static_dir):
        for file in files:
            full_path = os.path.join(root, file)
            relative_path = os.path.relpath(full_path, '.')
            destination_path = os.path.dirname(relative_path)
            static_files.append((full_path, destination_path))
    return static_files

# Collect all static files
static_files = collect_static_files('static')

a = Analysis(
    ['app.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('overlay.html', '.'),
        ('control.html', '.'),
    ] + static_files,  # Add all static files
    hiddenimports=['websockets.legacy', 'websockets.legacy.server', 'websockets.legacy.protocol'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='Scorebug',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # Changed from True to False to hide console window
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
