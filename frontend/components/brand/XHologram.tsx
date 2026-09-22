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
          width: size * 1.2,
          height: size * 1.2,
          background:
            "radial-gradient(circle, rgba(139,92,246,0.4) 0%, rgba(139,92,246,0) 70%)",
          animationDuration: "3s",
        }}
      />

      {/* Cyan glow */}
      <div
        className="absolute rounded-full animate-pulse"
        style={{
          width: size * 1.05,
          height: size * 1.05,
          background:
            "radial-gradient(circle, rgba(34,211,238,0.35) 0%, rgba(34,211,238,0) 70%)",
          animationDuration: "2.5s",
        }}
      />

      <img
  src="/x-logo.png"
  alt="Xentra"
  className="relative z-10 drop-shadow-[0_0_40px_rgba(139,92,246,0.8)]"
  style={{ width: size * 1.45, height: size * 2.25, objectFit: "contain" }}
/>
    </div>
  );
}