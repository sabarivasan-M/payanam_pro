import { Asset } from 'expo-asset';

/**
 * DEMO ONLY: synthetic test images (clearly marked "SAMPLE · NOT A REAL DOCUMENT") so flows can be
 * demonstrated on emulators/web without a camera. Never shown when DEMO_MODE is off.
 */
const SOURCES = {
  id: require('../../assets/demo/test-id-card.jpg'),
  selfie: require('../../assets/demo/test-selfie.jpg'),
  bike: require('../../assets/demo/test-bike.jpg'),
  speedometer: require('../../assets/demo/test-speedometer.jpg'),
} as const;

export type DemoImageKind = keyof typeof SOURCES;

export async function getDemoImageUri(kind: DemoImageKind): Promise<string> {
  const asset = Asset.fromModule(SOURCES[kind]);
  await asset.downloadAsync();
  return asset.localUri ?? asset.uri;
}
