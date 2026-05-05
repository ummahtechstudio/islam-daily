import React from 'react';
import Svg, { Path } from 'react-native-svg';

type IconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

// Stylized mosque silhouette — central dome with two minarets.
// Single-color, geometric, ~thin stroke to match lucide visual weight.

export function MinaretIcon({ size = 24, color = 'currentColor', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Crescent on dome */}
      <Path
        d="M12 1.5 V3"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Path
        d="M11 3 a1 1 0 1 0 2 0"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
      />
      {/* Central dome */}
      <Path
        d="M7 12 Q7 7 12 7 Q17 7 17 12"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
      />
      {/* Left minaret */}
      <Path
        d="M3 8 V21"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Path
        d="M3 8 L2 6.5 L3 5 L4 6.5 Z"
        stroke={color}
        strokeWidth={strokeWidth - 0.3}
        strokeLinejoin="round"
        fill="none"
      />
      {/* Right minaret */}
      <Path
        d="M21 8 V21"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Path
        d="M21 8 L20 6.5 L21 5 L22 6.5 Z"
        stroke={color}
        strokeWidth={strokeWidth - 0.3}
        strokeLinejoin="round"
        fill="none"
      />
      {/* Body of mosque */}
      <Path
        d="M5 21 V12 H19 V21"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        fill="none"
      />
      {/* Ground line */}
      <Path
        d="M2 21 H22"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Doorway arch */}
      <Path
        d="M10 21 V16 Q10 14 12 14 Q14 14 14 16 V21"
        stroke={color}
        strokeWidth={strokeWidth - 0.3}
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
