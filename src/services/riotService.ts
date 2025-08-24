export type SpecificRegion =
  | 'BR1'
  | 'EUN1'
  | 'EUW1'
  | 'JP1'
  | 'KR'
  | 'LA1'
  | 'LA2'
  | 'NA1'
  | 'OC1'
  | 'TR1'
  | 'RU'
  | 'PH2'
  | 'SG2'
  | 'TH2'
  | 'TW2'
  | 'VN2';

export type SuperRegion = 'americas' | 'europe' | 'asia' | 'sea';

// Legacy interface - no longer needed since we use cloud functions
export interface RiotConfig {
  apiKey: string;
}

const REGION_TO_SUPER: Record<SpecificRegion, SuperRegion> = {
  BR1: 'americas',
  EUN1: 'europe',
  EUW1: 'europe',
  JP1: 'asia',
  KR: 'asia',
  LA1: 'americas',
  LA2: 'americas',
  NA1: 'americas',
  OC1: 'sea',
  TR1: 'europe',
  RU: 'europe',
  PH2: 'sea',
  SG2: 'sea',
  TH2: 'sea',
  TW2: 'sea',
  VN2: 'sea',
};

// Legacy configuration - no longer needed with cloud functions
let config: RiotConfig | null = null;

// Legacy function - kept for backward compatibility but not required
export function configureRiotService(newConfig: RiotConfig) {
  config = newConfig;
  console.log('⚠️ configureRiotService is deprecated. Riot API calls now use secure cloud functions.');
}

export function getSuperRegion(from: SpecificRegion): SuperRegion {
  return REGION_TO_SUPER[from];
}

// Import cloud functions
import { resolveSummonerId as resolveSummonerIdCF, getActiveGameStatus as getActiveGameStatusCF } from '@/config/firebase';

export function parseRiotId(
  riotId: string,
): { gameName: string; tagLine: string } | null {
  const idx = riotId.indexOf('#');
  if (idx <= 0 || idx === riotId.length - 1) return null;
  const gameName = riotId.slice(0, idx).trim();
  const tagLine = riotId.slice(idx + 1).trim();
  if (!gameName || !tagLine) return null;
  return { gameName, tagLine };
}

// Secure cloud function implementation
export async function resolveSummonerId(
  riotId: string,
  region: SpecificRegion,
): Promise<{ puuid: string; summonerId: string }> {
  try {
    const result = await resolveSummonerIdCF({ riotId, region });
    return {
      puuid: result.data.puuid,
      summonerId: result.data.summonerId,
    };
  } catch (error: any) {
    console.error('Riot API error:', error);
    
    // Handle Firebase Functions errors
    if (error?.code === 'functions/not-found') {
      throw new Error('Summoner not found');
    }
    if (error?.code === 'functions/permission-denied') {
      throw new Error('API key invalid or expired');
    }
    if (error?.code === 'functions/resource-exhausted') {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    if (error?.code === 'functions/unauthenticated') {
      throw new Error('You must be signed in to use this feature');
    }
    
    throw new Error(error?.message || 'Failed to resolve summoner ID');
  }
}

export async function getActiveGameStatus(
  puuid: string,
  region: SpecificRegion,
): Promise<{ inGame: boolean; elapsedMinutes?: number; gameMode?: string; gameType?: string }> {
  try {
    const result = await getActiveGameStatusCF({ puuid, region });
    return result.data;
  } catch (error: any) {
    console.error('Riot API error:', error);
    
    // Handle Firebase Functions errors
    if (error?.code === 'functions/permission-denied') {
      throw new Error('API key invalid or expired');
    }
    if (error?.code === 'functions/resource-exhausted') {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    if (error?.code === 'functions/unauthenticated') {
      throw new Error('You must be signed in to use this feature');
    }
    
    throw new Error(error?.message || 'Failed to get game status');
  }
}
