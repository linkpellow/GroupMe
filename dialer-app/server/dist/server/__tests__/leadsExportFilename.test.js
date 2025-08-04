"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const globals_2 = require("@jest/globals");
// Mock the shared config module that the controller expects BEFORE requiring the controller
globals_1.jest.mock('@shared/config/queryConfig', () => ({
    US_STATES: [],
    ALLOWED_DISPOSITIONS: [],
    PIPELINE_SOURCES: {},
}), { virtual: true });
// Import the private helper via require since it's not exported
// eslint-disable-next-line @typescript-eslint/no-var-requires
const leadsController = require('../src/controllers/leads.controller.ts');
// Access the function with bracket notation (TypeScript will ignore)
const buildCsvFilename = leadsController.buildCsvFilename;
(0, globals_2.describe)('buildCsvFilename', () => {
    (0, globals_2.it)('creates filename for single disposition & Marketplace source', () => {
        const q = { dispositions: ['Positive Contact'], sources: ['Marketplace'] };
        const name = buildCsvFilename(q);
        (0, globals_2.expect)(name).toBe('CrokodialCSV (Positive Contact, MP).csv');
    });
    (0, globals_2.it)('creates filename for single disposition & NextGen source', () => {
        const q = { dispositions: ['No Contact'], sources: ['NextGen'] };
        const name = buildCsvFilename(q);
        (0, globals_2.expect)(name).toBe('CrokodialCSV (No Contact, NG).csv');
    });
    (0, globals_2.it)('handles multiple dispositions or sources', () => {
        const q = { dispositions: ['No Contact', 'Positive Contact'], sources: ['Marketplace', 'NextGen'] };
        const name = buildCsvFilename(q);
        (0, globals_2.expect)(name).toBe('CrokodialCSV (Multiple, Mixed).csv');
    });
});
