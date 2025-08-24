// DEPRECATED: Riot API key is now handled securely via cloud functions
// This file is kept for backward compatibility but is no longer used

import Constants from 'expo-constants';

/**
 * @deprecated Riot API key is now handled securely via Firebase Cloud Functions.
 * This function is kept for backward compatibility but should not be used.
 * All Riot API calls now go through secure cloud functions.
 */
export function getRiotApiKey(): string | undefined {
  console.warn('⚠️ getRiotApiKey is deprecated. Riot API calls now use secure cloud functions.');
  
  // For tests only - check environment variables
  if (typeof process !== 'undefined' && (process as any)?.env?.RIOT_API_KEY) {
    return (process as any).env.RIOT_API_KEY as string;
  }
  
  return undefined;
}


