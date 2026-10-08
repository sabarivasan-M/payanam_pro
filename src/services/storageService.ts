import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import { config } from '@/constants/config';
import { getSupabase } from '@/lib/supabase';
import { uuid } from '@/lib/id';

/**
 * Image storage.
 * DEMO: images are copied into the app's private document directory (never public).
 * SUPABASE: images are uploaded to the matching bucket under `<ownerId>/...`.
 *   Stored reference format: `sb://<bucket>/<path>`.
 */
export type Bucket =
  | 'profile-images'
  | 'bike-images'
  | 'documents'
  | 'inspection-images'
  | 'selfies'
  | 'return-images';

/** Buckets whose files may be served via public URL. Everything else uses short-lived signed URLs. */
const PUBLIC_BUCKETS: Bucket[] = ['bike-images', 'profile-images'];

export const storageService = {
  async saveImage(localUri: string, bucket: Bucket, ownerId: string): Promise<string> {
    if (config.DEMO_MODE) return saveLocal(localUri, bucket);
    const path = `${ownerId}/${uuid()}.jpg`;
    const body = await (await fetch(localUri)).arrayBuffer();
    const { error } = await getSupabase().storage.from(bucket).upload(path, body, {
      contentType: 'image/jpeg',
      upsert: false,
    });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    return `sb://${bucket}/${path}`;
  },

  /** Turn a stored reference into a displayable URL */
  async resolveUrl(ref: string): Promise<string> {
    if (!ref.startsWith('sb://')) return ref;
    const [, rest] = ref.split('sb://');
    const slash = rest.indexOf('/');
    const bucket = rest.slice(0, slash) as Bucket;
    const path = rest.slice(slash + 1);
    const storage = getSupabase().storage.from(bucket);
    if (PUBLIC_BUCKETS.includes(bucket)) return storage.getPublicUrl(path).data.publicUrl;
    const { data, error } = await storage.createSignedUrl(path, 60 * 30);
    if (error || !data) throw new Error('Could not load image.');
    return data.signedUrl;
  },
};

async function saveLocal(uri: string, bucket: Bucket): Promise<string> {
  // Web previews keep the blob/data URI as-is.
  if (Platform.OS === 'web') return uri;
  const dir = new Directory(Paths.document, 'payanam', bucket);
  if (!dir.exists) dir.create({ intermediates: true });
  const ext = uri.split('?')[0].split('.').pop()?.toLowerCase();
  const dest = new File(dir, `${uuid()}.${ext && ext.length <= 4 ? ext : 'jpg'}`);
  await new File(uri).copy(dest);
  return dest.uri;
}
