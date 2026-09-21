"use client";

export function FileIcon({ name, size = 14 }: { name: string; size?: number }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const lower = name.toLowerCase();
  const s = { width: size, height: size };

  // ═══════════════════════════════════════════════════════════
  // SPECIAL FILENAMES (matched before extension)
  // ═══════════════════════════════════════════════════════════
  if (lower === ".gitignore" || lower === ".gitattributes")
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <circle cx="12" cy="12" r="9" fill="#F05032" />
        <path d="M8 12l3 3 5-6" stroke="#fff" strokeWidth="1.6" fill="none" />
      </svg>
    );

  if (lower === ".env" || lower.startsWith(".env."))
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <circle cx="12" cy="12" r="9" fill="#ECD53F" />
        <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#000">
          ENV
        </text>
      </svg>
    );

  if (lower === "dockerfile")
    return (
      <svg viewBox="0 0 24 24" style={s} fill="#2496ED">
        <path d="M3 11h3v3H3v-3zm4 0h3v3H7v-3zm4 0h3v3h-3v-3zm4 0h3v3h-3v-3zM7 7h3v3H7V7zm4 0h3v3h-3V7zm4 0h3v3h-3V7zM15 3h3v3h-3V3zm5 8h-1.5c0-1-0.8-1.8-1.8-1.8v1.5H18c0.6 0 1 0.4 1 1v3.8c0 2.6-2.6 4.5-6 4.5s-6-1.9-6-4.5V11h13z" />
      </svg>
    );

  if (lower === "makefile")
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <rect x="3" y="3" width="18" height="18" rx="2" fill="#427819" />
        <text x="12" y="16" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#fff">
          MK
        </text>
      </svg>
    );

  if (lower === "license" || lower === "licence")
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <circle cx="12" cy="10" r="6" fill="#F59E0B" />
        <rect x="10" y="14" width="4" height="8" fill="#F59E0B" />
      </svg>
    );

  // ═══════════════════════════════════════════════════════════
  // JAVASCRIPT / TYPESCRIPT
  // ═══════════════════════════════════════════════════════════
  if (["js", "mjs", "cjs"].includes(ext))
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <rect width="24" height="24" rx="2" fill="#F7DF1E" />
        <text x="12" y="17" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#000">
          JS
        </text>
      </svg>
    );

  if (["ts", "mts", "cts"].includes(ext))
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <rect width="24" height="24" rx="2" fill="#3178C6" />
        <text x="12" y="17" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#fff">
          TS
        </text>
      </svg>
    );

  if (["jsx", "tsx"].includes(ext))
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <circle cx="12" cy="12" r="2" fill="#61DAFB" />
        <ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke="#61DAFB" strokeWidth="1.4" />
        <ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke="#61DAFB" strokeWidth="1.4" transform="rotate(60 12 12)" />
        <ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke="#61DAFB" strokeWidth="1.4" transform="rotate(120 12 12)" />
      </svg>
    );

  // ═══════════════════════════════════════════════════════════
  // WEB (HTML / CSS / SCSS / LESS)
  // ═══════════════════════════════════════════════════════════
  if (["html", "htm", "xhtml"].includes(ext))
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <path fill="#E34F26" d="M4 3l1.6 18L12 22.5 18.4 21 20 3H4z" />
        <path fill="#fff" d="M12 4.5v16.8l5-1.4L18.4 4.5H12z" opacity="0.9" />
        <path fill="#fff" d="M8 7h8l-.2 2H8.4l.3 2H15l-.4 4.5-2.6.7-2.6-.7-.2-2h2l.1 1 0.7.2.7-.2.2-2H8z" />
      </svg>
    );

  if (ext === "css")
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <path fill="#1572B6" d="M4 3l1.6 18L12 22.5 18.4 21 20 3H4z" />
        <path fill="#fff" d="M12 4.5v16.8l5-1.4L18.4 4.5H12z" opacity="0.9" />
        <path fill="#fff" d="M8.3 7l.1 2h7.3l-.4 3.5-3.3 1-3.3-1-.2-2.5h2l.1 1 1.4.4 1.4-.4.2-2H8.2z" />
      </svg>
    );

  if (["scss", "sass"].includes(ext))
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <circle cx="12" cy="12" r="10" fill="#CF649A" />
        <text x="12" y="16" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#fff">
          S
        </text>
      </svg>
    );

  if (ext === "less")
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <circle cx="12" cy="12" r="10" fill="#1D365D" />
        <text x="12" y="15" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#fff">
          LESS
        </text>
      </svg>
    );

  // ═══════════════════════════════════════════════════════════
  // DATA (JSON / YAML / TOML / XML / CSV)
  // ═══════════════════════════════════════════════════════════
  if (ext === "json")
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <text x="12" y="17" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#CBCB41">
          {"{ }"}
        </text>
      </svg>
    );

  if (["yml", "yaml"].includes(ext))
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <rect x="3" y="5" width="18" height="14" rx="2" fill="#CB171E" />
        <text x="12" y="16" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#fff">
          YML
        </text>
      </svg>
    );

  if (ext === "toml")
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <rect x="3" y="5" width="18" height="14" rx="2" fill="#9C4121" />
        <text x="12" y="15.5" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#fff">
          TOML
        </text>
      </svg>
    );

  if (ext === "xml")
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <rect x="3" y="3" width="18" height="18" rx="2" fill="#0060AC" />
        <text x="12" y="16" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#fff">
          XML
        </text>
      </svg>
    );

  if (ext === "csv")
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <rect x="3" y="4" width="18" height="16" rx="1.5" fill="#217346" />
        <text x="12" y="16" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#fff">
          CSV
        </text>
      </svg>
    );

  // ═══════════════════════════════════════════════════════════
  // PROGRAMMING LANGUAGES
  // ═══════════════════════════════════════════════════════════
  if (ext === "py")
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <path fill="#3776AB" d="M11.9 0C8.8 0 6.9.4 6.9 2v2h5.3v.9H4.8C2.1 4.9.5 6.8.5 10.2v3.1c0 3.1 1.4 5.2 4.2 5.2h2.1v-2.5c0-2.1 1.8-3.8 3.9-3.8h4.1c1.8 0 3.1-1.4 3.1-3.2V2.5C17.9 1 17.3 0 11.9 0zm-3.4 1.6c.7 0 1.3.6 1.3 1.3 0 .7-.6 1.3-1.3 1.3-.7 0-1.3-.6-1.3-1.3 0-.7.6-1.3 1.3-1.3z" />
        <path fill="#FFD43B" d="M12.1 24c3.1 0 5-.4 5-2v-2h-5.3v-.9h7.4c2.7 0 4.3-1.9 4.3-5.3V10.7c0-3.1-1.4-5.2-4.2-5.2h-2.1v2.5c0 2.1-1.8 3.8-3.9 3.8H9.2c-1.8 0-3.1 1.4-3.1 3.2v4.5C6.1 23 6.7 24 12.1 24z" />
      </svg>
    );

  if (ext === "java")
    return (
      <svg viewBox="0 0 24 24" style={s} fill="#f89820">
        <path d="M9.5 14.8s-.9.5.6.7c1.8.2 2.7.2 4.7-.2 0 0 .5.3 1.2.6-4.4 1.9-10-.1-6.5-1.1zM8.8 12.5s-1 .7.5.9c2 .2 3.5.2 6.2-.3 0 0 .4.3.9.5-5.5 1.6-11.5.1-7.6-1.1z" />
        <path d="M13.7 8.6c1.2 1.4-.3 2.6-.3 2.6s3-1.5 1.6-3.5c-1.3-1.8-2.3-2.7 3.1-5.8 0 0-8.4 2.1-4.4 6.7z" />
      </svg>
    );

  if (["c", "h"].includes(ext))
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <rect x="3" y="3" width="18" height="18" rx="2" fill="#A8B9CC" />
        <text x="12" y="17" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#283593">
          C
        </text>
      </svg>
    );

  if (["cpp", "cc", "cxx", "hpp", "hxx"].includes(ext))
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <rect x="3" y="3" width="18" height="18" rx="2" fill="#00599C" />
        <text x="12" y="16" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#fff">
          C++
        </text>
      </svg>
    );

  if (ext === "cs")
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <rect x="3" y="3" width="18" height="18" rx="2" fill="#68217A" />
        <text x="12" y="16" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#fff">
          C#
        </text>
      </svg>
    );

  if (ext === "go")
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <rect x="3" y="3" width="18" height="18" rx="2" fill="#00ADD8" />
        <text x="12" y="16" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#fff">
          GO
        </text>
      </svg>
    );

  if (ext === "rs")
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <circle cx="12" cy="12" r="10" fill="#CE422B" />
        <text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#fff">
          R
        </text>
      </svg>
    );

  if (ext === "php")
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <ellipse cx="12" cy="12" rx="11" ry="7" fill="#777BB4" />
        <text x="12" y="15" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#fff">
          php
        </text>
      </svg>
    );

  if (ext === "rb")
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <path fill="#CC342D" d="M20.5 3L12 2 3.5 3 2 12l10 10 10-10L20.5 3z" />
        <path fill="#fff" d="M8 8l4-3 4 3-4 3z" opacity="0.4" />
      </svg>
    );

  if (ext === "swift")
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <circle cx="12" cy="12" r="10" fill="#FA7343" />
        <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#fff">
          S
        </text>
      </svg>
    );

  if (ext === "kt")
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <rect x="3" y="3" width="18" height="18" rx="2" fill="#7F52FF" />
        <text x="12" y="16" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#fff">
          KT
        </text>
      </svg>
    );

  if (ext === "scala")
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <rect x="3" y="3" width="18" height="18" rx="2" fill="#DC322F" />
        <text x="12" y="16" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#fff">
          SC
        </text>
      </svg>
    );

  if (ext === "dart")
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <rect x="3" y="3" width="18" height="18" rx="2" fill="#0175C2" />
        <text x="12" y="16" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#fff">
          DT
        </text>
      </svg>
    );

  if (["sh", "bash", "zsh"].includes(ext))
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <rect x="2" y="4" width="20" height="16" rx="2" fill="#4EAA25" />
        <text x="12" y="16" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#fff">
          $_
        </text>
      </svg>
    );

  if (["ps1", "psm1"].includes(ext))
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <rect x="2" y="4" width="20" height="16" rx="2" fill="#012456" />
        <text x="12" y="16" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#fff">
          PS
        </text>
      </svg>
    );

  if (ext === "bat" || ext === "cmd")
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <rect x="2" y="4" width="20" height="16" rx="2" fill="#C1F12E" />
        <text x="12" y="16" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#000">
          BAT
        </text>
      </svg>
    );

  // ═══════════════════════════════════════════════════════════
  // MARKUP / DOCS
  // ═══════════════════════════════════════════════════════════
  if (["md", "markdown"].includes(ext))
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <rect x="2" y="5" width="20" height="14" rx="1.5" fill="#083FA1" />
        <text x="12" y="16" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#fff">
          M↓
        </text>
      </svg>
    );

  if (ext === "txt")
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <rect x="4" y="3" width="16" height="18" rx="2" fill="#64748b" />
        <line x1="7" y1="8" x2="17" y2="8" stroke="#fff" strokeWidth="1" />
        <line x1="7" y1="11" x2="17" y2="11" stroke="#fff" strokeWidth="1" />
        <line x1="7" y1="14" x2="14" y2="14" stroke="#fff" strokeWidth="1" />
        <line x1="7" y1="17" x2="12" y2="17" stroke="#fff" strokeWidth="1" />
      </svg>
    );

  if (ext === "pdf")
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <rect x="4" y="3" width="16" height="18" rx="2" fill="#DC2626" />
        <text x="12" y="16" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#fff">
          PDF
        </text>
      </svg>
    );

  if (ext === "doc" || ext === "docx")
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <rect x="4" y="3" width="16" height="18" rx="2" fill="#2B579A" />
        <text x="12" y="16" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#fff">
          DOC
        </text>
      </svg>
    );

  if (ext === "xls" || ext === "xlsx")
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <rect x="4" y="3" width="16" height="18" rx="2" fill="#217346" />
        <text x="12" y="16" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#fff">
          XLS
        </text>
      </svg>
    );

  if (ext === "ppt" || ext === "pptx")
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <rect x="4" y="3" width="16" height="18" rx="2" fill="#C43E1C" />
        <text x="12" y="16" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#fff">
          PPT
        </text>
      </svg>
    );

  // ═══════════════════════════════════════════════════════════
  // IMAGES
  // ═══════════════════════════════════════════════════════════
  if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "ico"].includes(ext))
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <rect x="3" y="4" width="18" height="16" rx="2" fill="#A855F7" />
        <circle cx="8.5" cy="10" r="1.5" fill="#fff" />
        <path d="M4 18l5-5 4 4 3-3 4 4v1a1 1 0 01-1 1H5a1 1 0 01-1-1z" fill="#fff" opacity="0.6" />
      </svg>
    );

  if (ext === "svg")
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <rect x="3" y="4" width="18" height="16" rx="2" fill="#FFB13B" />
        <text x="12" y="16" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#000">
          SVG
        </text>
      </svg>
    );

  // ═══════════════════════════════════════════════════════════
  // MEDIA
  // ═══════════════════════════════════════════════════════════
  if (["mp3", "wav", "ogg", "flac", "m4a", "aac"].includes(ext))
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <rect x="3" y="3" width="18" height="18" rx="2" fill="#EC4899" />
        <text x="12" y="17" textAnchor="middle" fontSize="14" fill="#fff">
          ♪
        </text>
      </svg>
    );

  if (["mp4", "mov", "mkv", "webm", "avi"].includes(ext))
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <rect x="3" y="3" width="18" height="18" rx="2" fill="#06B6D4" />
        <text x="12" y="17" textAnchor="middle" fontSize="12" fill="#fff">
          ▶
        </text>
      </svg>
    );

  if (ext === "zip" || ext === "rar" || ext === "7z" || ext === "tar" || ext === "gz")
    return (
      <svg viewBox="0 0 24 24" style={s}>
        <rect x="3" y="3" width="18" height="18" rx="2" fill="#F59E0B" />
        <text x="12" y="16" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#fff">
          ZIP
        </text>
      </svg>
    );

  // ═══════════════════════════════════════════════════════════
  // DEFAULT — generic file with fold
  // ═══════════════════════════════════════════════════════════
  return (
    <svg
      viewBox="0 0 24 24"
      style={s}
      fill="none"
      stroke="#64748b"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// FOLDER ICON
// ═══════════════════════════════════════════════════════════════
export function FolderIcon({
  open = false,
  size = 14,
}: {
  open?: boolean;
  size?: number;
}) {
  const s = { width: size, height: size };
  return open ? (
    <svg viewBox="0 0 24 24" style={s}>
      <path d="M2 6a2 2 0 012-2h4l2 2h8a2 2 0 012 2v1H2V6z" fill="#DCB67A" />
      <path d="M2 9h20l-2 10a2 2 0 01-2 1.6H4A2 2 0 012 19V9z" fill="#E8B96A" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" style={s}>
      <path
        d="M2 6a2 2 0 012-2h4l2 2h10a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
        fill="#DCB67A"
      />
    </svg>
  );
}