import React from 'react';
import { View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { KeyValue, ProgressBar } from '@/components/ui/Misc';
import { Banner } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import type { LiveUsage } from '@/services/trackingService';
import { useTheme } from '@/theme/ThemeProvider';
import type { RentalPlan, RentalSession } from '@/types/models';
import { formatClock, formatDateTime, formatDuration, formatINR, formatTime } from '@/utils/format';
import { calculateExtraCharges, getUsageStatus } from '@/utils/pricing';

/** Timer + distance/time limits + warnings, shared by customer and partner views. */
export function LiveRentalPanel({ plan, session, usage }: { plan: RentalPlan; session: RentalSession; usage: LiveUsage }) {
  const t = useTheme();
  const status = getUsageStatus(plan, usage.distanceKm, usage.durationMinutes);
  const extras = calculateExtraCharges(plan, usage.distanceKm, usage.durationMinutes);
  const endsAt = new Date(new Date(session.startedAt).getTime() + plan.includedDurationMinutes * 60000);
  const distTone = status.distanceExceeded ? 'danger' : status.distanceWarning ? 'warning' : 'primary';
  const timeTone = status.timeExceeded ? 'danger' : status.timeWarning ? 'warning' : 'primary';

  return (
    <View style={{ gap: 12 }}>
      <View style={{ borderRadius: t.radius.xxl, backgroundColor: t.colors.primary, padding: 20, alignItems: 'center' }}>
        <Text variant="overline" style={{ color: t.colors.accent }}>
          RENTAL TIME
        </Text>
        <Text style={{ fontFamily: t.fonts.bold, fontSize: 46, lineHeight: 54, letterSpacing: 2, color: t.colors.onPrimary, fontVariant: ['tabular-nums'] }}>
          {formatClock(usage.elapsedSeconds)}
        </Text>
        <Text variant="small" style={{ color: t.colors.onPrimary, opacity: 0.85 }}>
          Rental ending {endsAt.toDateString() === new Date().toDateString() ? formatTime(endsAt) : formatDateTime(endsAt)}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Card style={{ flex: 1 }}>
          <Text variant="caption" color="textMuted">
            Distance travelled
          </Text>
          <Text variant="h1">{usage.distanceKm.toFixed(1)} km</Text>
          <View style={{ marginTop: 8 }}>
            <ProgressBar value={status.distanceRatio} tone={distTone} />
          </View>
          <Text variant="caption" color="textSecondary" style={{ marginTop: 6 }}>
            Included {plan.includedDistanceKm} km · {status.remainingKm.toFixed(0)} km left
          </Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text variant="caption" color="textMuted">
            Time used
          </Text>
          <Text variant="h1">{formatDuration(usage.durationMinutes)}</Text>
          <View style={{ marginTop: 8 }}>
            <ProgressBar value={status.timeRatio} tone={timeTone} />
          </View>
          <Text variant="caption" color="textSecondary" style={{ marginTop: 6 }}>
            {formatDuration(status.remainingMinutes)} left
          </Text>
        </Card>
      </View>

      {status.distanceWarning ? (
        <Banner
          tone={status.distanceExceeded ? 'danger' : 'warning'}
          icon="speedometer-outline"
          title={status.distanceExceeded ? 'Included distance exceeded' : `You have used ${Math.round(status.distanceRatio * 100)}% of your included distance.`}
          message={`Extra distance will be charged at ${formatINR(plan.extraKmRate)}/km.`}
        />
      ) : null}
      {status.timeWarning ? (
        <Banner
          tone={status.timeExceeded ? 'danger' : 'warning'}
          icon="alarm-outline"
          title={status.timeExceeded ? 'Rental time exceeded' : `Rental ending soon — ${formatDuration(status.remainingMinutes)} left.`}
          message={`Extra time is charged at ${formatINR(plan.extraMinuteRate)}/min.`}
        />
      ) : null}

      {extras.totalExtraCharge > 0 ? (
        <Card tone="accent" elevated={false}>
          <Text variant="smallStrong">Extra charges so far</Text>
          <KeyValue label={`Extra distance (${extras.extraKm} km)`} value={formatINR(extras.extraDistanceCharge)} />
          <KeyValue label={`Extra time (${extras.extraMinutes} min)`} value={formatINR(extras.extraTimeCharge)} />
          <KeyValue label="Total extra" value={formatINR(extras.totalExtraCharge)} strong />
        </Card>
      ) : null}
    </View>
  );
}
