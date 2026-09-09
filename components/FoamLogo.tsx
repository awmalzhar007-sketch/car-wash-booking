"use client";

import Link from "next/link";

interface FoamLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  showTagline?: boolean;
  href?: string;
  className?: string;
}

export default function FoamLogo({
  size = "md",
  showText = true,
  showTagline = false,
  href,
  className = "",
}: FoamLogoProps) {
  const iconSizes = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  };

  const textSizes = {
    sm: "text-base tracking-tight",
    md: "text-xl tracking-tight",
    lg: "text-2xl tracking-tight",
    xl: "text-3xl tracking-tight",
  };

  const logoIcon = (
    <div
      className={`relative ${iconSizes[size]} rounded-2xl bg-gradient-to-tr from-blue-600 via-cyan-500 to-indigo-600 p-[1.5px] shadow-lg shadow-cyan-500/20 shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform`}
    >
      <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center overflow-hidden relative">
        {/* Glow backdrop */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-blue-600/20 to-transparent"></div>

        {/* Stylized Foam SVG */}
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-3/4 h-3/4 text-cyan-400 relative z-10"
        >
          {/* Main Bubble */}
          <circle
            cx="19"
            cy="21"
            r="11"
            className="fill-cyan-500/30 stroke-cyan-300"
            strokeWidth="2"
          />
          {/* Top-Right Secondary Bubble */}
          <circle
            cx="27"
            cy="13"
            r="6"
            className="fill-blue-400/40 stroke-cyan-200"
            strokeWidth="1.5"
          />
          {/* Small Foam Bubbles */}
          <circle cx="10" cy="14" r="3" className="fill-cyan-200" />
          <circle cx="31" cy="24" r="2.5" className="fill-blue-200" />
          <circle cx="13" cy="29" r="2" className="fill-cyan-300/80" />

          {/* Sparkle Star */}
          <path
            d="M20 7L21 11L25 12L21 13L20 17L19 13L15 12L19 11L20 7Z"
            fill="white"
          />
          <circle cx="16" cy="18" r="1.5" fill="white" />
        </svg>
      </div>
    </div>
  );

  const content = (
    <div className={`flex items-center gap-3 ${className}`}>
      {logoIcon}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-black ${textSizes[size]} text-slate-900 tracking-wider font-mono`}
            >
              FOAM
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-gradient-to-r from-cyan-500 to-blue-600 text-white leading-none">
              فوم
            </span>
          </div>
          {showTagline && (
            <span className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              منظومة إدارة وحجوزات المغاسل
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="group inline-flex items-center">
        {content}
      </Link>
    );
  }

  return content;
}
