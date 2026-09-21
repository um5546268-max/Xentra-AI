"""Detect which developer toolchains are installed on this machine."""

import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Optional


# winget flags — critical! Without these winget prompts for input and hangs.
WINGET_FLAGS = [
    "--silent",
    "--accept-package-agreements",
    "--accept-source-agreements",
    "--disable-interactivity",
]


TOOLCHAIN: dict[str, dict] = {
    "python": {
        "label": "Python",
        "description": "Run .py scripts",
        "exts": [".py"],
        "check": "python",
        "version_flag": "--version",
        "install": {
            "windows": ["winget", "install", "-e", "--id", "Python.Python.3.12", *WINGET_FLAGS],
            "darwin":  ["brew", "install", "python@3.12"],
            "linux":   ["sudo", "apt-get", "install", "-y", "python3"],
        },
    },
    "node": {
        "label": "Node.js",
        "description": "Run .js and .mjs scripts",
        "exts": [".js", ".mjs"],
        "check": "node",
        "version_flag": "--version",
        "install": {
            "windows": ["winget", "install", "-e", "--id", "OpenJS.NodeJS.LTS", *WINGET_FLAGS],
            "darwin":  ["brew", "install", "node"],
            "linux":   ["sudo", "apt-get", "install", "-y", "nodejs", "npm"],
        },
    },
    "typescript": {
        "label": "TypeScript (ts-node)",
        "description": "Run .ts scripts",
        "exts": [".ts"],
        "check": "npx",
        "version_flag": "ts-node --version",
        "install": {
            "windows": ["npm.cmd", "install", "-g", "ts-node", "typescript"],
            "darwin":  ["npm", "install", "-g", "ts-node", "typescript"],
            "linux":   ["sudo", "npm", "install", "-g", "ts-node", "typescript"],
        },
    },
    "java": {
        "label": "Java (JDK)",
        "description": "Compile & run .java files",
        "exts": [".java"],
        "check": "javac",
        "version_flag": "-version",
        "install": {
            "windows": ["winget", "install", "-e", "--id", "EclipseAdoptium.Temurin.21.JDK", *WINGET_FLAGS],
            "darwin":  ["brew", "install", "openjdk@21"],
            "linux":   ["sudo", "apt-get", "install", "-y", "openjdk-21-jdk"],
        },
    },
    "gcc": {
    "label": "C / C++ (GCC)",
    "description": "Compile & run .c, .cpp files",
    "exts": [".c", ".cpp", ".cc", ".cxx"],
    "check": "gcc",
    "version_flag": "--version",
    "install": {
        "windows": None,                              # 👈 use custom script
        "darwin":  ["xcode-select", "--install"],
        "linux":   ["sudo", "apt-get", "install", "-y", "build-essential"],
    },
    "custom_script_windows": "install_gcc.ps1",        # 👈 reference
},
    "go": {
        "label": "Go",
        "description": "Run .go files",
        "exts": [".go"],
        "check": "go",
        "version_flag": "version",
        "install": {
            "windows": ["winget", "install", "-e", "--id", "GoLang.Go", *WINGET_FLAGS],
            "darwin":  ["brew", "install", "go"],
            "linux":   ["sudo", "apt-get", "install", "-y", "golang-go"],
        },
    },
    "rust": {
        "label": "Rust",
        "description": "Compile & run .rs files",
        "exts": [".rs"],
        "check": "rustc",
        "version_flag": "--version",
        "install": {
            "windows": ["winget", "install", "-e", "--id", "Rustlang.Rustup", *WINGET_FLAGS],
            "darwin":  ["brew", "install", "rust"],
            "linux":   ["sudo", "apt-get", "install", "-y", "rustc", "cargo"],
        },
    },
    "php": {
        "label": "PHP",
        "description": "Run .php files",
        "exts": [".php"],
        "check": "php",
        "version_flag": "--version",
        "install": {
            "windows": ["winget", "install", "-e", "--id", "PHP.PHP.8.3", *WINGET_FLAGS],
            "darwin":  ["brew", "install", "php"],
            "linux":   ["sudo", "apt-get", "install", "-y", "php"],
        },
    },
    "ruby": {
        "label": "Ruby",
        "description": "Run .rb files",
        "exts": [".rb"],
        "check": "ruby",
        "version_flag": "--version",
        "install": {
            "windows": ["winget", "install", "-e", "--id", "RubyInstallerTeam.Ruby", *WINGET_FLAGS],
            "darwin":  ["brew", "install", "ruby"],
            "linux":   ["sudo", "apt-get", "install", "-y", "ruby"],
        },
    },
}


# ═══════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════
def _platform() -> str:
    if sys.platform.startswith("win"):
        return "windows"
    if sys.platform == "darwin":
        return "darwin"
    return "linux"


def _windows_fallback_paths(key: str, check: str) -> list[Path]:
    """
    Return candidate paths to look for a tool when it's not on PATH.
    Common case: MSYS2 installs gcc to C:\\msys64\\mingw64\\bin\\gcc.exe
    but doesn't add it to the Windows PATH.
    """
    if not sys.platform.startswith("win"):
        return []

    candidates: list[Path] = []

    if key == "gcc":
        candidates += [
            Path(r"C:\msys64\mingw64\bin") / f"{check}.exe",
            Path(r"C:\msys64\ucrt64\bin") / f"{check}.exe",
            Path(r"C:\msys64\clang64\bin") / f"{check}.exe",
            Path(r"C:\MinGW\bin") / f"{check}.exe",
            Path(os.environ.get("USERPROFILE", "")) / ".xentra" / "toolchains" / "gcc" / "bin" / f"{check}.exe",
        ]

    if key == "go":
        candidates.append(Path(r"C:\Program Files\Go\bin") / f"{check}.exe")

    if key == "rust":
        candidates.append(
            Path(os.environ.get("USERPROFILE", "")) / ".cargo" / "bin" / f"{check}.exe"
        )

    if key == "java":
        jdk_root = Path(r"C:\Program Files\Eclipse Adoptium")
        if jdk_root.exists():
            for jdk_dir in jdk_root.glob("jdk-*"):
                candidates.append(jdk_dir / "bin" / f"{check}.exe")

    return [p for p in candidates if p.parent.exists()]


# ═══════════════════════════════════════════════════════════════
# DETECTION
# ═══════════════════════════════════════════════════════════════
def detect_tool(key: str) -> dict:
    """Return install status + version for a tool."""
    spec = TOOLCHAIN.get(key)
    if not spec:
        return {"installed": False, "error": "Unknown tool"}

    check = spec["check"]
    exe = shutil.which(check)

    # Fallback: look in well-known Windows install locations
    if not exe:
        for candidate in _windows_fallback_paths(key, check):
            if candidate.exists():
                exe = str(candidate)
                break

    if not exe:
        return {"installed": False, "path": None, "version": None}

    version = None
    try:
        cmd = [exe] + spec["version_flag"].split()
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
        out = (result.stdout or result.stderr or "").strip().splitlines()
        if out:
            version = out[0][:120]
    except Exception:
        pass

    return {"installed": True, "path": exe, "version": version}


def detect_all() -> list[dict]:
    """Return status of every known tool."""
    result = []
    for key, spec in TOOLCHAIN.items():
        status = detect_tool(key)
        result.append({
            "key": key,
            "label": spec["label"],
            "description": spec["description"],
            "exts": spec["exts"],
            "install_command": " ".join(spec["install"].get(_platform()) or []),
            **status,
        })
    return result


def get_install_command(key: str) -> Optional[list[str]]:
    spec = TOOLCHAIN.get(key)
    if not spec:
        return None
    return spec["install"].get(_platform())