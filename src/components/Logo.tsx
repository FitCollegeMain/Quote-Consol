import React, { useState } from "react";
import logoLightPng from "../assets/FC Logo black (2).png";
import logoDarkPng from "../assets/FC Logo white (1).png";
import logoLightSvg from "../assets/logo_light.svg";
import logoDarkSvg from "../assets/logo_dark.svg";

interface LogoProps {
  variant?: "light" | "dark";
  className?: string;
}

export default function Logo({ variant = "light", className = "h-24 w-auto" }: LogoProps) {
  const [useSvgFallback, setUseSvgFallback] = useState(false);

  // Prioritize the PNG images, fallback to the original SVGs if PNG fails
  const pngSrc = variant === "light" ? logoLightPng : logoDarkPng;
  const svgSrc = variant === "light" ? logoLightSvg : logoDarkSvg;

  const logoSrc = useSvgFallback ? svgSrc : pngSrc;

  return (
    <img
      src={logoSrc}
      className={className}
      alt="FIT College Logo"
      onError={() => {
        if (!useSvgFallback) {
          setUseSvgFallback(true);
        }
      }}
      referrerPolicy="no-referrer"
    />
  );
}

