import React from 'react';
import Svg, { G, Path, Circle } from 'react-native-svg';

type IslamicPatternProps = {
  size?: number;
  color?: string;
  opacity?: number;
};

// ─── Geometric medallion (zellige-inspired) ──────────────────────────────────
// A single eight-pointed star surrounded by a circular frame and minor stars.
// Used as a watermark behind hero elements — NEVER as a tiled background.

export function IslamicPattern({
  size = 100,
  color = '#EF9F27',
  opacity = 0.08,
}: IslamicPatternProps) {
  const cx = 50;
  const cy = 50;
  const outerR = 46;
  const starOuter = 32;
  const starInner = 16;

  // Build eight-pointed star points
  const starPath = (() => {
    const points: string[] = [];
    const steps = 16; // 8 outer + 8 inner alternating
    for (let i = 0; i < steps; i++) {
      const angle = (i * Math.PI) / 8 - Math.PI / 2;
      const r = i % 2 === 0 ? starOuter : starInner;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      points.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`);
    }
    return points.join(' ') + ' Z';
  })();

  // Eight small ornaments around outer ring
  const minorOrnaments: React.ReactElement[] = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4 + Math.PI / 8;
    const x = cx + (outerR - 6) * Math.cos(angle);
    const y = cy + (outerR - 6) * Math.sin(angle);
    minorOrnaments.push(
      <Circle key={i} cx={x} cy={y} r={1.6} fill={color} />,
    );
  }

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      opacity={opacity}
      pointerEvents="none"
    >
      <G>
        {/* Outer circle */}
        <Circle
          cx={cx}
          cy={cy}
          r={outerR}
          fill="none"
          stroke={color}
          strokeWidth={0.8}
        />
        {/* Inner ring */}
        <Circle
          cx={cx}
          cy={cy}
          r={outerR - 4}
          fill="none"
          stroke={color}
          strokeWidth={0.5}
          opacity={0.7}
        />
        {/* Eight-pointed star (Khatim) */}
        <Path d={starPath} fill="none" stroke={color} strokeWidth={1} />
        {/* Inner overlapping square (rotated 45deg) — tradition Khatim composition */}
        <Path
          d={`M${cx - 18},${cy} L${cx},${cy - 18} L${cx + 18},${cy} L${cx},${cy + 18} Z`}
          fill="none"
          stroke={color}
          strokeWidth={0.7}
          opacity={0.85}
        />
        <Path
          d={`M${cx - 13},${cy - 13} L${cx + 13},${cy - 13} L${cx + 13},${cy + 13} L${cx - 13},${cy + 13} Z`}
          fill="none"
          stroke={color}
          strokeWidth={0.6}
          opacity={0.7}
        />
        <Circle cx={cx} cy={cy} r={4} fill="none" stroke={color} strokeWidth={0.8} />
        <Circle cx={cx} cy={cy} r={1.4} fill={color} />
        {minorOrnaments}
      </G>
    </Svg>
  );
}
