import { Request, Response } from 'express';
import Call from '../models/Call';
import twilioService from '../services/twilio';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
}

export const initiateCall = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { leadId, phone } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const result = await twilioService.initiateCall(
      phone,
      process.env.TWILIO_PHONE_NUMBER || '',
      leadId
    );

    if (!result.success) {
      return res.status(500).json({ message: result.error || 'Failed to initiate call' });
    }

    res.json({ message: 'Call initiated successfully' });
  } catch (error) {
    console.error('Error initiating call:', error);
    res.status(500).json({ message: 'Error initiating call' });
  }
};

export const handleCallStatus = async (req: Request, res: Response) => {
  try {
    const { CallSid, CallStatus, CallDuration } = req.body;

    if (!CallSid || !CallStatus) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    await twilioService.handleCallStatus(CallSid, CallStatus, CallDuration);
    res.json({ message: 'Call status updated successfully' });
  } catch (error) {
    console.error('Error handling call status:', error);
    res.status(500).json({ message: 'Error handling call status' });
  }
};

export const getCallHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const calls = await Call.find({ userId })
      .sort({ createdAt: -1 })
      .populate('leadId', 'name phone email');

    res.json(calls);
  } catch (error) {
    console.error('Error fetching call history:', error);
    res.status(500).json({ message: 'Error fetching call history' });
  }
};
