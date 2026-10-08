import type { Bike, FinalBill, PlanType, RentalPlan } from '@/types/models';

/**
 * All rental pricing lives here so UI, services and tests share one source of truth.
 *
 * Assumptions (documented in docs/ARCHITECTURE.md):
 *  - Hourly: hourlyPrice × hours, 12 km included per hour (capped at the daily allowance).
 *  - Half day: 6 hours at 60% of the day price, half of the daily km allowance.
 *  - Full day: 24 hours at the day price with the bike's daily km allowance.
 *  - Custom: N days (1–7) at day price × N with N × daily km allowance.
 */

export const HALF_DAY_HOURS = 6;
export const HALF_DAY_FACTOR = 0.6;
export const HOURLY_KM_PER_HOUR = 12;
export const MAX_HOURLY_HOURS = 5;
export const MAX_CUSTOM_DAYS = 7;
/** Platform fee kept by PAYANAM from each completed rental */
export const PLATFORM_FEE_RATE = 0.1;
/** Warn when usage reaches this share of the included limit */
export const USAGE_WARNING_THRESHOLD = 0.8;

type PricingInput = Pick<
  Bike,
  'dailyPrice' | 'hourlyPrice' | 'includedKmPerDay' | 'extraKmRate' | 'extraMinuteRate' | 'securityDeposit'
>;

export function buildRentalPlan(bike: PricingInput, planType: PlanType, units = 1): RentalPlan {
  const common = {
    extraKmRate: bike.extraKmRate,
    extraMinuteRate: bike.extraMinuteRate,
    securityDeposit: bike.securityDeposit,
  };
  switch (planType) {
    case 'hourly': {
      const hours = clamp(Math.round(units), 1, MAX_HOURLY_HOURS);
      return {
        ...common,
        planType,
        units: hours,
        label: `${hours} hour${hours > 1 ? 's' : ''}`,
        baseAmount: bike.hourlyPrice * hours,
        includedDistanceKm: Math.min(hours * HOURLY_KM_PER_HOUR, bike.includedKmPerDay),
        includedDurationMinutes: hours * 60,
      };
    }
    case 'half_day':
      return {
        ...common,
        planType,
        units: 1,
        label: `Half day (${HALF_DAY_HOURS} hrs)`,
        baseAmount: Math.round(bike.dailyPrice * HALF_DAY_FACTOR),
        includedDistanceKm: Math.round(bike.includedKmPerDay / 2),
        includedDurationMinutes: HALF_DAY_HOURS * 60,
      };
    case 'full_day':
      return {
        ...common,
        planType,
        units: 1,
        label: '1 day',
        baseAmount: bike.dailyPrice,
        includedDistanceKm: bike.includedKmPerDay,
        includedDurationMinutes: 24 * 60,
      };
    case 'custom': {
      const days = clamp(Math.round(units), 1, MAX_CUSTOM_DAYS);
      return {
        ...common,
        planType,
        units: days,
        label: `${days} day${days > 1 ? 's' : ''}`,
        baseAmount: bike.dailyPrice * days,
        includedDistanceKm: bike.includedKmPerDay * days,
        includedDurationMinutes: days * 24 * 60,
      };
    }
  }
}

/** Amount collected upfront: base rental + refundable deposit */
export function estimateTotal(plan: RentalPlan): number {
  return plan.baseAmount + plan.securityDeposit;
}

export interface ExtraCharges {
  extraKm: number;
  extraMinutes: number;
  extraDistanceCharge: number;
  extraTimeCharge: number;
  totalExtraCharge: number;
}

/**
 * extraDistanceCharge = max(0, actualDistance - includedDistance) × extraKmRate
 * extraTimeCharge     = max(0, actualDuration - includedDuration) × extraMinuteRate
 */
export function calculateExtraCharges(
  plan: Pick<RentalPlan, 'includedDistanceKm' | 'includedDurationMinutes' | 'extraKmRate' | 'extraMinuteRate'>,
  actualDistanceKm: number,
  actualDurationMinutes: number,
): ExtraCharges {
  const extraKm = Math.max(0, Math.ceil(actualDistanceKm - plan.includedDistanceKm));
  const extraMinutes = Math.max(0, Math.ceil(actualDurationMinutes - plan.includedDurationMinutes));
  const extraDistanceCharge = extraKm * plan.extraKmRate;
  const extraTimeCharge = extraMinutes * plan.extraMinuteRate;
  return {
    extraKm,
    extraMinutes,
    extraDistanceCharge,
    extraTimeCharge,
    totalExtraCharge: extraDistanceCharge + extraTimeCharge,
  };
}

export interface UsageStatus {
  distanceRatio: number;
  timeRatio: number;
  remainingKm: number;
  remainingMinutes: number;
  distanceWarning: boolean;
  timeWarning: boolean;
  distanceExceeded: boolean;
  timeExceeded: boolean;
}

export function getUsageStatus(
  plan: Pick<RentalPlan, 'includedDistanceKm' | 'includedDurationMinutes'>,
  distanceKm: number,
  durationMinutes: number,
): UsageStatus {
  const distanceRatio = plan.includedDistanceKm > 0 ? distanceKm / plan.includedDistanceKm : 0;
  const timeRatio = plan.includedDurationMinutes > 0 ? durationMinutes / plan.includedDurationMinutes : 0;
  return {
    distanceRatio,
    timeRatio,
    remainingKm: Math.max(0, plan.includedDistanceKm - distanceKm),
    remainingMinutes: Math.max(0, plan.includedDurationMinutes - durationMinutes),
    distanceWarning: distanceRatio >= USAGE_WARNING_THRESHOLD,
    timeWarning: timeRatio >= USAGE_WARNING_THRESHOLD,
    distanceExceeded: distanceRatio > 1,
    timeExceeded: timeRatio > 1,
  };
}

export function buildFinalBill(
  plan: RentalPlan,
  actualDistanceKm: number,
  actualDurationMinutes: number,
  damageCharge: number,
  depositRefunded: boolean,
): FinalBill {
  const extras = calculateExtraCharges(plan, actualDistanceKm, actualDurationMinutes);
  return {
    baseAmount: plan.baseAmount,
    actualDistanceKm: round1(actualDistanceKm),
    actualDurationMinutes: Math.round(actualDurationMinutes),
    extraKm: extras.extraKm,
    extraKmCharge: extras.extraDistanceCharge,
    extraMinutes: extras.extraMinutes,
    extraTimeCharge: extras.extraTimeCharge,
    damageCharge,
    total: plan.baseAmount + extras.totalExtraCharge + damageCharge,
    securityDeposit: plan.securityDeposit,
    depositStatus: depositRefunded ? 'REFUNDED' : 'REFUNDABLE',
    generatedAt: new Date().toISOString(),
  };
}

export const partnerShare = (amount: number) => Math.round(amount * (1 - PLATFORM_FEE_RATE));

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const round1 = (n: number) => Math.round(n * 10) / 10;
