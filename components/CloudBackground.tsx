"use client";

export default function CloudBackground() {
  return (
    <div
      className="absolute top-0 inset-x-0 h-[620px] overflow-hidden pointer-events-none select-none z-0"
      aria-hidden="true"
    >
      {/* 1. Richer & Deeper Sky-Blue Gradient (تدريج اللون اللبني الأعمق والأوضح) */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-200/75 via-blue-100/45 via-sky-50/25 to-transparent" />

      {/* 2. Top atmospheric ambient glow for depth and luxury feel */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-[radial-gradient(ellipse_at_center,rgba(125,211,252,0.45),rgba(186,230,253,0.2),transparent_70%)] blur-2xl" />

      {/* 3. Subtle secondary soft blue glow */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[300px] bg-blue-200/25 rounded-full blur-3xl" />
      <div className="absolute top-10 left-1/4 w-[400px] h-[250px] bg-cyan-200/25 rounded-full blur-3xl" />

      {/* 4. Bottom smooth feathering to blend into slate-50 */}
      <div className="absolute bottom-0 inset-x-0 h-36 bg-gradient-to-b from-transparent via-slate-50/60 to-slate-50" />
    </div>
  );
}
