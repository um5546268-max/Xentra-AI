"use client";

import { useEffect, useState } from "react";

export function XHologram({ size = 400 }: { size?: number }) {
  const [phase, setPhase] = useState(0);

  // Timeline: 0=idle, 1=strokes in, 2=impact, 3=orbit, 4=settled
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 100);
    const t2 = setTimeout(() => setPhase(2), 800);
    const t3 = setTimeout(() => setPhase(3), 1000);
    const t4 = setTimeout(() => setPhase(4), 1600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Background bloom that activates on impact */}
      <div
        className="absolute rounded-full transition-all duration-700"
        style={{
          width: size * (phase >= 2 ? 1.4 : 0.4),
          height: size * (phase >= 2 ? 1.4 : 0.4),
          background:
            "radial-gradient(circle, rgba(139,92,246,0.5) 0%, rgba(34,211,238,0.15) 40%, rgba(0,0,0,0) 70%)",
          opacity: phase >= 2 ? 1 : 0,
          filter: "blur(20px)",
        }}
      />

      {/* Impact flash */}
      {phase === 2 && (
        <div
          className="absolute rounded-full bg-white"
          style={{
            width: size * 0.6,
            height: size * 0.6,
            filter: "blur(30px)",
            animation: "impactFlash 0.4s ease-out both",
          }}
        />
      )}

      {/* Main SVG — the X assembled from 3 parts */}
      <svg
        viewBox="0 0 100 100"
        className="relative z-10"
        style={{ width: size * 0.85, height: size * 0.85 }}
      >
        <defs>
          {/* Main gradient — cyan → violet */}
          <linearGradient id="xMainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="45%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>

          {/* Highlight gradient for glass sheen */}
          <linearGradient id="xSheen" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="xGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Soft drop shadow */}
          <filter id="xShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
            <feOffset dx="0" dy="2" result="offset" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.4" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g filter="url(#xGlowFilter)">
          {/* ── LEFT STROKE ── flies in from top-left */}
          <g
            style={{
              transformOrigin: "50px 50px",
              animation:
                phase >= 1
                  ? "leftStrokeIn 0.9s cubic-bezier(0.16, 1, 0.3, 1) both"
                  : "none",
            }}
          >
            {/* Dark outline for depth */}
            <path
              d="M 14 14 L 52 50 L 16 86"
              stroke="#0f0a2e"
              strokeWidth="16"
              strokeLinecap="round"
              fill="none"
              transform="translate(0, 3)"
            />
            {/* Main stroke */}
            <path
              d="M 14 14 L 52 50 L 16 86"
              stroke="url(#xMainGrad)"
              strokeWidth="13"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            {/* Highlight sheen */}
            <path
              d="M 14 14 L 52 50 L 16 86"
              stroke="url(#xSheen)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity="0.7"
            />
          </g>

          {/* ── RIGHT STROKE ── flies in from bottom-right */}
          <g
            style={{
              transformOrigin: "50px 50px",
              animation:
                phase >= 1
                  ? "rightStrokeIn 0.9s cubic-bezier(0.16, 1, 0.3, 1) both"
                  : "none",
            }}
          >
            <path
              d="M 86 14 L 48 50 L 84 86"
              stroke="#0f0a2e"
              strokeWidth="16"
              strokeLinecap="round"
              fill="none"
              transform="translate(0, 3)"
            />
            <path
              d="M 86 14 L 48 50 L 84 86"
              stroke="url(#xMainGrad)"
              strokeWidth="13"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path
              d="M 86 14 L 48 50 L 84 86"
              stroke="url(#xSheen)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity="0.7"
            />
          </g>
        </g>

        {/* ── ORBIT RING ── traces in at phase 3 */}
        <ellipse
          cx="50"
          cy="50"
          rx="46"
          ry="16"
          stroke="url(#xMainGrad)"
          strokeWidth="1"
          fill="none"
          transform="rotate(-20 50 50)"
          style={{
            strokeDasharray: 200,
            strokeDashoffset: phase >= 3 ? 0 : 200,
            transition: "stroke-dashoffset 0.9s ease-out",
            filter: "drop-shadow(0 0 8px rgba(34,211,238,0.8))",
            opacity: phase >= 3 ? 1 : 0,
          }}
        />
      </svg>

      {/* ── PARTICLE BURST ── at phase 4 */}
      {phase >= 4 && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            const dx = Math.cos(angle) * size * 0.6;
            const dy = Math.sin(angle) * size * 0.6;
            return (
              <div
                key={i}
                className="absolute rounded-full bg-cyan-300"
                style={{
                  width: 4,
                  height: 4,
                  top: "50%",
                  left: "50%",
                  boxShadow: "0 0 8px rgba(34,211,238,1)",
                  animation: `particleOut 0.8s ease-out ${i * 0.03}s both`,
                  ["--dx" as any]: `${dx}px`,
                  ["--dy" as any]: `${dy}px`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* ── KEYFRAMES ── */}
      <style jsx>{`
        @keyframes leftStrokeIn {
          0% {
            opacity: 0;
            transform: translate(-120px, -120px) rotate(-25deg) scale(0.6);
            filter: blur(12px);
          }
          60% {
            opacity: 1;
            filter: blur(2px);
          }
          80% {
            transform: translate(0, 0) rotate(0deg) scale(1.08);
            filter: blur(0);
          }
          100% {
            transform: translate(0, 0) rotate(0deg) scale(1);
            opacity: 1;
          }
        }

        @keyframes rightStrokeIn {
          0% {
            opacity: 0;
            transform: translate(120px, 120px) rotate(25deg) scale(0.6);
            filter: blur(12px);
          }
          60% {
            opacity: 1;
            filter: blur(2px);
          }
          80% {
            transform: translate(0, 0) rotate(0deg) scale(1.08);
            filter: blur(0);
          }
          100% {
            transform: translate(0, 0) rotate(0deg) scale(1);
            opacity: 1;
          }
        }

        @keyframes impactFlash {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          30% {
            opacity: 1;
            transform: scale(1.4);
          }
          100% {
            opacity: 0;
            transform: scale(2);
          }
        }

        @keyframes particleOut {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) translate(0, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) translate(var(--dx), var(--dy)) scale(0.3);
          }
        }
      `}</style>
    </div>
  );
}