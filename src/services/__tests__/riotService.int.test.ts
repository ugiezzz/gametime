import { configureRiotService, resolveSummonerId, getActiveGameStatus } from '@/services/riotService';

// This is an integration-style test that calls Riot APIs. Guard with env var.
const RUN_INTEGRATION = process.env.RUN_RIOT_INT_TESTS === '1';

describe('Riot Service integration', () => {
  if (!RUN_INTEGRATION) {
    it('skipped (set RUN_RIOT_INT_TESTS=1 to run)', () => {
      expect(true).toBe(true);
    });
    return;
  }

  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) {
    throw new Error('RIOT_API_KEY not set for integration test');
  }

  beforeAll(() => {
    configureRiotService({ apiKey });
  });

  it('resolves Summoner ID for provided RiotID and region', async () => {
    const riotId = 'Ugie#1EUNE';
    const region = 'EUN1' as const;
    const { summonerId } = await resolveSummonerId(riotId, region);
    expect(typeof summonerId).toBe('string');
    expect(summonerId.length).toBeGreaterThan(5);
  });

  it('fetches game status for the resolved player by PUUID', async () => {
    const region = 'EUN1' as const;
    const { puuid } = await resolveSummonerId('Ugie#1EUNE', region);
    const status = await getActiveGameStatus(puuid, region);
    expect(typeof status.inGame).toBe('boolean');
    if (status.inGame) {
      expect(typeof status.elapsedMinutes).toBe('number');
    }
  });
});


