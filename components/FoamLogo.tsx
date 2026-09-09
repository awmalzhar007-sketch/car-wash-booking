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
    sm: "w-9 h-9",
    md: "w-11 h-11",
    lg: "w-14 h-14",
    xl: "w-18 h-18",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
    xl: "text-4xl",
  };

  // Luxury Minimalist Automotive Tech Emblem
  // Aerodynamic speed contour intersecting a pure fluid water/foam crest with precision negative space
  const logoIcon = (
    <div
      className={`relative ${iconSizes[size]} rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-slate-950 p-[1.5px] shadow-lg shadow-blue-600/20 shrink-0 flex items-center justify-center group-hover:scale-105 group-hover:shadow-blue-500/30 transition-all duration-300`}
    >
      <div className="w-full h-full bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-[14px] flex items-center justify-center overflow-hidden relative">
        {/* Subtle refractive sheen */}
        <div className="absolute -top-6 -right-6 w-12 h-12 bg-cyan-400/20 rounded-full blur-md pointer-events-none"></div>

        {/* Bespoke Geometric Automotive Wash Monogram */}
        <svg
          viewBox="0 0 44 44"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-[72%] h-[72%] relative z-10"
        >
          {/* Defs for premium gradients */}
          <defs>
            <linearGradient id="foamCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
            <linearGradient id="silverSpeedGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>
            <linearGradient id="glowDroplet" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
          </defs>

          {/* Aerodynamic Roof & Windshield Speed Sweep (Car Fastback Silhouette) */}
          <path
            d="M8 26C11 20 16 15 24 15C32 15 36 21 38 26"
            stroke="url(#silverSpeedGrad)"
            strokeWidth="2.8"
            strokeLinecap="round"
          />

          {/* Fluid Foam Wave / Surface Tension Crest forming the iconic 'F' flow */}
          <path
            d="M13 20C17 11 27 10 32 14C35 16.5 35.5 20 33 22C30 24 25 21 21 24C17 27 14 31 12 34"
            stroke="url(#foamCyanGrad)"
            strokeWidth="2.6"
            strokeLinecap="round"
          />

          {/* Precision Micro Foam Droplets & Luxury Shine Star */}
          <circle cx="28" cy="10" r="2" fill="url(#glowDroplet)" />
          <circle cx="35" cy="14" r="1.5" fill="#bae6fd" />
          <circle cx="11" cy="17" r="1.2" fill="#7dd3fc" />

          {/* Precision Diamond Shine Accent */}
          <path
            d="M27 5L28 7.5L30.5 8.5L28 9.5L27 12L26 9.5L23.5 8.5L26 7.5L27 5Z"
            fill="#ffffff"
          />

          {/* Lower Chassis Clean Grounding Line */}
          <path
            d="M10 31H34"
            stroke="url(#silverSpeedGrad)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeOpacity="0.8"
          />
        </svg>
      </div>
    </div>
  );

  const content = (
    <div className={`flex items-center gap-3.5 ${className}`}>
      {logoIcon}
      {showText && (
        <div className="flex flex-col text-start">
          <div className="flex items-center gap-2">
            <span
              className={`font-black ${textSizes[size]} text-slate-900 tracking-tight font-sans`}
              style={{ letterSpacing: "-0.04em" }}
            >
              FOAM
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-gradient-to-r from-blue-600 to-cyan-600 text-white tracking-wide shadow-sm uppercase">
              فوم
            </span>
          </div>
          {showTagline && (
            <span className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
              منظومة حجز وإدارة مغاسل السيارات الذكية
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
