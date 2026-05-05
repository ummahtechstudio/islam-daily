import React from 'react';
import Svg, { Path, Rect, Line } from 'react-native-svg';

type IconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

// Stylized Kaaba — cube outline with kiswah band and door.
// Geometric, single-color icon at lucide visual weight.

export function KaabaIcon({
  size = 24,
  color = 'currentColor',
  strokeWidth = 1.8,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Ground line */}
      <Path
        d="M2 21 H22"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Cube body */}
      <Rect
        x={5}
        y={6}
        width={14}
        height={15}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        fill="none"
      />
      {/* Kiswah upper band (horizontal line representing embroidered band) */}
      <Line
        x1={5}
        y1={10}
        x2={19}
        y2={10}
        stroke={color}
        strokeWidth={strokeWidth - 0.4}
      />
      {/* Door (right side, slightly inset) */}
      <Rect
        x={13}
        y={14}
        width={3.5}
        height={7}
        stroke={color}
        strokeWidth={strokeWidth - 0.4}
        strokeLinejoin="round"
        fill="none"
      />
      {/* Top crown / roof line */}
      <Path
        d="M5 6 L7 4 H17 L19 6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
