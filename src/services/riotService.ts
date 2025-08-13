export type SpecificRegion =
  | 'BR1' | 'EUN1' | 'EUW1' | 'JP1' | 'KR' | 'LA1' | 'LA2' | 'NA1'
  | 'OC1' | 'TR1' | 'RU' | 'PH2' | 'SG2' | 'TH2' | 'TW2' | 'VN2';

export type SuperRegion = 'americas' | 'europe' | 'asia' | 'sea';

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

let config: RiotConfig | null = null;

export function configureRiotService(newConfig: RiotConfig) {
  config = newConfig;
}

export function getSuperRegion(from: SpecificRegion): SuperRegion {
  return REGION_TO_SUPER[from];
}

export function parseRiotId(riotId: string): { gameName: string; tagLine: string } | null {
  const idx = riotId.indexOf('#');
  if (idx <= 0 || idx === riotId.length - 1) return null;
  const gameName = riotId.slice(0, idx).trim();
  const tagLine = riotId.slice(idx + 1).trim();
  if (!gameName || !tagLine) return null;
  return { gameName, tagLine };
}

async function fetchJson(url: string) {
  if (!config?.apiKey) throw new Error('Riot API key is not configured');
  const resp = await fetch(url, { headers: { 'X-Riot-Token': config.apiKey } as any });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`HTTP ${resp.status}: ${text || 'Request failed'}`);
  }
  return resp.json();
}

export async function resolveSummonerId(riotId: string, region: SpecificRegion): Promise<{ puuid: string; summonerId: string }> {
  const parsed = parseRiotId(riotId);
  if (!parsed) throw new Error('Invalid Riot ID format. Expected gameName#tagLine');
  const { gameName, tagLine } = parsed;
  const superRegion = getSuperRegion(region);
  const hostSuper = String(superRegion).toLowerCase();
  const hostRegion = String(region).toLowerCase();
  const accountUrl = `https://${hostSuper}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  const acc = await fetchJson(accountUrl);
  const puuid = acc.puuid as string;
  if (!puuid) throw new Error('PUUID not found for Riot ID');
  // Resolve by PUUID (preferred). Note: some keys may mask id; return empty if unavailable.
  const summonerByPuuidUrl = `https://${hostRegion}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`;
  const summByPuuid = await fetchJson(summonerByPuuidUrl);
  const summonerId = typeof summByPuuid?.id === 'string' ? String(summByPuuid.id) : '';
  return { puuid, summonerId };
}

export async function getActiveGameStatus(puuid: string, region: SpecificRegion): Promise<{ inGame: boolean; elapsedMinutes?: number }> {
  if (!config?.apiKey) throw new Error('Riot API key is not configured');
  const hostRegion = String(region).toLowerCase();
  const url = `https://${hostRegion}.api.riotgames.com/lol/spectator/v5/active-games/by-puuid/${encodeURIComponent(puuid)}`;
  const resp = await fetch(url, { headers: { 'X-Riot-Token': config.apiKey } as any });
  if (resp.status === 404) return { inGame: false };
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`HTTP ${resp.status}: ${text || 'Spectator request failed'}`);
  }
  const data = await resp.json();
  const start = typeof data.gameStartTime === 'number' ? data.gameStartTime : Date.now();
  const elapsedMinutes = Math.round((Date.now() - start) / 60000);
  return { inGame: true, elapsedMinutes };
}


