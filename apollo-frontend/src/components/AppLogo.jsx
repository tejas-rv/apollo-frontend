import React from "react";

export default function AppLogo({ size = 56, rounded = true, showText = true }) {
  return (
    <div className="app-logo" style={{ ["--logo-size"]: `${size}px`, ["--logo-radius"]: rounded ? "16px" : "0px" }}>
      <img src="/apollo_elevator_logo.png" alt="Apollo Elevator" className="app-logo-mark" />
      {showText && (
        <div className="app-logo-copy">
          <b>APOLLO</b>
          <span>Elevator</span>
        </div>
      )}
    </div>
  );
}
