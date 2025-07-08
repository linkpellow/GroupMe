// @ts-nocheck
import { jest } from '@jest/globals';
import { expect, describe, it, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import WebSocket from 'ws';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const app = require('../src/index');
import mongoose from 'mongoose';

/**
 * This test measures the time from webhook POST → WebSocket notification.
 * It passes if latency < 1500 ms.
 */
describe('NextGen webhook latency', () => {
  const TEST_TIMEOUT = 10000; // 10 s overall

  let token: string;
  let serverUrl: string;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0 && process.env.MONGO_URI) {
      await mongoose.connect(process.env.MONGO_URI, {});
    }
    // create admin or reuse existing token-less WS (public). For e2e we assume unauth WS allowed.
    serverUrl = `ws://localhost:${process.env.PORT || 3005}`;
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it(
    'should receive WebSocket notification under 1500ms',
    (done) => {
      const ws = new WebSocket(serverUrl);
      let authenticated = false;

      ws.on('open', () => {
        // no auth needed if server accepts unauth for notifications; otherwise send token
        authenticated = true;
        // Send webhook POST after WS ready
        sendWebhook();
      });

      let latencyMs: number | undefined;
      const start = Date.now();

      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg?.type === 'new_lead_notification') {
          latencyMs = Date.now() - start;
          ws.close();
          try {
            expect(latencyMs).toBeLessThan(1500);
            done();
          } catch (err) {
            done(err);
          }
        }
      });

      ws.on('error', (err) => done(err));

      const sendWebhook = () => {
        const payload = {
          first_name: 'Latency',
          last_name: 'Test',
          email: `latency${Date.now()}@example.com`,
          phone: '5551234567',
        };
        request(app)
          .post('/api/webhooks/nextgen')
          .set('sid', process.env.NEXTGEN_SID || 'dummy')
          .set('apikey', process.env.NEXTGEN_API_KEY || 'dummy')
          .send(payload)
          .then((res) => {
            if (res.status >= 400) {
              done(new Error(`Webhook failed: ${res.status}`));
            }
          })
          .catch((err) => done(err));
      };
    },
    TEST_TIMEOUT,
  );
}); 