import React, { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Path, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';
import type { GeoPoint } from '@/types/models';

/**
 * Map view abstraction.
 * DEMO: renders a stylised vector map and projects the real lat/lng of every marker onto it.
 * PRODUCTION: replace the body with react-native-maps / Mapbox using the same props —
 * screens only depend on <RouteMap markers route />.
 */
export interface MapMarker {
  point: GeoPoint;
  kind: 'user' | 'bike' | 'owner';
  label?: string;
}

interface Props {
  markers: MapMarker[];
  route?: GeoPoint[];
  height?: number;
  radius?: number;
}

export function RouteMap({ markers, route, height = 220, radius }: Props) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const pts = [...markers.map((m) => m.point), ...(route ?? [])];
  const lats = pts.map((p) => p.lat);
  const lngs = pts.map((p) => p.lng);
  const pad = 0.004;
  let minLat = Math.min(...lats) - pad;
  let maxLat = Math.max(...lats) + pad;
  let minLng = Math.min(...lngs) - pad;
  let maxLng = Math.max(...lngs) + pad;
  // Keep aspect ratio so the geometry isn't distorted
  const spanLat = maxLat - minLat;
  const spanLng = maxLng - minLng;
  const aspect = width > 0 ? width / height : 1.6;
  if (spanLng / spanLat < aspect) {
    const extra = (spanLat * aspect - spanLng) / 2;
    minLng -= extra;
    maxLng += extra;
  } else {
    const extra = (spanLng / aspect - spanLat) / 2;
    minLat -= extra;
    maxLat += extra;
  }
  const project = (p: GeoPoint) => ({
    x: ((p.lng - minLng) / (maxLng - minLng)) * width,
    y: (1 - (p.lat - minLat) / (maxLat - minLat)) * height,
  });

  const colors = {
    user: t.colors.info,
    bike: t.colors.primary,
    owner: t.colors.accent,
  };

  return (
    <View onLayout={onLayout} style={{ height, borderRadius: radius ?? t.radius.xl, overflow: 'hidden', backgroundColor: t.colors.mapLand }}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Rect x={0} y={0} width={width} height={height} fill={t.colors.mapLand} />
          {/* Decorative city texture */}
          <Path d={`M${width * 0.62} ${height} C ${width * 0.7} ${height * 0.7}, ${width * 0.95} ${height * 0.65}, ${width} ${height * 0.45} L ${width} ${height} Z`} fill={t.colors.mapWater} />
          <Rect x={width * 0.08} y={height * 0.12} width={width * 0.16} height={height * 0.18} rx={10} fill={t.colors.mapPark} />
          <Rect x={width * 0.55} y={height * 0.08} width={width * 0.12} height={height * 0.22} rx={10} fill={t.colors.mapPark} />
          <G stroke={t.colors.mapRoad} strokeLinecap="round">
            {[0.2, 0.42, 0.66, 0.86].map((f) => (
              <Path key={`h${f}`} d={`M0 ${height * f} L${width} ${height * (f + 0.04)}`} strokeWidth={f === 0.42 ? 9 : 5} />
            ))}
            {[0.15, 0.36, 0.58, 0.8].map((f) => (
              <Path key={`v${f}`} d={`M${width * f} 0 L${width * (f - 0.03)} ${height}`} strokeWidth={f === 0.58 ? 9 : 5} />
            ))}
          </G>
          {route && route.length > 1 ? (
            <>
              <Polyline
                points={route.map((p) => `${project(p).x},${project(p).y}`).join(' ')}
                fill="none"
                stroke={t.colors.primary}
                strokeOpacity={0.25}
                strokeWidth={10}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <Polyline
                points={route.map((p) => `${project(p).x},${project(p).y}`).join(' ')}
                fill="none"
                stroke={t.colors.primary}
                strokeWidth={4}
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray="1 0"
              />
            </>
          ) : null}
          {markers.map((m, i) => {
            const { x, y } = project(m.point);
            const c = colors[m.kind];
            if (m.kind === 'user') {
              return (
                <G key={i}>
                  <Circle cx={x} cy={y} r={16} fill={c} opacity={0.18} />
                  <Circle cx={x} cy={y} r={7} fill={c} stroke="#fff" strokeWidth={3} />
                </G>
              );
            }
            return (
              <G key={i}>
                <Path d={`M${x} ${y} l-11 -15 a14 14 0 1 1 22 0 z`} fill={c} stroke="#fff" strokeWidth={2} />
                <Circle cx={x} cy={y - 22} r={5} fill="#fff" />
                {m.label ? (
                  <SvgText x={x} y={y + 14} fontSize={11} fontWeight="700" fill={t.colors.text} textAnchor="middle">
                    {m.label}
                  </SvgText>
                ) : null}
              </G>
            );
          })}
        </Svg>
      ) : null}
      <View style={{ position: 'absolute', left: 10, bottom: 10, backgroundColor: t.colors.surface, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, opacity: 0.92 }}>
        <Text variant="caption" color="textSecondary">
          Demo map · mock route
        </Text>
      </View>
    </View>
  );
}
