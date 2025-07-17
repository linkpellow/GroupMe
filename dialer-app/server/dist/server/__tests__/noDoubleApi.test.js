"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore – dev-only type resolution
const glob_1 = require("glob");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
// Jest globals provided via ts-jest config
describe('API path hygiene', () => {
    it('does not contain hard-coded "/api/api" paths', () => {
        // Scan client src files
        const files = (0, glob_1.globSync)(path_1.default.join(__dirname, '../../../client/src/**/*.{ts,tsx}'));
        const offenders = [];
        files.forEach((file) => {
            const content = (0, fs_1.readFileSync)(file, 'utf-8');
            if (content.includes('/api/api')) {
                offenders.push(path_1.default.relative(process.cwd(), file));
            }
        });
        expect(offenders).toEqual([]);
    });
});
