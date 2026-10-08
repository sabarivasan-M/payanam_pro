import React from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import type { BikeType, PhotoAngle } from '@/types/models';

/**
 * Vector placeholder used whenever a bike has no uploaded photo for an angle.
 * Draws a scooter or motorcycle silhouette in the bike's colour.
 */
interface Props {
  type: BikeType;
  color: string;
  angle?: PhotoAngle | 'side';
  width?: number;
  height?: number;
}

const DARK = '#1F2A33';
const METAL = '#9AA5AD';
const TYRE = '#26323B';

function isScooter(type: BikeType) {
  return type === 'scooter' || type === 'electric';
}

function SideScooter({ color }: { color: string }) {
  return (
    <G>
      <Ellipse cx="100" cy="112" rx="78" ry="5" fill="#000" opacity={0.08} />
      <Circle cx="52" cy="92" r="19" fill={TYRE} />
      <Circle cx="52" cy="92" r="8" fill={METAL} />
      <Circle cx="152" cy="92" r="19" fill={TYRE} />
      <Circle cx="152" cy="92" r="8" fill={METAL} />
      <Path d="M28 86 Q26 60 58 56 L104 56 Q114 57 116 70 L116 86 Z" fill={color} />
      <Rect x="98" y="80" width="36" height="8" rx="3" fill={DARK} />
      <Path d="M124 90 L136 40 Q139 33 146 35 L150 40 L141 90 Z" fill={color} />
      <Line x1="142" y1="60" x2="152" y2="92" stroke={METAL} strokeWidth="5" strokeLinecap="round" />
      <Path d="M48 56 Q72 44 104 52 L102 58 L52 60 Z" fill={DARK} />
      <Line x1="140" y1="33" x2="156" y2="30" stroke={DARK} strokeWidth="5" strokeLinecap="round" />
      <Circle cx="150" cy="46" r="5" fill="#FFD27A" />
      <Path d="M30 70 L22 72" stroke="#E74C3C" strokeWidth="5" strokeLinecap="round" />
    </G>
  );
}

function SideMotorcycle({ color }: { color: string }) {
  return (
    <G>
      <Ellipse cx="100" cy="112" rx="82" ry="5" fill="#000" opacity={0.08} />
      <Circle cx="48" cy="88" r="22" fill={TYRE} />
      <Circle cx="48" cy="88" r="9" fill={METAL} />
      <Circle cx="154" cy="88" r="22" fill={TYRE} />
      <Circle cx="154" cy="88" r="9" fill={METAL} />
      <Line x1="48" y1="88" x2="96" y2="78" stroke={DARK} strokeWidth="6" strokeLinecap="round" />
      <Rect x="82" y="66" width="32" height="24" rx="5" fill="#3A4650" />
      <Path d="M88 92 L44 98" stroke={METAL} strokeWidth="6" strokeLinecap="round" />
      <Path d="M68 60 Q80 42 108 42 L128 45 Q137 48 134 58 L120 67 L76 69 Z" fill={color} />
      <Path d="M48 58 Q58 50 76 53 L84 58 L54 65 Z" fill={DARK} />
      <Path d="M34 64 L54 55 L58 64 L40 69 Z" fill={color} />
      <Line x1="140" y1="48" x2="154" y2="88" stroke={METAL} strokeWidth="6" strokeLinecap="round" />
      <Line x1="132" y1="38" x2="148" y2="35" stroke={DARK} strokeWidth="5" strokeLinecap="round" />
      <Circle cx="148" cy="51" r="6.5" fill="#FFD27A" />
    </G>
  );
}

function Front({ color, scooter, rear }: { color: string; scooter: boolean; rear?: boolean }) {
  return (
    <G>
      <Ellipse cx="100" cy="113" rx="40" ry="5" fill="#000" opacity={0.08} />
      <Rect x="92" y="78" width="16" height="34" rx="7" fill={TYRE} />
      <Path d={scooter ? 'M70 84 Q72 40 100 34 Q128 40 130 84 Z' : 'M78 74 Q82 46 100 42 Q118 46 122 74 Z'} fill={color} />
      <Line x1="62" y1="38" x2="138" y2="38" stroke={DARK} strokeWidth="6" strokeLinecap="round" />
      <Circle cx="62" cy="38" r="5" fill={DARK} />
      <Circle cx="138" cy="38" r="5" fill={DARK} />
      {rear ? (
        <Rect x="86" y="54" width="28" height="10" rx="4" fill="#E74C3C" />
      ) : (
        <Circle cx="100" cy="58" r="10" fill="#FFD27A" />
      )}
      <Rect x="84" y="88" width="32" height="9" rx="2" fill="#FFFFFF" stroke={DARK} strokeWidth="1.5" />
    </G>
  );
}

function Speedometer() {
  return (
    <G>
      <Circle cx="100" cy="66" r="44" fill="#13212B" />
      <Circle cx="100" cy="66" r="38" fill="none" stroke="#2C3E4A" strokeWidth="6" />
      <Path d="M68 86 A38 38 0 1 1 132 86" fill="none" stroke="#2FB59C" strokeWidth="6" strokeLinecap="round" />
      <Line x1="100" y1="66" x2="122" y2="46" stroke="#F2A33A" strokeWidth="4" strokeLinecap="round" />
      <Circle cx="100" cy="66" r="5" fill="#F2A33A" />
      <Rect x="80" y="82" width="40" height="12" rx="3" fill="#0B1215" />
    </G>
  );
}

export function BikeIllustration({ type, color, angle = 'side', width = 200, height = 120 }: Props) {
  const scooter = isScooter(type);
  let body: React.ReactNode;
  if (angle === 'front') body = <Front color={color} scooter={scooter} />;
  else if (angle === 'rear') body = <Front color={color} scooter={scooter} rear />;
  else if (angle === 'speedometer') body = <Speedometer />;
  else {
    const side = scooter ? <SideScooter color={color} /> : <SideMotorcycle color={color} />;
    body = angle === 'right' ? <G transform="translate(200,0) scale(-1,1)">{side}</G> : side;
  }
  return (
    <Svg width={width} height={height} viewBox="0 0 200 120">
      {body}
    </Svg>
  );
}
