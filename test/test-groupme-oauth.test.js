const axios = require('axios');
const nock = require('nock');

describe('GroupMe OAuth flow (read-only)', () => {
  const STAGING_BASE = 'https://crokodial-api-staging-02dd9c87e429.herokuapp.com';
  const CLIENT_ID = '6sdc8GOrrAhoOmTAkdVjArldmIfHfnJh5FivtUulrGEgXw66';
  const REDIRECT_URI = 'https://crokodial.com/groupme/callback';

  it('returns authUrl containing client_id, redirect_uri, state', async () => {
    // Call initiate endpoint with dummy userId
    const resp = await axios.post(`${STAGING_BASE}/api/groupme/oauth/initiate`, {
      userId: 'jest-test-user'
    }, { validateStatus: () => true });

    expect(resp.status).toBe(200);
    const { authUrl, state } = resp.data.data || resp.data;
    expect(typeof authUrl).toBe('string');
    expect(authUrl).toContain(`client_id=${CLIENT_ID}`);
    expect(authUrl).toContain(encodeURIComponent(REDIRECT_URI));
    expect(authUrl).toContain(`state=${state}`);
    expect(state).toBeDefined();
  });

  it('code exchange succeeds (mocked)', async () => {
    // Arrange mock for access_token exchange
    const CODE = 'dummy_code';
    const TOKEN = 'dummy_token_123';
    nock('https://api.groupme.com')
      .post('/oauth/access_token', {
        client_id: CLIENT_ID,
        code: CODE,
      })
      .reply(200, { access_token: TOKEN });

    const res = await axios.post(`${STAGING_BASE}/api/groupme/oauth/callback`, {
      code: CODE,
      state: Buffer.from(JSON.stringify({ userId: 'jest-test-user', timestamp: Date.now() })).toString('base64')
    }, { validateStatus: () => true });

    expect(res.status).toBe(200);
    nock.cleanAll();
  });

  it('code exchange failure surfaces error (mocked)', async () => {
    const CODE = 'bad_code';
    nock('https://api.groupme.com')
      .post('/oauth/access_token')
      .reply(400, { error: 'invalid_code' });

    const resp = await axios.post(`${STAGING_BASE}/api/groupme/oauth/callback`, {
      code: CODE,
      state: Buffer.from(JSON.stringify({ userId: 'jest-test-user', timestamp: Date.now() })).toString('base64')
    }, { validateStatus: () => true });

    expect(resp.status).toBe(500);
    nock.cleanAll();
  });
}); 