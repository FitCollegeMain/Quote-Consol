import React from "react";

interface LogoProps {
  variant?: "light" | "dark";
  className?: string;
}

export default function Logo({ variant = "light", className = "h-24 w-auto" }: LogoProps) {
  const color = variant === "light" ? "#0F0F10" : "#FFFFFF";
  const innerColor = variant === "light" ? "#FFFFFF" : "#0F0F10";

  // Wreath leaves positions and rotations for left and right branches (symmetry is perfect)
  // Each leaf represented as { x, y, rotate, scale }
  const leftLeaves = [
    { x: 100, y: 350, r: -50, s: 1.0 },
    { x: 75, y: 320, r: -35, s: 1.0 },
    { x: 55, y: 285, r: -15, s: 1.0 },
    { x: 45, y: 245, r: 0, s: 1.0 },
    { x: 45, y: 200, r: 15, s: 1.0 },
    { x: 55, y: 155, r: 35, s: 1.0 },
    { x: 75, y: 110, r: 50, s: 1.0 },
    { x: 105, y: 70, r: 65, s: 1.0 },
    { x: 145, y: 40, r: 80, s: 1.0 },
    { x: 190, y: 25, r: 95, s: 1.0 },
    { x: 235, y: 22, r: 110, s: 1.0 },
  ];

  const rightLeaves = [
    { x: 400, y: 350, r: 50, s: 1.0 },
    { x: 425, y: 320, r: 35, s: 1.0 },
    { x: 445, y: 285, r: 15, s: 1.0 },
    { x: 455, y: 245, r: 0, s: 1.0 },
    { x: 455, y: 200, r: -15, s: 1.0 },
    { x: 445, y: 155, r: -35, s: 1.0 },
    { x: 425, y: 110, r: -50, s: 1.0 },
    { x: 395, y: 70, r: -65, s: 1.0 },
    { x: 355, y: 40, r: -80, s: 1.0 },
    { x: 310, y: 25, r: -95, s: 1.0 },
    { x: 265, y: 22, r: -110, s: 1.0 },
  ];

  return (
    <svg
      viewBox="0 0 500 500"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="FIT College Logo"
    >
      <g>
        {/* Laurel Left Stem */}
        <path
          d="M 120 370 Q 20 250 120 50 Q 180 20 230 20"
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Laurel Right Stem */}
        <path
          d="M 380 370 Q 480 250 380 50 Q 320 20 270 20"
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Laurel Left Leaves */}
        {leftLeaves.map((leaf, index) => (
          <path
            key={`left-${index}`}
            d="M 0 0 C -15 -10 -25 -5 -30 15 C -25 25 -10 20 0 0"
            fill={color}
            transform={`translate(${leaf.x}, ${leaf.y}) rotate(${leaf.r}) scale(${leaf.s})`}
          />
        ))}

        {/* Laurel Right Leaves */}
        {rightLeaves.map((leaf, index) => (
          <path
            key={`right-${index}`}
            d="M 0 0 C 15 -10 25 -5 30 15 C 25 25 10 20 0 0"
            fill={color}
            transform={`translate(${leaf.x}, ${leaf.y}) rotate(${leaf.r}) scale(${leaf.s})`}
          />
        ))}

        {/* Bottom Wreath intersection */}
        <path
          d="M 120 370 C 160 415 340 415 380 370"
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Inner Box Square Frame */}
        <rect
          x="125"
          y="75"
          width="250"
          height="250"
          fill={innerColor}
          stroke={color}
          strokeWidth="8"
        />

        {/* Inner thin border line inside the Square Box */}
        <rect
          x="133"
          y="83"
          width="234"
          height="234"
          fill="none"
          stroke={color}
          strokeWidth="2"
        />

        {/* Double corners notches inside the Box (typical of heritage collegiate design) */}
        <path d="M 143 83 L 143 100 L 125 100" fill="none" stroke={color} strokeWidth="2" />
        <path d="M 357 83 L 357 100 L 375 100" fill="none" stroke={color} strokeWidth="2" />
        <path d="M 143 317 L 143 300 L 125 300" fill="none" stroke={color} strokeWidth="2" />
        <path d="M 357 317 L 357 300 L 375 300" fill="none" stroke={color} strokeWidth="2" />

        {/* "FIT" Text (Collegiate Styled outlined block text) */}
        {/* Primary Outlined text using styled SVG text */}
        <text
          x="250"
          y="180"
          textAnchor="middle"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinejoin="miter"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="100"
          letterSpacing="4"
        >
          FIT
        </text>
        <text
          x="250"
          y="180"
          textAnchor="middle"
          fill={innerColor}
          stroke={color}
          strokeWidth="3"
          strokeLinejoin="miter"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="100"
          letterSpacing="4"
        >
          FIT
        </text>

        {/* COLLEGE Horizontal bar container */}
        <rect
          x="145"
          y="205"
          width="210"
          height="65"
          fill={color}
        />
        {/* Double border for COLLEGE bar */}
        <rect
          x="151"
          y="211"
          width="198"
          height="53"
          fill="none"
          stroke={innerColor}
          strokeWidth="2"
        />

        {/* COLLEGE Text */}
        <text
          x="250"
          y="248"
          textAnchor="middle"
          fill={innerColor}
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="800"
          fontSize="34"
          letterSpacing="2"
        >
          COLLEGE
        </text>

        {/* "EST 1988" Banner in Wreath */}
        <g transform="translate(0, 310)">
          {/* Banner container */}
          <path
            d="M 210 50 Q 250 55 290 50"
            fill="none"
            stroke={color}
            strokeWidth="26"
            strokeLinecap="round"
          />
          <path
            d="M 210 50 Q 250 55 290 50"
            fill="none"
            stroke={innerColor}
            strokeWidth="22"
            strokeLinecap="round"
          />
          {/* Text of EST 1988 */}
          <text
            x="250"
            y="54"
            textAnchor="middle"
            fill={color}
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="bold"
            fontSize="12"
            letterSpacing="1"
          >
            EST 1988
          </text>
        </g>

        {/* RTO - 31903 Text below everything */}
        <text
          x="250"
          y="445"
          textAnchor="middle"
          fill={color}
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="700"
          fontSize="18"
          letterSpacing="2"
        >
          RTO - 31903
        </text>
      </g>
    </svg>
  );
}
