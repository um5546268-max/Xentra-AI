"""
Registry of all supported integrations.
Adding a new provider = add one entry here + implement OAuth in routes/integrations.py.
"""

INTEGRATIONS = {
    "google": {
        "name": "Google",
        "description": "Gmail, Calendar, Drive, YouTube",
        "icon": "google",
        "auth_type": "oauth2",
        "scopes": [
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/calendar.readonly",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
        ],
        "enabled": True,
    },
    "github": {
        "name": "GitHub",
        "description": "Repositories, issues, pull requests",
        "icon": "github",
        "auth_type": "oauth2",
        "scopes": ["repo", "read:user", "user:email"],
        "enabled": True,
    },
    "spotify": {
        "name": "Spotify",
        "description": "Music playback and playlists",
        "icon": "spotify",
        "auth_type": "oauth2",
        "scopes": [
            "user-read-playback-state",
            "user-modify-playback-state",
            "user-read-currently-playing",
            "playlist-read-private",
        ],
        "enabled": True,
    },
    "notion": {
        "name": "Notion",
        "description": "Notes, docs, and databases",
        "icon": "notion",
        "auth_type": "oauth2",
        "scopes": [],
        "enabled": False,
    },
}


def list_integrations() -> list[dict]:
    return [
        {
            "provider": provider,
            "name": info["name"],
            "description": info["description"],
            "icon": info["icon"],
            "enabled": info["enabled"],
            "auth_type": info["auth_type"],
        }
        for provider, info in INTEGRATIONS.items()
    ]


def get_integration(provider: str) -> dict | None:
    return INTEGRATIONS.get(provider)