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
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-20 h-20",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
    xl: "text-4xl",
  };

  const logoIcon = (
    <div
      className={`relative ${iconSizes[size]} rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 p-[2px] shadow-md shadow-blue-500/25 shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform`}
    >
      <div className="w-full h-full bg-blue-600 rounded-[14px] flex items-center justify-center overflow-hidden relative">
        {/* Subtle internal shine */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-black/10"></div>

        {/* Dedicated Car Wash Foam SVG Icon */}
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-4/5 h-4/5 text-white relative z-10"
        >
          {/* Foam Bubbles on Top */}
          <circle cx="16" cy="12" r="3.5" fill="#bae6fd" />
          <circle cx="24" cy="9" r="4.5" fill="#e0f2fe" />
          <circle cx="32" cy="11.5" r="3" fill="#bae6fd" />
          <circle cx="20" cy="15" r="2.5" fill="#ffffff" />
          <circle cx="28" cy="14.5" r="2.5" fill="#ffffff" />

          {/* Sparkle Star on top-right */}
          <path
            d="M37 6L38 9.5L41.5 10.5L38 11.5L37 15L36 11.5L32.5 10.5L36 9.5L37 6Z"
            fill="#fef08a"
          />

          {/* Car Body Contour */}
          {/* Windshield & Roof */}
          <path
            d="M12 28L16.5 19.5C17.2 18.3 18.5 17.5 20 17.5H28C29.5 17.5 30.8 18.3 31.5 19.5L36 28"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Car Lower Body */}
          <path
            d="M7 32C7 29.8 8.8 28 11 28H37C39.2 28 41 29.8 41 32V34C41 34.6 40.6 35 40 35H8C7.4 35 7 34.6 7 34V32Z"
            fill="white"
          />
          {/* Car Front Headlights */}
          <circle cx="11.5" cy="30.5" r="1.5" fill="#38bdf8" />
          <circle cx="36.5" cy="30.5" r="1.5" fill="#38bdf8" />

          {/* Car Wheels */}
          <circle cx="14" cy="36" r="3" fill="#0f172a" stroke="white" strokeWidth="1.5" />
          <circle cx="34" cy="36" r="3" fill="#0f172a" stroke="white" strokeWidth="1.5" />

          {/* Water Droplet Splash under car */}
          <path
            d="M20 39C20 40.5 24 41 24 41C24 41 28 40.5 28 39"
            stroke="#bae6fd"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );

  const content = (
    <div className={`flex items-center gap-3.5 ${className}`}>
      {logoIcon}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span
              className={`font-black ${textSizes[size]} text-slate-900 tracking-wider font-mono`}
            >
              FOAM
            </span>
            <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-blue-600 text-white tracking-wide shadow-sm">
              فوم
            </span>
          </div>
          {showTagline && (
            <span className="text-xs text-slate-500 font-semibold leading-none mt-1">
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
