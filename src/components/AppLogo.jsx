import React from "react";

/**
 * tone="brand" -> blue mark on light backgrounds (default)
 * tone="light" -> light mark + light text, for dark/navy backgrounds
 */
export default function AppLogo({ size = 56, rounded = true, showText = true, tone = "brand" }) {
  return (
    <div
      className={tone === "light" ? "app-logo app-logo--light" : "app-logo"}
      style={{ ["--logo-size"]: `${size}px`, ["--logo-radius"]: rounded ? "16px" : "0px" }}
    >
      <svg
        className="app-logo-mark"
        viewBox="0 0 540 365"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Apollo Elevator"
      >
        {/* UP ARROW */}
        <polygon points="250,18 305,75 278,75 278,150 222,150 222,75 195,75" fill="currentColor" />

        {/* DOWN ARROW */}
        <rect x="222" y="225" width="56" height="66" fill="currentColor" />
        <polygon points="195,303 222,303 222,290 278,290 278,303 305,303 250,363" fill="currentColor" />

        {/* APOLLO */}
        <text
          x="255"
          y="215"
          textAnchor="middle"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="75"
          fontWeight="800"
          fill="currentColor"
        >
          APOLLO
        </text>
      </svg>
      {showText && (
        <div className="app-logo-copy">
          <b>APOLLO</b>
          <span>Elevator</span>
        </div>
      )}
    </div>
  );
}
