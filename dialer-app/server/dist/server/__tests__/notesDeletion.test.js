"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const globals_2 = require("@jest/globals");
// Mock shared config ahead of controller import
globals_1.jest.mock('@shared/config/queryConfig', () => ({
    US_STATES: [],
    ALLOWED_DISPOSITIONS: [],
    PIPELINE_SOURCES: {},
}), { virtual: true });
// --- Mock LeadModel ---
const mockFindById = globals_1.jest.fn();
const mockFindOneAndUpdate = globals_1.jest.fn();
globals_1.jest.mock('../src/models/Lead', () => {
    return {
        __esModule: true,
        default: {
            findById: (...args) => mockFindById(...args),
            findOneAndUpdate: (...args) => mockFindOneAndUpdate(...args),
        },
    };
});
// eslint-disable-next-line @typescript-eslint/no-var-requires
const leadsController = require('../src/controllers/leads.controller.ts');
const updateLead = leadsController.updateLead;
// Helper to build mock req/res
function buildMocks(body = {}) {
    const req = {
        params: { id: 'abc123' },
        body,
        user: { id: 'tester', role: 'admin' },
    };
    const resJson = globals_1.jest.fn();
    const resStatus = globals_1.jest.fn().mockReturnValue({ json: resJson });
    const res = {
        json: resJson,
        status: resStatus,
    };
    return { req, res, resJson, resStatus };
}
(0, globals_2.describe)('updateLead – empty notes deletion', () => {
    (0, globals_2.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        // Existing lead stub
        mockFindById.mockResolvedValue({ _id: 'abc123', notes: 'OLD', disposition: '', toObject: () => ({ _id: 'abc123', notes: '' }) });
        // Simulate DB returning updated object with notes ""
        mockFindOneAndUpdate.mockResolvedValue({ _id: 'abc123', notes: '', toObject: () => ({ _id: 'abc123', notes: '' }) });
    });
    (0, globals_2.it)('persists empty string notes instead of dropping the field', async () => {
        const { req, res } = buildMocks({ notes: '' });
        await updateLead(req, res);
        // Ensure DB update was called with $set.notes = ""
        (0, globals_2.expect)(mockFindOneAndUpdate).toHaveBeenCalledWith({ _id: 'abc123' }, { $set: { notes: '' } }, globals_2.expect.any(Object));
    });
});
