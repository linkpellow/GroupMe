"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const textdripService_1 = require("../src/services/textdripService");
describe('TextdripService token override', () => {
    it('uses the override token when provided', () => {
        const override = 'OVERRIDE_TOKEN';
        const service = (0, textdripService_1.createTextdripService)(override);
        expect(service.api.defaults.headers.Authorization).toBe(`Bearer ${override}`);
    });
});
