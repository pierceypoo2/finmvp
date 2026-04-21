"use client";

import { type Theme } from "@/context/ThemeContext";
import { cn } from "@/lib/cn";
import { useId } from "react";

type GlassMode = Theme;

/**
 * Rounded “liquid glass” stack: backdrop frosted layer + optional mild SVG displacement
 * on a decorative underlay only (icon stays sharp for readability).
 */
export function LiquidGlassIconSurface({ mode }: { mode: GlassMode }) {
  const fid = useId().replace(/:/g, "");
  const filterId = `${fid}-lg`;

  const shell = cn(
    "pointer-events-none absolute inset-0 rounded-full border backdrop-blur-xl",
    mode === "dark" &&
      "border-white/[0.1] bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_1px_2px_rgba(0,0,0,0.35)]",
    mode === "sundown" &&
      "border-amber-200/45 bg-amber-50/40 shadow-[inset_0_1px_0_rgba(255,253,245,0.92),0_1px_2px_rgba(120,53,15,0.08)]",
    mode === "light" &&
      "border-white/70 bg-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_1px_3px_rgba(15,23,42,0.06)]",
  );

  const chroma = cn(
    "absolute inset-[1px] rounded-full opacity-[0.38] mix-blend-overlay",
    mode === "dark" && "from-white/25 via-white/5 to-transparent",
    mode === "sundown" && "from-amber-200/50 via-amber-100/15 to-transparent",
    mode === "light" && "from-white/90 via-sky-100/20 to-transparent",
    "bg-gradient-to-br",
  );

  const useWarp = mode !== "dark";

  return (
    <>
      {useWarp ? (
        <svg className="pointer-events-none absolute h-0 w-0" aria-hidden>
          <defs>
            <filter
              id={filterId}
              x="-35%"
              y="-35%"
              width="170%"
              height="170%"
              colorInterpolationFilters="sRGB"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.11"
                numOctaves="2"
                seed="7"
                result="noise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale={mode === "light" ? "2.2" : "1.6"}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
        </svg>
      ) : null}
      <span className={shell} aria-hidden />
      {useWarp ? (
        <span
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
          aria-hidden
        >
          <span
            className={chroma}
            style={{ filter: `url(#${filterId})` }}
          />
        </span>
      ) : (
        <span className={cn(chroma, "opacity-25")} aria-hidden />
      )}
      <span
        className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/25 dark:ring-white/10 sundown:ring-amber-100/40"
        aria-hidden
      />
    </>
  );
}
