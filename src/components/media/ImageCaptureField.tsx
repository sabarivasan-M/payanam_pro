import React, { useState } from 'react';
import { ActivityIndicator, Image, Linking, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Button } from '@/components/ui/Button';
import { StoredImage } from '@/components/ui/Misc';
import { Text } from '@/components/ui/Text';
import { config } from '@/constants/config';
import { getDemoImageUri, type DemoImageKind } from '@/lib/demoImages';
import { storageService, type Bucket } from '@/services/storageService';
import { useTheme } from '@/theme/ThemeProvider';
import { errorMessage } from '@/utils/errors';

type Source = 'camera' | 'gallery' | 'demo';

interface Props {
  label: string;
  hint?: string;
  /** Stored image reference (after Confirm) */
  value: string | null;
  onChange: (ref: string | null) => void;
  bucket: Bucket;
  ownerId: string;
  cameraType?: 'front' | 'back';
  aspect?: [number, number];
  variant?: 'card' | 'row';
  required?: boolean;
  disabled?: boolean;
  /** false → return the local URI on confirm; the caller uploads later (e.g. before sign-up completes) */
  upload?: boolean;
  /** DEMO ONLY: which synthetic test image "Use test image" inserts */
  demoImage?: DemoImageKind;
}

/**
 * Every image capture in PAYANAM goes through this component:
 * Take Photo / Upload from Gallery → Preview → Retake / Remove / Confirm → upload.
 * Handles permission denial, cancellation, upload failure and retry.
 */
export function ImageCaptureField({
  label,
  hint,
  value,
  onChange,
  bucket,
  ownerId,
  cameraType = 'back',
  aspect,
  variant = 'card',
  required,
  disabled,
  upload = true,
  demoImage,
}: Props) {
  const t = useTheme();
  const [pending, setPending] = useState<string | null>(null);
  const [lastSource, setLastSource] = useState<Source>('camera');
  const [busy, setBusy] = useState<'picking' | 'uploading' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<{ source: Source; canAskAgain: boolean } | null>(null);

  async function pick(source: Source) {
    setError(null);
    setPermission(null);
    setLastSource(source);
    setBusy('picking');
    try {
      if (source === 'demo') {
        const kind: DemoImageKind =
          demoImage ?? (cameraType === 'front' ? 'selfie' : bucket === 'documents' ? 'id' : /speedo/i.test(label) ? 'speedometer' : 'bike');
        setPending(await getDemoImageUri(kind));
        return;
      }
      const perm =
        source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setPermission({ source, canAskAgain: perm.canAskAgain });
        return;
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: 'images',
        quality: 0.7,
        allowsEditing: !!aspect,
        aspect,
        cameraType: cameraType === 'front' ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
      };
      const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled && result.assets?.[0]?.uri) setPending(result.assets[0].uri);
    } catch (e) {
      setError(source === 'camera' ? `Camera unavailable: ${errorMessage(e)}` : errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function confirmPending() {
    if (!pending) return;
    setBusy('uploading');
    setError(null);
    try {
      const ref = upload ? await storageService.saveImage(pending, bucket, ownerId) : pending;
      onChange(ref);
      setPending(null);
    } catch (e) {
      setError(errorMessage(e, 'Upload failed. Check your connection and retry.'));
    } finally {
      setBusy(null);
    }
  }

  const status = value ? 'done' : pending ? 'preview' : 'empty';
  const isRow = variant === 'row';
  const thumbSize = isRow ? 64 : undefined;

  const preview =
    status === 'preview' ? (
      <Image source={{ uri: pending! }} style={isRow ? { width: 64, height: 64, borderRadius: 12 } : { width: '100%', height: 190, borderRadius: t.radius.lg }} />
    ) : status === 'done' ? (
      <StoredImage uri={value} style={isRow ? { width: 64, height: 64, borderRadius: 12 } : { width: '100%', height: 190, borderRadius: t.radius.lg }} />
    ) : (
      <View
        style={{
          width: thumbSize ?? '100%',
          height: isRow ? 64 : 120,
          borderRadius: isRow ? 12 : t.radius.lg,
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: t.colors.borderStrong,
          backgroundColor: t.colors.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
        }}
      >
        {busy === 'picking' ? (
          <ActivityIndicator color={t.colors.primary} />
        ) : (
          <Ionicons name={cameraType === 'front' ? 'person-circle-outline' : 'camera-outline'} size={isRow ? 24 : 30} color={t.colors.textMuted} />
        )}
        {!isRow ? (
          <Text variant="caption" color="textMuted">
            No photo yet
          </Text>
        ) : null}
      </View>
    );

  const actions = (
    <View style={{ gap: 8 }}>
      {status === 'empty' ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button title="Take Photo" icon="camera" size="sm" onPress={() => pick('camera')} disabled={disabled || !!busy} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Gallery" icon="images-outline" size="sm" variant="outline" onPress={() => pick('gallery')} disabled={disabled || !!busy} />
          </View>
        </View>
      ) : null}
      {status === 'empty' && config.DEMO_MODE ? (
        <Button title="Use test image (demo)" icon="flask-outline" size="sm" variant="ghost" onPress={() => pick('demo')} disabled={disabled || !!busy} />
      ) : null}
      {status === 'preview' ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button title="Retake" icon="refresh" size="sm" variant="outline" onPress={() => pick(lastSource)} disabled={!!busy} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Remove" icon="trash-outline" size="sm" variant="danger" onPress={() => setPending(null)} disabled={!!busy} />
          </View>
          <View style={{ flex: 1.2 }}>
            <Button title="Confirm" icon="checkmark" size="sm" onPress={confirmPending} loading={busy === 'uploading'} />
          </View>
        </View>
      ) : null}
      {status === 'done' && !disabled ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button title="Retake" icon="camera-reverse-outline" size="sm" variant="outline" onPress={() => pick('camera')} disabled={!!busy} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Delete" icon="trash-outline" size="sm" variant="danger" onPress={() => onChange(null)} disabled={!!busy} />
          </View>
        </View>
      ) : null}
    </View>
  );

  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: isRow ? 1 : undefined }}>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">
          {label}
          {required ? <Text color="danger"> *</Text> : null}
        </Text>
        {hint ? (
          <Text variant="caption" color="textSecondary">
            {hint}
          </Text>
        ) : null}
      </View>
      {status === 'done' ? <Ionicons name="checkmark-circle" size={22} color={t.colors.success} /> : null}
      {status === 'preview' ? (
        <Text variant="caption" color="warning">
          Not confirmed
        </Text>
      ) : null}
    </View>
  );

  const feedback = (
    <>
      {permission ? (
        <View style={{ padding: 12, borderRadius: t.radius.md, backgroundColor: t.colors.warningSoft, gap: 8 }}>
          <Text variant="small">
            {permission.source === 'camera' ? 'Camera' : 'Photo library'} access is off. PAYANAM needs it to capture this photo.
          </Text>
          <Button
            title={permission.canAskAgain ? 'Allow access' : 'Open settings'}
            size="sm"
            variant="outline"
            fullWidth={false}
            onPress={() => (permission.canAskAgain ? pick(permission.source) : Linking.openSettings())}
          />
        </View>
      ) : null}
      {error ? (
        <View style={{ padding: 12, borderRadius: t.radius.md, backgroundColor: t.colors.dangerSoft, gap: 8 }}>
          <Text variant="small" color="danger">
            {error}
          </Text>
          <Button title="Retry" icon="refresh" size="sm" variant="outline" fullWidth={false} onPress={() => (pending ? confirmPending() : pick(lastSource))} />
        </View>
      ) : null}
    </>
  );

  if (isRow) {
    return (
      <View style={{ gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.colors.border }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          {preview}
          {header}
        </View>
        {actions}
        {feedback}
      </View>
    );
  }

  return (
    <View style={{ gap: 10, padding: 14, borderRadius: t.radius.xl, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.border }}>
      {header}
      {preview}
      {actions}
      {feedback}
    </View>
  );
}
