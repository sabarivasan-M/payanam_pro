import { delay } from '@/lib/id';
import type { InspectionAngle, InspectionResult } from '@/types/models';

/**
 * MOCK vehicle inspection. There is no computer-vision model behind this.
 * Results are derived only from which photos were supplied (and a demo switch to
 * simulate new damage), so the review flow can be demonstrated end-to-end.
 * Replace with a server-side CV API / custom ML model behind the same interface.
 */
export interface BikeInspectionProvider {
  name: string;
  isMock: boolean;
  analyzePreRental(images: { angle: InspectionAngle; url: string }[]): Promise<InspectionResult>;
  compareReturn(input: {
    before: { angle: InspectionAngle; url: string }[];
    after: { angle: InspectionAngle; url: string }[];
    /** DEMO ONLY: force a "new damage" outcome */
    simulateDamage?: boolean;
  }): Promise<InspectionResult>;
}

const REQUIRED: InspectionAngle[] = ['front', 'rear', 'left', 'right', 'speedometer'];

export const mockBikeInspectionService: BikeInspectionProvider = {
  name: 'mock-inspection',
  isMock: true,

  async analyzePreRental(images) {
    await delay(2000);
    const angles = new Set(images.map((i) => i.angle));
    const missing = REQUIRED.filter((a) => !angles.has(a));
    const hasDamagePhotos = angles.has('damage');
    return {
      provider: 'mock-inspection',
      isMock: true,
      vehicleDetected: images.length > 0,
      visibleDamage: hasDamagePhotos ? 'minor' : 'none',
      speedometer: angles.has('speedometer') ? 'readable' : 'unreadable',
      newDamage: null,
      condition: hasDamagePhotos ? 'fair' : 'good',
      differences: missing.map((m) => `Missing ${m} photo`),
      verdict: missing.length === 0 ? 'passed' : 'review_required',
    };
  },

  async compareReturn({ before, after, simulateDamage }) {
    await delay(2400);
    const afterAngles = new Set(after.map((i) => i.angle));
    const missing = REQUIRED.filter((a) => !afterAngles.has(a));
    const damage = !!simulateDamage || afterAngles.has('damage');
    const differences: string[] = [];
    if (damage) differences.push('Possible new scratch near the left side panel');
    if (missing.length) differences.push(...missing.map((m) => `Missing ${m} photo`));
    if (before.length === 0) differences.push('No pre-rental photos to compare against');
    return {
      provider: 'mock-inspection',
      isMock: true,
      vehicleDetected: after.length > 0,
      visibleDamage: damage ? 'minor' : 'none',
      speedometer: afterAngles.has('speedometer') ? 'readable' : 'unreadable',
      newDamage: damage ? 'detected' : 'none_detected',
      condition: damage ? 'fair' : 'good',
      differences,
      verdict: damage || missing.length ? 'review_required' : 'passed',
    };
  },
};
