"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Call_1 = __importDefault(require("../models/Call"));
class TwilioService {
    constructor() {
        // Temporarily disable Twilio client initialization
        this.client = null;
    }
    async sendMessage(to, body) {
        try {
            console.log('Simulating sending message:', { to, body });
            return {
                success: true,
                message: 'Message simulated (Twilio disabled)',
                to,
                body,
            };
        }
        catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }
    async sendMassMessage(phoneNumbers, message) {
        const results = [];
        for (const phone of phoneNumbers) {
            try {
                console.log('Simulating sending message to:', phone);
                results.push({
                    success: true,
                    phone,
                    message: 'Message simulated (Twilio disabled)',
                });
            }
            catch (error) {
                console.error('Error sending message to', phone, ':', error);
                results.push({
                    success: false,
                    phone,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
        return results;
    }
    async initiateCall(to, from, leadId) {
        try {
            if (!this.client) {
                throw new Error('Twilio client not initialized');
            }
            const call = await this.client.calls.create({
                to,
                from: from,
                url: `${process.env.SERVER_URL}/api/calls/voice`,
                statusCallback: `${process.env.SERVER_URL}/api/calls/status-callback`,
                statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
                statusCallbackMethod: 'POST',
            });
            const newCall = new Call_1.default({
                twilioSid: call.sid,
                from: from,
                to,
                status: call.status,
                direction: 'outbound-api',
                lead: leadId,
            });
            await newCall.save();
            return { success: true };
        }
        catch (error) {
            console.error('Error initiating call:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    async handleCallStatus(callSid, status, duration) {
        try {
            if (!this.client) {
                throw new Error('Twilio client not initialized');
            }
            const call = await Call_1.default.findOne({ twilioSid: callSid });
            if (!call) {
                throw new Error('Call not found');
            }
            call.status = status;
            if (duration) {
                call.duration = duration;
            }
            await call.save();
        }
        catch (error) {
            console.error('Error handling call status:', error);
            throw error;
        }
    }
    generateVoiceResponse(message) {
        return `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>${message}</Say>
        <Hangup />
      </Response>`;
    }
}
exports.default = new TwilioService();
