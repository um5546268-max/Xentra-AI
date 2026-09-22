"use client";

export function XHologram({ size = 180 }: { size?: number }) {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Outer glow ring */}
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
          width: size * 0.85,
          height: size * 0.85,
          background:
            "radial-gradient(circle, rgba(34,211,238,0.25) 0%, rgba(34,211,238,0) 70%)",
          animationDuration: "2.5s",
        }}
      />

      {/* The X */}
      <svg
        viewBox="0 0 100 100"
        className="relative"
        style={{ width: size * 0.55, height: size * 0.55 }}
      >
        <defs>
          <linearGradient id="xGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="50%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
          <filter id="xGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#xGlow)">
          {/* Left-to-right stroke */}
          <path
            d="M 15 15 L 85 85"
            stroke="url(#xGrad)"
            strokeWidth="12"
            strokeLinecap="round"
            fill="none"
            className="animate-pulse"
            style={{ animationDuration: "2s" }}
          />
          {/* Right-to-left stroke */}
          <path
            d="M 85 15 L 15 85"
            stroke="url(#xGrad)"
            strokeWidth="12"
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