import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { StoredImage } from '@/components/ui/Misc';
import { useTheme } from '@/theme/ThemeProvider';
import type { Bike, BikeImage as BikeImageRow, PhotoAngle } from '@/types/models';
import { BikeIllustration } from './BikeIllustration';

interface Props {
  bike: Pick<Bike, 'bikeType' | 'color'>;
  images?: BikeImageRow[];
  angle?: PhotoAngle;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/** Real photo when the partner uploaded one, otherwise the illustrated placeholder. */
export function BikeImage({ bike, images = [], angle = 'left', height = 160, radius, style }: Props) {
  const t = useTheme();
  const photo = images.find((i) => i.angle === angle) ?? (angle === 'left' ? images.find((i) => i.angle === 'right') : undefined);
  const r = radius ?? t.radius.lg;
  if (photo) {
    return <StoredImage uri={photo.url} style={[{ width: '100%', height, borderRadius: r }, style as object]} />;
  }
  return (
    <View
      style={[
        {
          height,
          borderRadius: r,
          backgroundColor: t.scheme === 'dark' ? t.colors.surfaceAlt : '#EEF3F1',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <View style={{ position: 'absolute', bottom: -height * 0.3, width: height * 2.4, height: height * 0.62, borderRadius: height, backgroundColor: t.colors.primarySoft }} />
      {/* Positioned so it paints above the backdrop on web as well as native */}
      <View style={{ position: 'relative', zIndex: 1 }}>
        <BikeIllustration type={bike.bikeType} color={bike.color} angle={angle} width={height * 1.5} height={height * 0.9} />
      </View>
    </View>
  );
}
