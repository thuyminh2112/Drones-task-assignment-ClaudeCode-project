# -*- mode: python ; coding: utf-8 -*-
# Build with: pyinstaller desktop/build.spec --noconfirm   (run from anywhere —
# paths below are resolved off SPECPATH, PyInstaller's global for this file's
# own directory, not the current working directory)
import os

from PyInstaller.utils.hooks import collect_all

REPO_ROOT = os.path.dirname(SPECPATH)  # SPECPATH == .../desktop

datas = [(os.path.join(REPO_ROOT, "frontend", "dist"), "frontend_dist")]
binaries = []
hiddenimports = [
    "uvicorn.logging",
    "uvicorn.loops",
    "uvicorn.loops.auto",
    "uvicorn.protocols",
    "uvicorn.protocols.http",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.websockets",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.lifespan",
    "uvicorn.lifespan.on",
]

# torch ships a lot of dynamic imports and binary payloads that PyInstaller's
# static analysis misses on its own.
for pkg in ("torch",):
    d, b, h = collect_all(pkg)
    datas += d
    binaries += b
    hiddenimports += h

a = Analysis(
    [os.path.join(SPECPATH, "launcher.py")],
    pathex=[REPO_ROOT],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="UAVMissionPlanner",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=True,  # keep a console window so startup errors are visible
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    name="UAVMissionPlanner",
)
