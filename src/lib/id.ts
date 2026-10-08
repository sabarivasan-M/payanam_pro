import * as Crypto from 'expo-crypto';

export const uuid = () => Crypto.randomUUID();

export const nowISO = () => new Date().toISOString();

export async function sha256(input: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);
}

export const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
