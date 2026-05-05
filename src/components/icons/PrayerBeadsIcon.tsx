import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

type IconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

// Tasbeeh / misbaha — 8 beads arranged in a closed loop with imam (leader bead).
// Geometric, single-color, thin-stroke icon.

export function PrayerBeadsIcon({
  size = 24,
  color = 'currentColor',
  strokeWidth = 1.6,
}: IconProps) {
  // Beads positioned around a downward-curving loop
  const beads: Array<[number, number, number]> = [
    [4.5, 12, 1.4],
    [5.6, 8.5, 1.3],
    [8.5, 5.9, 1.3],
    [12, 5, 1.4],
    [15.5, 5.9, 1.3],
    [18.4, 8.5, 1.3],
    [19.5, 12, 1.4],
    [16.5, 17.5, 1.3],
    [12, 19.2, 1.5], // imam bead (slightly larger)
    [7.5, 17.5, 1.3],
  ];

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Connecting thread - closed loop */}
      <Path
        d="M5.6 8.5 Q3.5 12 6 16 Q9 19.5 12 19.5 Q15 19.5 18 16 Q20.5 12 18.4 8.5 Q15 4.5 12 4.5 Q9 4.5 5.6 8.5 Z"
        stroke={color}
        strokeWidth={strokeWidth - 0.6}
        strokeLinejoin="round"
        fill="none"
        opacity={0.6}
      />
      {/* Beads */}
      {beads.map((b, i) => (
        <Circle
          key={i}
          cx={b[0]}
          cy={b[1]}
          r={b[2]}
          fill={color}
          stroke="none"
        />
      ))}
      {/* Imam bead outline emphasis */}
      <Circle
        cx={12}
        cy={19.2}
        r={1.5}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth - 0.6}
      />
      {/* Tail */}
      <Path
        d="M12 20.7 V22.5"
        stroke={color}
        strokeWidth={strokeWidth - 0.4}
        strokeLinecap="round"
      />
    </Svg>
  );
}
