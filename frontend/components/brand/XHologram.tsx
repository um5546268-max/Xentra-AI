"use client";

export function XHologram({ size = 180 }: { size?: number }) {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Outer pulse ring */}
      <div
        className="absolute rounded-full animate-ping"
        style={{
          width: size,
          height: size,
          background:
            "radial-gradient(circle, rgba(139,92,246,0.35) 0%, rgba(139,92,246,0) 70%)",
          animationDuration: "3s",
        }}
      />

      {/* Second glow */}
      <div
        className="absolute rounded-full animate-pulse"
        style={{
          width: size * 0.9,
          height: size * 0.9,
          background:
            "radial-gradient(circle, rgba(34,211,238,0.3) 0%, rgba(34,211,238,0) 70%)",
          animationDuration: "2.5s",
        }}
      />

      {/* Orbit ring — thin ellipse around the X */}
      <div
        className="absolute rounded-full border border-cyan-400/30"
        style={{
          width: size * 1.05,
          height: size * 0.42,
          transform: "rotate(-20deg)",
          boxShadow: "0 0 30px rgba(34,211,238,0.3)",
        }}
      />

      {/* The X — gradient with glow filter */}
      <svg
        viewBox="0 0 100 100"
        className="relative z-10"
        style={{ width: size * 0.6, height: size * 0.6 }}
      >
        <defs>
          <linearGradient id="xGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="50%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
          <filter id="xGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#xGlow)">
          <path
            d="M 15 15 L 85 85"
            stroke="url(#xGrad)"
            strokeWidth="14"
            strokeLinecap="round"
            fill="none"
            className="animate-pulse"
            style={{ animationDuration: "2s" }}
          />
          <path
            d="M 85 15 L 15 85"
            stroke="url(#xGrad)"
            strokeWidth="14"
            strokeLinecap="round"
            fill="none"
            className="animate-pulse"
            style={{ animationDuration: "2s", animationDelay: "0.5s" }}
          />
        </g>
      </svg>
    </div>
  );
}