import Constants from 'expo-constants';

export function getRiotApiKey(): string | undefined {
  try {
    const extra: any =
      (Constants as any)?.expoConfig?.extra ||
      (Constants as any)?.manifest?.extra ||
      {};
    const key = extra?.RIOT_API_KEY || extra?.riotApiKey;
    if (typeof key === 'string' && key.trim().length > 0) return key.trim();
    // Allow env for Jest/Node tests
    if (typeof process !== 'undefined' && (process as any)?.env?.RIOT_API_KEY) {
      return (process as any).env.RIOT_API_KEY as string;
    }
  } catch {}
  return undefined;
}
