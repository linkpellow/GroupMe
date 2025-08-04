import { Request, Response } from 'express';
import EmailTemplate from '../models/EmailTemplate';

// Interface for authenticated requests
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role?: string;
  };
}

/**
 * Create a new email template
 */
export const createTemplate = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { name, subject, body, description } = req.body;

    // Validate required fields
    if (!name || !subject || !body) {
      return res.status(400).json({ message: 'Name, subject, and body are required' });
    }

    // Create new template
    const template = new EmailTemplate({
      userId: req.user.id,
      name,
      subject,
      body,
      description,
    });

    await template.save();

    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ message: 'Failed to create template' });
  }
};

/**
 * Get all templates for the current user
 */
export const getTemplates = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const templates = await EmailTemplate.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });

    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ message: 'Failed to fetch templates' });
  }
};

/**
 * Get a specific template by ID
 */
export const getTemplateById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const template = await EmailTemplate.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ message: 'Failed to fetch template' });
  }
};

/**
 * Update a template
 */
export const updateTemplate = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { name, subject, body, description } = req.body;

    // Validate required fields
    if (!name || !subject || !body) {
      return res.status(400).json({ message: 'Name, subject, and body are required' });
    }

    // Find and update the template
    const template = await EmailTemplate.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      {
        name,
        subject,
        body,
        description,
      },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json(template);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ message: 'Failed to update template' });
  }
};

/**
 * Delete a template
 */
export const deleteTemplate = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const result = await EmailTemplate.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!result) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ message: 'Failed to delete template' });
  }
};
