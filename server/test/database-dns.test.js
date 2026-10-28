import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { configureDevelopmentMongoDns } from '../src/config/database.js';

describe('development MongoDB DNS configuration', () => {
  it('sets Google DNS before the development SRV connection path', () => {
    let configuredServers;
    const applied = configureDevelopmentMongoDns({
      nodeEnv: 'development',
      setDnsServers: (servers) => { configuredServers = servers; },
    });

    assert.equal(applied, true);
    assert.deepEqual(configuredServers, ['8.8.8.8', '8.8.4.4']);
  });

  it('does not override DNS in production or test environments', () => {
    for (const nodeEnv of ['production', 'test']) {
      let calls = 0;
      const applied = configureDevelopmentMongoDns({
        nodeEnv,
        setDnsServers: () => { calls += 1; },
      });

      assert.equal(applied, false);
      assert.equal(calls, 0);
    }
  });
});
