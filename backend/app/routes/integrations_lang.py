"""Language toolchain integration — check + install programming languages."""

import json
import os
import subprocess
import sys
import tempfile
import threading
import time
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional


from app.deps import get_current_user
from app.models.user import User
from app.services import toolchain


router = APIRouter(prefix="/integrations/languages", tags=["integrations"])

# In-memory install state per tool key
# { "gcc": { "status": "installing" | "done" | "error", "startedAt": ..., "message": ... } }
_install_state: dict[str, dict] = {}
_lock = threading.Lock()


class InstallRequest(BaseModel):
    key: str


@router.get("")
def list_languages(current_user: User = Depends(get_current_user)):
    return {"languages": toolchain.detect_all()}


@router.get("/{key}")
def get_language(key: str, current_user: User = Depends(get_current_user)):
    return toolchain.detect_tool(key)


# ═══════════════════════════════════════════════════════════════
# INSTALL — Windows: launch elevated PowerShell. Other OS: run directly.
# ═══════════════════════════════════════════════════════════════
@router.post("/install")
def install_language(
    payload: InstallRequest,
    current_user: User = Depends(get_current_user),
):
    cmd = toolchain.get_install_command(payload.key)
    if not cmd:
        raise HTTPException(404, f"Unknown or unsupported tool: {payload.key}")

    # If already installing, don't start again
    with _lock:
        state = _install_state.get(payload.key)
        if state and state.get("status") == "installing":
            return {"status": "already_installing"}

    # Windows: spawn elevated PowerShell window
    if sys.platform.startswith("win"):
        return _launch_elevated_windows(payload.key, cmd)

    # Linux/macOS: run normally (sudo prompts via a TTY if needed)
    return _run_install_inline(payload.key, cmd)


def _launch_elevated_windows(key: str, cmd: Optional[list[str]]) -> dict:
    from app.services.toolchain import TOOLCHAIN

    spec = TOOLCHAIN.get(key, {})
    label = spec.get("label", key)
    script_name = spec.get("custom_script_windows")

    tmp = Path(tempfile.gettempdir()) / f"xentra_install_{key}.ps1"

    if script_name:
        script_path = (
            Path(__file__).resolve().parent.parent
            / "services"
            / "install_scripts"
            / script_name
        )
        if not script_path.exists():
            raise HTTPException(500, f"Install script missing: {script_name}")
        tmp.write_text(script_path.read_text(encoding="utf-8"), encoding="utf-8")
    else:
        joined = " ".join(cmd or [])
        ps_script = f"""
$host.UI.RawUI.WindowTitle = 'Xentra — Installing {label}'
Write-Host '════════════════════════════════════════════════════' -ForegroundColor Magenta
Write-Host '  Installing {label}' -ForegroundColor Cyan
Write-Host '  Command: {joined}' -ForegroundColor DarkGray
Write-Host '════════════════════════════════════════════════════' -ForegroundColor Magenta
Write-Host ''
& {joined}
if ($LASTEXITCODE -eq 0) {{
    Write-Host '✓ {label} installed!' -ForegroundColor Green
}} elseif ($LASTEXITCODE -eq -1978335189) {{
    Write-Host 'ℹ {label} is already installed.' -ForegroundColor Yellow
}} else {{
    Write-Host '✗ Install failed (exit $LASTEXITCODE)' -ForegroundColor Red
}}
Write-Host 'Press Enter to close...'
Read-Host
"""
        tmp.write_text(ps_script, encoding="utf-8")

    try:
        subprocess.Popen(
            [
                "powershell.exe",
                "-NoProfile",
                "-Command",
                f"Start-Process powershell.exe -Verb RunAs "
                f"-ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','{tmp}'",
            ],
            shell=False,
            stdin=subprocess.DEVNULL,
        )

        with _lock:
            _install_state[key] = {
                "status": "installing",
                "startedAt": time.time(),
                "message": "Installer launched.",
            }

        return {
            "status": "launched",
            "message": f"Installer for {label} is running. Approve the UAC prompt.",
        }
    except Exception as e:
        raise HTTPException(500, f"Failed to launch: {e}")


# ═══════════════════════════════════════════════════════════════
# Fallback for Linux/macOS — inline install (with timeout)
# ═══════════════════════════════════════════════════════════════
def _run_install_inline(key: str, cmd: list[str]):
    def event_stream():
        yield _sse("starting", command=" ".join(cmd))

        try:
            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                stdin=subprocess.DEVNULL,
            )

            start = time.time()
            TIMEOUT = 300

            while True:
                line = proc.stdout.readline()
                if not line:
                    if proc.poll() is not None:
                        break
                    if time.time() - start > TIMEOUT:
                        proc.kill()
                        yield _sse("error", message="Install timed out.")
                        return
                    continue

                if time.time() - start > TIMEOUT:
                    proc.kill()
                    yield _sse("error", message="Install timed out.")
                    return

                yield _sse("log", line=line.rstrip())

            proc.wait()

            status = toolchain.detect_tool(key)
            yield _sse(
                "done",
                installed=status.get("installed", False),
                version=status.get("version") or "",
            )

        except FileNotFoundError as e:
            yield _sse("error", message=f"Installer not found: {e}")
        except Exception as e:
            yield _sse("error", message=str(e))

    return StreamingResponse(event_stream(), media_type="text/event-stream")


def _sse(status: str, **kwargs) -> str:
    payload = {"status": status, **kwargs}
    return f"data: {json.dumps(payload)}\n\n"


# ═══════════════════════════════════════════════════════════════
# INSTALL STATUS — poll whether the elevated install finished
# ═══════════════════════════════════════════════════════════════
@router.get("/status/{key}")
def install_status(key: str, current_user: User = Depends(get_current_user)):
    """Return the current install state for a tool + fresh detection."""
    status = toolchain.detect_tool(key)
    with _lock:
        state = _install_state.get(key)

    return {
        "key": key,
        "installed": status.get("installed", False),
        "version": status.get("version"),
        "install_state": state,
    }