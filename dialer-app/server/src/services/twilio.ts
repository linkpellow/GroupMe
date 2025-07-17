import twilio from 'twilio';
import CallModel from '../models/Call';
import LeadModel from '../models/Lead';
import UserModel from '../models/User';

class TwilioService {
  private client: any;

  constructor() {
    // Temporarily disable Twilio client initialization
    this.client = null;
  }

  async sendMessage(to: string, body: string) {
    try {
      console.log('Simulating sending message:', { to, body });
      return {
        success: true,
        message: 'Message simulated (Twilio disabled)',
        to,
        body,
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async sendMassMessage(phoneNumbers: string[], message: string) {
    const results = [];
    for (const phone of phoneNumbers) {
      try {
        console.log('Simulating sending message to:', phone);
        results.push({
          success: true,
          phone,
          message: 'Message simulated (Twilio disabled)',
        });
      } catch (error) {
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

  async initiateCall(
    to: string,
    from: string,
    leadId?: string
  ): Promise<{ success: boolean; error?: string }> {
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

      const newCall = new CallModel({
        twilioSid: call.sid,
        from: from,
        to,
        status: call.status,
        direction: 'outbound-api',
        lead: leadId,
      });

      await newCall.save();

      return { success: true };
    } catch (error) {
      console.error('Error initiating call:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async handleCallStatus(callSid: string, status: string, duration?: number): Promise<void> {
    try {
      if (!this.client) {
        throw new Error('Twilio client not initialized');
      }

      const call = await CallModel.findOne({ twilioSid: callSid });
      if (!call) {
        throw new Error('Call not found');
      }

      call.status = status;
      if (duration) {
        call.duration = duration;
      }

      await call.save();
    } catch (error) {
      console.error('Error handling call status:', error);
      throw error;
    }
  }

  generateVoiceResponse(message: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>${message}</Say>
        <Hangup />
      </Response>`;
  }
}

export default new TwilioService();
