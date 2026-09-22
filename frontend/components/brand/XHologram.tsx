"use client";

export function XHologram({ size = 180 }: { size?: number }) {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Blooming pulse ring — expands outward after reveal */}
      <div
        className="absolute rounded-full"
        style={{
          width: size,
          height: size,
          background:
            "radial-gradient(circle, rgba(139,92,246,0.4) 0%, rgba(139,92,246,0) 70%)",
          animation: "xBloom 1.4s ease-out 1.2s both",
        }}
      />

      {/* Cyan glow */}
      <div
        className="absolute rounded-full"
        style={{
          width: size * 0.9,
          height: size * 0.9,
          background:
            "radial-gradient(circle, rgba(34,211,238,0.35) 0%, rgba(34,211,238,0) 70%)",
          animation: "xPulse 2.5s ease-in-out 1.4s infinite",
        }}
      />

      {/* Orbit ring */}
      <div
        className="absolute rounded-full border border-cyan-400/40"
        style={{
          width: size * 1.05,
          height: size * 0.42,
          transform: "rotate(-20deg)",
          boxShadow: "0 0 30px rgba(34,211,238,0.4)",
          animation: "xOrbitIn 1s ease-out 1.1s both",
        }}
      />

      {/* The logo — dramatic entrance */}
      <img
        src="/x-logo.png"
        alt="Xentra"
        className="relative z-10"
        style={{
          width: size * 1.3,
          height: size * 1.3,
          objectFit: "contain",
          animation: "xDramaticEntry 1.3s cubic-bezier(0.16, 1, 0.3, 1) both",
          filter: "drop-shadow(0 0 40px rgba(139,92,246,0.8))",
        }}
      />

      {/* Keyframe styles */}
      <style jsx>{`
        @keyframes xDramaticEntry {
          0% {
            opacity: 0;
            transform: scale(0.3) rotate(-8deg);
            filter: blur(20px) drop-shadow(0 0 0px rgba(139, 92, 246, 0));
          }
          40% {
            opacity: 0.5;
            transform: scale(0.7) rotate(-4deg);
            filter: blur(10px) drop-shadow(0 0 20px rgba(139, 92, 246, 0.5));
          }
          70% {
            opacity: 1;
            transform: scale(1.15) rotate(2deg);
            filter: blur(0px) drop-shadow(0 0 60px rgba(139, 92, 246, 1));
          }
          85% {
            transform: scale(0.97) rotate(0deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
            filter: blur(0px) drop-shadow(0 0 40px rgba(139, 92, 246, 0.8));
          }
        }

        @keyframes xBloom {
          0% {
            opacity: 0;
            transform: scale(0.5);
          }
          40% {
            opacity: 1;
            transform: scale(1.1);
          }
          100% {
            opacity: 0;
            transform: scale(2.2);
          }
        }

        @keyframes xPulse {
          0%, 100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
        }

        @keyframes xOrbitIn {
          0% {
            opacity: 0;
            transform: rotate(-90deg) scale(0.5);
          }
          100% {
            opacity: 1;
            transform: rotate(-20deg) scale(1);
          }
        }
      `}</style>
    </div>
  );
}