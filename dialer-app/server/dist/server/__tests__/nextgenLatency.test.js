"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const supertest_1 = __importDefault(require("supertest"));
const ws_1 = __importDefault(require("ws"));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const app = require('../src/index');
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * This test measures the time from webhook POST → WebSocket notification.
 * It passes if latency < 1500 ms.
 */
(0, globals_1.describe)('NextGen webhook latency', () => {
    const TEST_TIMEOUT = 10000; // 10 s overall
    let token;
    let serverUrl;
    (0, globals_1.beforeAll)(async () => {
        if (mongoose_1.default.connection.readyState === 0 && process.env.MONGO_URI) {
            await mongoose_1.default.connect(process.env.MONGO_URI, {});
        }
        // create admin or reuse existing token-less WS (public). For e2e we assume unauth WS allowed.
        serverUrl = `ws://localhost:${process.env.PORT || 3005}`;
    });
    (0, globals_1.afterAll)(async () => {
        await mongoose_1.default.disconnect();
    });
    (0, globals_1.it)('should receive WebSocket notification under 1500ms', (done) => {
        const ws = new ws_1.default(serverUrl);
        let authenticated = false;
        ws.on('open', () => {
            // no auth needed if server accepts unauth for notifications; otherwise send token
            authenticated = true;
            // Send webhook POST after WS ready
            sendWebhook();
        });
        let latencyMs;
        const start = Date.now();
        ws.on('message', (data) => {
            const msg = JSON.parse(data.toString());
            if (msg?.type === 'new_lead_notification') {
                latencyMs = Date.now() - start;
                ws.close();
                try {
                    (0, globals_1.expect)(latencyMs).toBeLessThan(1500);
                    done();
                }
                catch (err) {
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
            (0, supertest_1.default)(app)
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
    }, TEST_TIMEOUT);
});
