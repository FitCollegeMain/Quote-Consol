import React from "react";
import logoLight from "../assets/logo_light.svg";
import logoDark from "../assets/logo_dark.svg";

interface LogoProps {
  variant?: "light" | "dark";
  className?: string;
}

export default function Logo({ variant = "light", className = "h-24 w-auto" }: LogoProps) {
  const logoSrc = variant === "light" ? logoLight : logoDark;

  return (
    <img
      src={logoSrc}
      className={className}
      alt="FIT College Logo"
      referrerPolicy="no-referrer"
    />
  );
}

