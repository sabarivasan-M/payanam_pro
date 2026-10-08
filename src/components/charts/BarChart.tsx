import React, { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { formatINR } from '@/utils/format';

/** Minimal revenue bar chart; highlights the latest bar */
export function BarChart({ data, height = 180 }: { data: { label: string; value: number }[]; height?: number }) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const max = Math.max(1, ...data.map((d) => d.value));
  const top = 22;
  const bottom = 24;
  const chartH = height - top - bottom;
  const slot = width / Math.max(1, data.length);
  const barW = Math.min(30, slot * 0.55);
  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} style={{ height }} accessibilityLabel="Revenue chart">
      {width > 0 ? (
        <Svg width={width} height={height}>
          {[0, 0.5, 1].map((f) => (
            <Line key={f} x1={0} x2={width} y1={top + chartH * (1 - f)} y2={top + chartH * (1 - f)} stroke={t.colors.border} strokeWidth={1} strokeDasharray="3 4" />
          ))}
          {data.map((d, i) => {
            const h = (d.value / max) * chartH;
            const x = slot * i + (slot - barW) / 2;
            const last = i === data.length - 1;
            return (
              <React.Fragment key={d.label + i}>
                <Rect x={x} y={top + chartH - h} width={barW} height={Math.max(h, 2)} rx={6} fill={last ? t.colors.primary : t.colors.primarySoft} stroke={last ? 'none' : t.colors.primary} strokeOpacity={0.25} />
                {d.value > 0 && (last || d.value === max) ? (
                  <SvgText x={x + barW / 2} y={top + chartH - h - 6} fontSize={10} fontWeight="700" fill={t.colors.text} textAnchor="middle">
                    {formatINR(d.value)}
                  </SvgText>
                ) : null}
                <SvgText x={x + barW / 2} y={height - 6} fontSize={11} fill={t.colors.textSecondary} textAnchor="middle">
                  {d.label}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      ) : null}
    </View>
  );
}
