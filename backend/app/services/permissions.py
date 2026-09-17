"""
Permission registry + helpers.
Central source of truth for all known permissions.
"""

# Format: key → {scope, tier, label, description}
PERMISSIONS = {
    # ===== Browser =====
    "browser.search": {
        "scope": "browser",
        "tier": "low",
        "label": "Search web",
        "description": "Run web searches via Tavily",
    },
    "browser.read": {
        "scope": "browser",
        "tier": "low",
        "label": "Read pages",
        "description": "Open and read webpage content",
    },
    "browser.click": {
        "scope": "browser",
        "tier": "medium",
        "label": "Click elements",
        "description": "Click links and buttons on pages",
    },
    "browser.fill": {
        "scope": "browser",
        "tier": "medium",
        "label": "Fill forms",
        "description": "Type into form fields",
    },
    "browser.download": {
        "scope": "browser",
        "tier": "high",
        "label": "Download files",
        "description": "Save files from the web",
    },
    "browser.upload": {
        "scope": "browser",
        "tier": "high",
        "label": "Upload files",
        "description": "Send files to websites",
    },

    # ===== Files =====
    "files.read": {
        "scope": "files",
        "tier": "low",
        "label": "Read files",
        "description": "View contents of uploaded files",
    },
    "files.write": {
        "scope": "files",
        "tier": "medium",
        "label": "Create/edit files",
        "description": "Create or modify code files in the workspace",
    },
    "files.delete": {
        "scope": "files",
        "tier": "high",
        "label": "Delete files",
        "description": "Permanently remove files",
    },

    # ===== Code =====
    "code.read": {
        "scope": "code",
        "tier": "low",
        "label": "Read code",
        "description": "View files in the code workspace",
    },
    "code.write": {
        "scope": "code",
        "tier": "medium",
        "label": "Write code",
        "description": "Create or modify code files",
    },
    "code.run": {
        "scope": "code",
        "tier": "high",
        "label": "Run code",
        "description": "Execute scripts in the sandbox",
    },

    # ===== Media =====
    "media.read": {
        "scope": "media",
        "tier": "low",
        "label": "Read media info",
        "description": "See now-playing, playlists, etc.",
    },
    "media.play": {
        "scope": "media",
        "tier": "medium",
        "label": "Control playback",
        "description": "Play, pause, skip tracks",
    },

    # ===== Shopping =====
    "shopping.search": {
        "scope": "shopping",
        "tier": "low",
        "label": "Search products",
        "description": "Search stores for products",
    },
    "shopping.compare": {
        "scope": "shopping",
        "tier": "low",
        "label": "Compare products",
        "description": "Compare prices and specs",
    },
    "shopping.purchase": {
        "scope": "shopping",
        "tier": "high",
        "label": "Make purchases",
        "description": "Complete transactions (always requires confirmation)",
    },

    # ===== Maps =====
    "maps.search": {
        "scope": "maps",
        "tier": "low",
        "label": "Search places",
        "description": "Find locations and businesses",
    },
    "maps.directions": {
        "scope": "maps",
        "tier": "low",
        "label": "Get directions",
        "description": "Get travel routes",
    },

    # ===== Email =====
    "email.read": {
        "scope": "email",
        "tier": "medium",
        "label": "Read email",
        "description": "Read your inbox",
    },
    "email.draft": {
        "scope": "email",
        "tier": "medium",
        "label": "Draft emails",
        "description": "Create email drafts",
    },
    "email.send": {
        "scope": "email",
        "tier": "high",
        "label": "Send emails",
        "description": "Send emails on your behalf",
    },

    # ===== Tasks & Automation =====
    "tasks.run": {
        "scope": "tasks",
        "tier": "low",
        "label": "Run tasks",
        "description": "Execute background tasks",
    },
    "automation.create": {
        "scope": "automation",
        "tier": "medium",
        "label": "Create automations",
        "description": "Schedule recurring tasks",
    },
    "automation.run": {
        "scope": "automation",
        "tier": "medium",
        "label": "Run automations",
        "description": "Execute scheduled work",
    },
    "automation.delete": {
        "scope": "automation",
        "tier": "medium",
        "label": "Delete automations",
        "description": "Remove scheduled tasks",
    },

    # ===== Memory =====
    "memory.read": {
        "scope": "memory",
        "tier": "low",
        "label": "Read memory",
        "description": "Access stored preferences and facts",
    },
    "memory.write": {
        "scope": "memory",
        "tier": "medium",
        "label": "Write memory",
        "description": "Save new memories from conversation",
    },
    "memory.delete": {
        "scope": "memory",
        "tier": "medium",
        "label": "Delete memory",
        "description": "Remove stored memories",
    },

    # ===== Integrations =====
    "integrations.connect": {
        "scope": "integrations",
        "tier": "medium",
        "label": "Connect services",
        "description": "Link Google, GitHub, Spotify, etc.",
    },
    "integrations.disconnect": {
        "scope": "integrations",
        "tier": "medium",
        "label": "Disconnect services",
        "description": "Unlink connected services",
    },
}


# Default state for new users
DEFAULT_STATE = {
    "low": True,      # enabled
    "medium": True,   # enabled
    "high": False,    # disabled by default — require explicit opt-in
}


def get_permission(key: str) -> dict | None:
    return PERMISSIONS.get(key)


def list_all_permissions() -> list[dict]:
    """Return all permissions with metadata."""
    return [
        {"key": k, **v}
        for k, v in PERMISSIONS.items()
    ]


def get_default_for(key: str) -> bool:
    """Return the default enabled state for a permission."""
    perm = PERMISSIONS.get(key)
    if not perm:
        return False
    return DEFAULT_STATE.get(perm["tier"], False)


def tier_color(tier: str) -> str:
    """Emoji indicator for a tier."""
    return {"low": "🟢", "medium": "🟡", "high": "🔴"}.get(tier, "⚪")