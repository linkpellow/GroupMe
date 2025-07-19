"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nextgenDeduplicationService_1 = require("../src/services/nextgenDeduplicationService");
describe('NextGen Deduplication Service', () => {
    describe('isPremiumListing', () => {
        it('should identify premium listings by product="ad"', () => {
            expect((0, nextgenDeduplicationService_1.isPremiumListing)({ product: 'ad' })).toBe(true);
            expect((0, nextgenDeduplicationService_1.isPremiumListing)({ product: 'data' })).toBe(false);
            expect((0, nextgenDeduplicationService_1.isPremiumListing)({ product: 'other' })).toBe(false);
            expect((0, nextgenDeduplicationService_1.isPremiumListing)({})).toBe(false);
        });
    });
    describe('isMainDataRecord', () => {
        it('should identify main data records by product="data"', () => {
            expect((0, nextgenDeduplicationService_1.isMainDataRecord)({ product: 'data' })).toBe(true);
            expect((0, nextgenDeduplicationService_1.isMainDataRecord)({ product: 'ad' })).toBe(false);
            expect((0, nextgenDeduplicationService_1.isMainDataRecord)({ product: 'other' })).toBe(false);
            expect((0, nextgenDeduplicationService_1.isMainDataRecord)({})).toBe(false);
        });
    });
    describe('getDeduplicationKey', () => {
        it('should prioritize leadId > nextgenId > phone > email', () => {
            expect((0, nextgenDeduplicationService_1.getDeduplicationKey)({ leadId: 'L123', nextgenId: 'N456', phone: '555-1234', email: 'test@example.com' }))
                .toBe('L123');
            expect((0, nextgenDeduplicationService_1.getDeduplicationKey)({ nextgenId: 'N456', phone: '555-1234', email: 'test@example.com' }))
                .toBe('N456');
            expect((0, nextgenDeduplicationService_1.getDeduplicationKey)({ phone: '555-1234', email: 'test@example.com' }))
                .toBe('555-1234');
            expect((0, nextgenDeduplicationService_1.getDeduplicationKey)({ email: 'test@example.com' }))
                .toBe('test@example.com');
            expect((0, nextgenDeduplicationService_1.getDeduplicationKey)({})).toBe(null);
        });
    });
    describe('formatPremiumListingNote', () => {
        it('should format premium listing note correctly', () => {
            const note = (0, nextgenDeduplicationService_1.formatPremiumListingNote)({ base: 45, premium: 5, total: 50 });
            expect(note).toContain('💎 Premium Listing Applied:');
            expect(note).toContain('Base Price: $45');
            expect(note).toContain('Premium Listing: $5');
            expect(note).toContain('Total Price: $50');
        });
    });
    describe('processNextGenLead', () => {
        const baseLead = {
            leadId: 'D-TEST-123',
            firstName: 'John',
            lastName: 'Doe',
            phone: '555-1234',
            email: 'john@example.com',
            product: 'data',
            price: '45'
        };
        const premiumLead = {
            leadId: 'D-TEST-123',
            firstName: 'John',
            lastName: 'Doe',
            phone: '555-1234',
            email: 'john@example.com',
            product: 'ad',
            price: '5'
        };
        it('should create new lead when no existing lead', () => {
            const result = (0, nextgenDeduplicationService_1.processNextGenLead)(baseLead, undefined);
            expect(result.action).toBe('create');
            expect(result.leadData).toEqual(baseLead);
            expect(result.logMessage).toContain('New data lead created with price $45');
        });
        it('should merge premium listing with existing lead', () => {
            const existingLead = { ...baseLead, price: 45, notes: 'Existing notes' };
            const result = (0, nextgenDeduplicationService_1.processNextGenLead)(premiumLead, existingLead);
            expect(result.action).toBe('update');
            expect(result.leadData.price).toBe(50);
            expect(result.leadData.notes).toContain('Existing notes');
            expect(result.leadData.notes).toContain('💎 Premium Listing Applied:');
            expect(result.priceBreakdown).toEqual({ base: 45, premium: 5, total: 50 });
            expect(result.logMessage).toContain('Premium listing merged: +$5 = $50 total');
        });
        it('should replace premium listing with main data record', () => {
            const existingPremium = { ...premiumLead, price: 5 };
            const result = (0, nextgenDeduplicationService_1.processNextGenLead)(baseLead, existingPremium);
            expect(result.action).toBe('update');
            expect(result.leadData.price).toBe(50);
            expect(result.leadData.product).toBe('data'); // Should use main data
            expect(result.leadData.notes).toContain('💎 Premium Listing Applied:');
            expect(result.priceBreakdown).toEqual({ base: 45, premium: 5, total: 50 });
            expect(result.logMessage).toContain('Main data record replaced premium: base $45 + premium $5 = $50');
        });
        it('should handle duplicate main records', () => {
            const existingMain = { ...baseLead, price: 45, notes: 'Original' };
            const newMain = { ...baseLead, price: '22.50' };
            const result = (0, nextgenDeduplicationService_1.processNextGenLead)(newMain, existingMain);
            expect(result.action).toBe('update');
            expect(result.leadData.price).toBe('22.50'); // Uses latest data
            expect(result.leadData.notes).toContain('⚠️ Duplicate data record processed');
            expect(result.leadData.notes).toContain('Previous price: $45, New price: $22.5');
        });
    });
    describe('processNextGenBatch', () => {
        it('should deduplicate batch of leads correctly', () => {
            const leads = [
                {
                    leadId: 'D-001',
                    firstName: 'Alice',
                    phone: '111-1111',
                    product: 'data',
                    price: '45'
                },
                {
                    leadId: 'D-001',
                    firstName: 'Alice',
                    phone: '111-1111',
                    product: 'ad',
                    price: '5'
                },
                {
                    leadId: 'D-002',
                    firstName: 'Bob',
                    phone: '222-2222',
                    product: 'data',
                    price: '30'
                }
            ];
            const result = (0, nextgenDeduplicationService_1.processNextGenBatch)(leads);
            expect(result).toHaveLength(2); // Two unique leads
            const alice = result.find(l => l.leadId === 'D-001');
            expect(alice).toBeDefined();
            expect(alice.price).toBe(50); // 45 + 5
            expect(alice.notes).toContain('💎 Premium Listing Applied:');
            const bob = result.find(l => l.leadId === 'D-002');
            expect(bob).toBeDefined();
            expect(bob.price).toBe('30'); // No premium
        });
        it('should handle premium listing before main record in batch', () => {
            const leads = [
                {
                    leadId: 'D-003',
                    firstName: 'Charlie',
                    phone: '333-3333',
                    product: 'ad',
                    price: '5'
                },
                {
                    leadId: 'D-003',
                    firstName: 'Charlie',
                    phone: '333-3333',
                    product: 'data',
                    price: '40'
                }
            ];
            const result = (0, nextgenDeduplicationService_1.processNextGenBatch)(leads);
            expect(result).toHaveLength(1);
            expect(result[0].price).toBe(45); // 40 + 5
            expect(result[0].product).toBe('data'); // Should keep main data record
            expect(result[0].notes).toContain('💎 Premium Listing Applied:');
        });
        it('should handle leads without deduplication keys', () => {
            const leads = [
                { firstName: 'No', lastName: 'Key', price: '10' },
                { firstName: 'Also No', lastName: 'Key', price: '20' }
            ];
            const result = (0, nextgenDeduplicationService_1.processNextGenBatch)(leads);
            expect(result).toHaveLength(2); // Both should be included
        });
    });
});
