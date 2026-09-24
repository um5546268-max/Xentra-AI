"use client";

type Props = {
  src?: string | null;
  name?: string | null;
  email?: string | null;
  size?: number;
  className?: string;
};

// Import the preset definitions from AvatarPicker
// (keeping them in one place so both files stay in sync)
const PRESET_AVATARS = [
  { id: "fox", emoji: "🦊", bg: "from-orange-500 to-red-500" },
  { id: "panda", emoji: "🐼", bg: "from-slate-500 to-slate-700" },
  { id: "lion", emoji: "🦁", bg: "from-amber-500 to-orange-600" },
  { id: "tiger", emoji: "🐯", bg: "from-yellow-500 to-orange-500" },
  { id: "koala", emoji: "🐨", bg: "from-slate-400 to-slate-600" },
  { id: "frog", emoji: "🐸", bg: "from-emerald-500 to-cyan-500" },
  { id: "owl", emoji: "🦉", bg: "from-violet-500 to-indigo-500" },
  { id: "octopus", emoji: "🐙", bg: "from-pink-500 to-violet-500" },
  { id: "unicorn", emoji: "🦄", bg: "from-fuchsia-500 to-pink-500" },
  { id: "dragon", emoji: "🐲", bg: "from-green-500 to-emerald-500" },
  { id: "wolf", emoji: "🐺", bg: "from-cyan-500 to-blue-500" },
  { id: "eagle", emoji: "🦅", bg: "from-red-500 to-orange-500" },
];

const COLORS = [
  "from-violet-500 to-cyan-500",
  "from-emerald-500 to-cyan-500",
  "from-pink-500 to-violet-500",
  "from-orange-500 to-red-500",
  "from-cyan-500 to-blue-500",
  "from-slate-500 to-slate-700",
];

function colorFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function Avatar({
  src,
  name,
  email,
  size = 40,
  className = "",
}: Props) {
  const displayName = name || email || "?";
  const initial = displayName[0]?.toUpperCase() || "?";
  const px = `${size}px`;

  // Preset avatar
  if (src?.startsWith("preset:")) {
    const preset = PRESET_AVATARS.find((p) => p.id === src.slice(7));
    if (preset) {
      return (
        <div
          className={`rounded-full bg-gradient-to-br ${preset.bg} flex items-center justify-center shrink-0 ${className}`}
          style={{ width: px, height: px, fontSize: size * 0.5 }}
        >
          {preset.emoji}
        </div>
      );
    }
  }

  // Regular URL avatar
  if (src && !src.startsWith("preset:")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={displayName}
        className={`rounded-full object-cover shrink-0 ${className}`}
        style={{ width: px, height: px }}
      />
    );
  }

  // Fallback: initial
  const color = colorFor(email || name || "user");
  return (
    <div
      className={`rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-semibold shrink-0 ${className}`}
      style={{ width: px, height: px, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}