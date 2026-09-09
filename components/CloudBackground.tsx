"use client";

export default function CloudBackground() {
  return (
    <div
      className="absolute top-0 inset-x-0 h-[560px] overflow-hidden pointer-events-none select-none z-0"
      aria-hidden="true"
    >
      {/* 1. Sky Light-Blue Ambient Gradient (تدريج اللون اللبني الناعم من فوق) */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-200/50 via-sky-100/30 via-blue-50/20 to-transparent" />

      {/* 2. Soft atmospheric sun/sky glow */}
      <div className="absolute -top-28 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-gradient-to-b from-sky-300/20 via-cyan-100/25 to-transparent rounded-full blur-3xl" />

      {/* 3. Top Left Cloud Formation (سحابة ناعمة أعلى اليسار) */}
      <div className="absolute -top-6 -left-12 opacity-85">
        <svg
          width="380"
          height="190"
          viewBox="0 0 380 190"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-[0_8px_18px_rgba(186,230,253,0.35)]"
        >
          <defs>
            <linearGradient id="cloudGradLeft" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="70%" stopColor="#f0f9ff" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0.5" />
            </linearGradient>
            <linearGradient id="cloudBackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#bae6fd" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          {/* Back deeper layer */}
          <path
            d="M50 145 C50 100, 80 80, 110 85 C130 60, 175 60, 195 85 C225 75, 270 95, 270 135 C290 135, 310 150, 305 170 C250 180, 100 180, 50 145 Z"
            fill="url(#cloudBackGrad)"
          />
          {/* Front crisp layer */}
          <path
            d="M20 155 C20 115, 45 95, 80 100 C95 70, 140 65, 165 90 C185 75, 230 80, 245 115 C270 115, 290 132, 285 155 C265 168, 70 170, 20 155 Z"
            fill="url(#cloudGradLeft)"
          />
        </svg>
      </div>

      {/* 4. Top Right Cloud Formation (سحابة ناعمة أعلى اليمين) */}
      <div className="absolute -top-10 -right-16 opacity-85">
        <svg
          width="430"
          height="230"
          viewBox="0 0 430 230"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-[0_10px_20px_rgba(186,230,253,0.3)]"
        >
          <defs>
            <linearGradient id="cloudGradRight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="70%" stopColor="#f0f9ff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#dbeafe" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="cloudBackRight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#bae6fd" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          {/* Back layer */}
          <path
            d="M80 175 C80 120, 125 100, 165 110 C190 78, 240 75, 275 100 C310 85, 370 105, 370 155 C400 155, 420 175, 410 200 C340 215, 150 210, 80 175 Z"
            fill="url(#cloudBackRight)"
          />
          {/* Front layer */}
          <path
            d="M110 185 C110 135, 150 115, 190 125 C210 95, 260 90, 290 120 C320 105, 370 120, 380 165 C405 165, 420 185, 410 205 C345 220, 170 215, 110 185 Z"
            fill="url(#cloudGradRight)"
          />
        </svg>
      </div>

      {/* 5. Center Subtle Cloud Silhouette (خفيف وهادئ في المنتصف) */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 opacity-40 hidden sm:block">
        <svg
          width="520"
          height="120"
          viewBox="0 0 520 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="cloudCenterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <path
            d="M50 95 C50 65, 80 50, 115 60 C135 35, 185 30, 215 50 C245 38, 295 45, 315 70 C340 60, 390 70, 400 95 C430 95, 450 105, 440 120 C370 125, 120 125, 50 95 Z"
            fill="url(#cloudCenterGrad)"
          />
        </svg>
      </div>

      {/* 6. Subtle soft cloud/foam wisps */}
      <div className="absolute top-40 left-1/4 w-36 h-12 bg-white/40 rounded-full blur-xl pointer-events-none" />
      <div className="absolute top-48 right-1/4 w-44 h-14 bg-sky-100/40 rounded-full blur-xl pointer-events-none" />

      {/* 7. Bottom feathering mask so it fades smoothly into the rest of the page */}
      <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-b from-transparent via-slate-50/70 to-slate-50" />
    </div>
  );
}
