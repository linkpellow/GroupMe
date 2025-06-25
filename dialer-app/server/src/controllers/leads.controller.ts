import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import LeadModel, { ILead } from '../models/Lead';
import UserModel, { IUser } from '../models/User';
import mongoose from 'mongoose';
import CallModel from '../models/Call';
import { QueryBuilderService } from '../services/queryBuilder.service';
import { ValidatedQuery } from '../middleware/validateQuery.middleware';
import { US_STATES, ALLOWED_DISPOSITIONS, PIPELINE_SOURCES } from '@shared/config/queryConfig';
import { format as csvFormat } from '@fast-csv/format';
import { Writable } from 'stream';
import { sanitizeNotes } from '../utils/notesUtils';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role?: string;
  };
}

// Helper function to format lead data as JSON
const formatLeadAsJson = (lead: any): string => {
  const formattedLead = {
    created_at: lead.createdAt?.toISOString() || new Date().toISOString(),
    purchase_id: lead.purchaseId || '',
    product: lead.product || 'data',
    lead_id: lead.leadId || '',
    vendor_id: lead.vendorId || '',
    vendor_name: lead.vendorName || '',
    vertical_id: lead.verticalId || '',
    account_id: lead.accountId || '',
    account_name: lead.accountName || '',
    campaign_id: lead.campaignId || '',
    campaign_name: lead.campaignName || '',
    bid_type: lead.bidType || '',
    first_name: lead.firstName || '',
    last_name: lead.lastName || '',
    phone: lead.phone || '',
    street_1: lead.street1 || '',
    street_2: lead.street2 || '',
    email: lead.email || '',
    city: lead.city || '',
    state: lead.state || '',
    zipcode: lead.zipcode || '',
    dob: lead.dob || '',
    gender: lead.gender || '',
    height: lead.height || '',
    household_size: lead.householdSize || '',
    household_income: lead.householdIncome || '',
    weight: lead.weight || '',
    military: lead.military?.toString() || 'false',
    pregnant: lead.pregnant?.toString() || 'false',
    tobacco_user: lead.tobaccoUser?.toString() || 'false',
    has_prescription: lead.hasPrescription?.toString() || 'false',
    has_medicare_parts_a_b: lead.hasMedicarePartsAB || '',
    has_medical_condition: lead.hasMedicalCondition?.toString() || 'false',
    medical_conditions: lead.medicalConditions || '[]',
    insurance_timeframe: lead.insuranceTimeframe || '',
    price: lead.price || '',
    status: lead.status || '',
    disposition: lead.disposition || '',
    call_log_id: lead.callLogId || '',
    call_duration: lead.callDuration || '',
    source_hash: lead.sourceHash || '',
    sub_id_hash: lead.subIdHash || '',
  };

  return JSON.stringify(formattedLead, null, 2);
};

export const getLeads = async (req: ValidatedQuery, res: Response): Promise<void> => {
  const startTime = Date.now();

  try {
    if (!req.validatedQuery) {
      throw new Error('Query validation failed');
    }

    const { validatedQuery } = req;

    // If getAllResults is true, override the limit to a high value
    if ((validatedQuery as any).getAllResults) {
      validatedQuery.limit = 10000; // Set a reasonable max limit
    }

    // Build MongoDB query
    const { filter, sort, skip, limit, page } = QueryBuilderService.buildLeadsQuery(validatedQuery);
    // Get performance warnings
    const perfCheck = QueryBuilderService.validateQueryPerformance(validatedQuery);
    const allWarnings = [...perfCheck.warnings];
    // Execute query with proper indexing
    const [leads, total] = await Promise.all([
      LeadModel.find(filter)
        .sort(sort as any) // Ensure sort is compatible with Mongoose
        .skip(skip)
        .limit(limit)
        .select('-__v') // Exclude version key
        .lean() // Return plain objects for performance
        .exec(),
      LeadModel.countDocuments(filter).exec(),
    ]);
    const queryTime = Date.now() - startTime;
    // Log slow queries
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    if (queryTime > 200) {
      console.warn('Slow query detected:', {
        queryTime,
        filter,
        sort,
        page,
        limit,
        total,
        requestId,
      });
    }
    // Build response (use sanitized & formatted leads)
    const response = {
      leads: leads.map((lead) => {
        const jsonString = formatLeadAsJson(lead);
        return {
          ...lead,
          formattedJson: jsonString,
          disposition: lead.disposition || '',
          notes: sanitizeNotes(lead.notes),
        };
      }),
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
      meta: {
        queryTime,
        cached: false,
        requestId,
        warnings: allWarnings.length > 0 ? allWarnings : undefined,
      },
    };
    // Set cache headers
    res.set({
      'X-Query-Time': queryTime.toString(),
      'X-Total-Count': total.toString(),
      'Cache-Control': 'private, max-age=60', // 1 minute cache
    });
    res.json(response);
  } catch (error) {
    const queryTime = Date.now() - startTime;
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.error('Error fetching leads:', error);
    res.status(500).json({
      error: 'Failed to fetch leads',
      requestId,
      queryTime,
    });
  }
};

export const getLeadById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('getLeadById called with ID:', req.params.id);

    // Special case for call-counts endpoint
    if (req.params.id === 'call-counts') {
      console.log('Detected call-counts special case');
      // Forward to the appropriate controller or middleware
      return res.status(400).json({
        message:
          'The call-counts endpoint should be accessed directly, not through the lead/:id route',
      });
    }

    // Validate that id is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log(`Invalid ObjectId format: ${req.params.id}`);
      return res.status(400).json({ message: 'Invalid lead ID format' });
    }

    console.log('Looking up lead with valid ObjectId:', req.params.id);
    const lead = await LeadModel.findById(req.params.id).populate('assignedTo', 'name email');

    if (!lead) {
      console.log('Lead not found for ID:', req.params.id);
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Check if user has access to this lead
    if (req.user?.role !== 'admin' && lead.assignedTo?.toString() !== req.user?.id) {
      console.log('Access denied - user:', req.user?.id, 'assignedTo:', lead.assignedTo);
      return res.status(403).json({ message: 'Access denied' });
    }

    console.log('Returning lead:', lead._id);
    const formattedJson = formatLeadAsJson(lead);
    res.json({ ...lead.toObject(), formattedJson, notes: sanitizeNotes(lead.notes) });
  } catch (error) {
    console.error('Get lead error:', error);
    // Include more error details in development
    if (process.env.NODE_ENV === 'development') {
      return res.status(500).json({
        message: 'Error getting lead',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
    res.status(500).json({ message: 'Error getting lead' });
  }
};

// Helper function to initialize order for all leads
const initializeLeadOrder = async (userId: string) => {
  const query: any = {};
  if (userId) {
    query.assignedTo = userId;
  }

  const leads = await LeadModel.find(query).sort({ createdAt: -1 });
  for (let i = 0; i < leads.length; i++) {
    await LeadModel.findByIdAndUpdate(leads[i]._id, {
      $set: { order: i },
    });
  }
};

export const createLead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);

    // Only check validation errors if it's not a blank lead
    if (!errors.isEmpty() && req.body.name !== 'Blank Lead') {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      email,
      phone,
      status,
      height,
      weight,
      gender,
      state,
      city,
      zipcode,
      dob,
      firstName,
      lastName,
      disposition,
      notes,
      source,
    } = req.body;

    // Get the current highest order
    const query: any = {};
    if (req.user?.role !== 'admin') {
      query.assignedTo = req.user?.id;
    }
    const lastLead = await LeadModel.findOne(query).sort({ order: -1 });
    const nextOrder = lastLead?.order !== undefined ? lastLead.order + 1 : 0;

    // For blank leads, make sure we at least have the minimum required fields
    const leadData: any = {
      name: name || 'Blank Lead',
      email: email || '',
      phone: phone || '',
      status: status || 'New',
      height: height || '',
      weight: weight || '',
      gender: gender || '',
      state: state || '',
      city: city || '',
      zipcode: zipcode || '',
      dob: dob || '',
      firstName: firstName || '',
      lastName: lastName || '',
      disposition: disposition || '',
      notes: sanitizeNotes(notes || ''),
      source: source || 'Manual Entry',
      assignedTo: req.user?.id,
      order: nextOrder,
    };

    console.log('Creating new lead with data:', leadData);
    const lead = await LeadModel.create(leadData);
    console.log('Lead created successfully:', lead._id);

    res.status(201).json(lead);
  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({ message: 'Error creating lead' });
  }
};

// Add an endpoint to initialize order for all leads
export const initializeOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    await initializeLeadOrder(req.user.id);
    res.json({ message: 'Lead order initialized successfully' });
  } catch (error) {
    console.error('Error initializing lead order:', error);
    res.status(500).json({ message: 'Error initializing lead order' });
  }
};

export const updateLead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { disposition, notes, name, email, phone, zipcode, dob, height, weight, gender, state } =
      req.body;

    console.log('Updating lead:', id);
    console.log('Update data:', {
      disposition,
      notes,
      name,
      email,
      phone,
      zipcode,
      dob,
      height,
      weight,
      gender,
      state,
    });

    // Check if lead exists before update
    const existingLead = await LeadModel.findById(id);
    if (!existingLead) {
      console.log('Lead not found for update:', id);
      return res.status(404).json({ message: 'Lead not found' });
    }

    console.log('Existing lead before update:', {
      id: existingLead._id,
      name: existingLead.name,
      email: existingLead.email,
      phone: existingLead.phone,
      zipcode: existingLead.zipcode,
      dob: existingLead.dob,
      height: existingLead.height,
      weight: existingLead.weight,
      gender: existingLead.gender,
      state: existingLead.state,
      oldDisposition: existingLead.disposition,
      oldNotes: existingLead.notes,
    });

    // Build update object with only the fields that were explicitly provided
    const updateData: any = {};

    // Only add fields to updateData if they are explicitly defined in the request
    if (disposition !== undefined) updateData.disposition = disposition;
    if ('notes' in req.body) {
      updateData.notes = req.body.notes || ''; // allow clearing the notes
    }
    if (name !== undefined && name !== '') updateData.name = name;
    if (email !== undefined && email !== '') updateData.email = email;
    if (phone !== undefined && phone !== '') updateData.phone = phone;
    if (zipcode !== undefined && zipcode !== '') updateData.zipcode = zipcode;
    if (dob !== undefined && dob !== '') updateData.dob = dob;
    if (height !== undefined && height !== '') updateData.height = height;
    if (weight !== undefined && weight !== '') updateData.weight = weight;
    if (gender !== undefined && gender !== '') updateData.gender = gender;
    if (state !== undefined && state !== '') updateData.state = state;

    console.log('Fields being updated:', Object.keys(updateData));
    console.log('Update values:', updateData);

    // Use findOneAndUpdate with upsert to ensure the update happens
    const updatedLead = await LeadModel.findOneAndUpdate(
      { _id: id },
      { $set: updateData },
      {
        new: true,
        upsert: false,
        runValidators: true,
      }
    );

    if (!updatedLead) {
      console.log('Failed to update lead:', id);
      return res.status(500).json({ message: 'Failed to update lead' });
    }

    console.log('Lead updated successfully:', {
      id: updatedLead._id,
      name: updatedLead.name,
      email: updatedLead.email,
      phone: updatedLead.phone,
      zipcode: updatedLead.zipcode,
      dob: updatedLead.dob,
      height: updatedLead.height,
      weight: updatedLead.weight,
      gender: updatedLead.gender,
      state: updatedLead.state,
      oldDisposition: existingLead.disposition,
      newDisposition: updatedLead.disposition,
      oldNotes: existingLead.notes,
      newNotes: updatedLead.notes,
      fieldsUpdated: Object.keys(updateData),
    });

    // After successful update
    // Emit WebSocket event if notes were changed to keep other tabs in sync
    if (updateData.notes !== undefined) {
      try {
        // Dynamic import to avoid circular dependency issues
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { broadcastMessage } = require('../index');
        const now = new Date();
        broadcastMessage({ type: 'LEAD_NOTES_UPDATED', leadId: id, notes: updateData.notes, updatedAt: now.toISOString() });
      } catch (err) {
        console.error('Failed to broadcast notesUpdated from updateLead:', err);
      }
    }

    // Return the updated lead with sanitized notes so client never sees metadata/banner
    const leadObj = updatedLead.toObject ? updatedLead.toObject() : (updatedLead as any);
    leadObj.notes = sanitizeNotes(leadObj.notes);
    res.json(leadObj);
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ message: 'Error updating lead' });
  }
};

export const deleteLead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('Deleting lead:', req.params.id);
    const result = await LeadModel.findByIdAndDelete(req.params.id);

    if (!result) {
      console.log('Lead not found:', req.params.id);
      return res.status(404).json({ message: 'Lead not found' });
    }

    console.log('Lead deleted successfully:', req.params.id);
    res.json({ success: true, _id: req.params.id });
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({ message: 'Error deleting lead' });
  }
};

export const testDb = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Create a test lead with NextGen formatting
    const testLead = {
      name: 'Jane Smith',
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '555-987-6543',
      email: 'jane.smith@example.com',
      state: 'NY',
      city: 'New York',
      zipcode: '10001',
      dob: '1985-05-15',
      height: '5\'8"',
      weight: '160',
      gender: 'F',
      disposition: 'New Lead',
      notes: `Imported from NextGen
Campaign: Test Campaign
Location: New York, NY 10001
Original Status: complete
Disposition: New Lead
Label: New Lead`,
      assignedTo: req.user?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const lead = await LeadModel.create(testLead);
    console.log('Test lead created:', lead);

    res.json({ message: 'Test lead created successfully', lead });
  } catch (error) {
    console.error('Test DB error:', error);
    res.status(500).json({
      message: 'Error testing database',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const getLeadsByState = async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('getLeadsByState - Request received from user:', req.user?.id);

    const state = req.query.state as string;
    console.log('getLeadsByState - Filtering by state:', state);

    // Build base query
    const query: any = {};
    if (req.user?.role !== 'admin') {
      query.assignedTo = req.user?.id;
    }

    // If state is provided, filter by it with exact match
    if (state) {
      // Exact match on state abbreviation
      query.state = state;
      console.log('getLeadsByState - Added state filter:', state);

      // Log the query for debugging
      console.log('getLeadsByState - Query:', JSON.stringify(query, null, 2));

      // Get count of leads for this state
      const stateCount = await LeadModel.countDocuments(query);
      console.log('getLeadsByState - Number of leads for state', state, ':', stateCount);

      if (stateCount === 0) {
        console.log('getLeadsByState - No leads found for state:', state);
        return res.json({
          leads: [],
          total: 0,
        });
      }
    }

    // Get all leads matching the query
    const leads = await LeadModel.find(query).sort({ order: 1, createdAt: -1 }).lean();

    console.log('getLeadsByState - Found leads:', leads.length);
    if (leads.length > 0) {
      console.log('getLeadsByState - First lead state:', leads[0].state);
      console.log(
        'getLeadsByState - All lead states:',
        leads.map((l) => l.state)
      );
    }

    // Format each lead as JSON
    const formattedLeads = leads.map((lead) => {
      const jsonString = formatLeadAsJson(lead);
      return {
        ...lead,
        formattedJson: jsonString,
        disposition: lead.disposition || '',
        notes: sanitizeNotes(lead.notes),
      };
    });

    res.json({
      leads: formattedLeads,
      total: leads.length,
    });
  } catch (error) {
    console.error('Get leads by state error:', error);
    res.status(500).json({ message: 'Error getting leads by state' });
  }
};

export const reorderLead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newIndex, currentIndex } = req.body;

    console.log('Reordering lead:', {
      leadId: id,
      newIndex,
      currentIndex,
    });

    // Build query based on user role
    const query: any = {};
    if (req.user?.role !== 'admin') {
      query.assignedTo = req.user?._id;
    }

    // Get all leads for the current user
    const leads = await LeadModel.find(query).sort({ order: 1, createdAt: -1 }).lean();

    console.log(
      'Current lead orders:',
      leads.map((l) => ({ id: l._id, order: l.order }))
    );

    // Find the lead to move
    const leadToMove = leads.find((l) => l._id.toString() === id);
    if (!leadToMove) {
      console.log('Lead not found:', id);
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Remove the lead from its current position
    leads.splice(currentIndex, 1);
    // Insert it at the new position
    leads.splice(newIndex, 0, leadToMove);

    // Update the order in the database for all leads
    const updatePromises = leads.map((lead, index) => {
      console.log(`Updating lead ${lead._id} to order ${index}`);
      return LeadModel.findByIdAndUpdate(lead._id, { $set: { order: index } }, { new: true });
    });

    // Wait for all updates to complete
    await Promise.all(updatePromises);

    // Verify the updated order
    const updatedLeads = await LeadModel.find(query).sort({ order: 1, createdAt: -1 }).lean();

    console.log(
      'Updated lead orders:',
      updatedLeads.map((l) => ({ id: l._id, order: l.order }))
    );

    res.json({ message: 'Lead reordered successfully' });
  } catch (error) {
    console.error('Error in reorderLead:', error);
    res.status(500).json({ message: 'Error reordering lead' });
  }
};

export const reverseOrder = async (req: Request, res: Response) => {
  try {
    const { currentDirection, state, disposition, dispositions } = req.query;
    const newDirection = currentDirection === 'new' ? 'aged' : 'new';

    // Build query based on filters
    const query: any = {};
    if (state && typeof state === 'string') {
      query.state = state;
    }

    // Handle multiple dispositions (from checkboxes)
    if (dispositions && typeof dispositions === 'string') {
      const dispositionArray = dispositions.split(',');
      if (dispositionArray.length > 0) {
        query.disposition = { $in: dispositionArray };
        console.log('Filtering by multiple dispositions:', dispositionArray);
      }
    } else if (disposition && typeof disposition === 'string') {
      // Backwards compatibility for single disposition
      query.disposition = disposition;
      console.log('Filtering by single disposition:', disposition);
    }

    // Get all leads sorted by creation date
    const sortOrder = newDirection === 'new' ? 1 : -1; // 1 for Shakari first (newest), -1 for Donna first (oldest)
    const leads = await LeadModel.find(query).sort({ createdAt: sortOrder }).lean();

    console.log('Reverse order:', {
      oldDirection: currentDirection,
      newDirection,
      totalLeads: leads.length,
      firstLead: {
        name: leads[0]?.name,
        date: leads[0]?.createdAt,
      },
      lastLead: {
        name: leads[leads.length - 1]?.name,
        date: leads[leads.length - 1]?.createdAt,
      },
      filters: {
        state,
        disposition,
        dispositions,
      },
    });

    // Format the response
    const formattedLeads = leads.map((lead) => ({
      ...lead,
      disposition: lead.disposition || '',
      notes: sanitizeNotes(lead.notes),
    }));

    res.json({
      message: 'Lead order reversed successfully',
      leads: formattedLeads,
      newDirection,
    });
  } catch (error) {
    console.error('Error reversing lead order:', error);
    res.status(500).json({ message: 'Error reversing lead order' });
  }
};

export const createTestLead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const testLead = {
      firstName: 'John',
      lastName: 'Doe',
      phone: '555-123-4567',
      email: 'john.doe@example.com',
      state: 'CA',
      city: 'Los Angeles',
      zipcode: '90001',
      dob: '1990-01-01',
      height: '5\'10"',
      weight: '180',
      gender: 'M',
      disposition: 'Attempting Contact',
      notes: `Imported from NextGen
Campaign: Test Campaign
Location: Los Angeles, CA 90001
Original Status: complete
Disposition: Attempting Contact`,
      assignedTo: req.user?.id,
    };

    const lead = await LeadModel.create(testLead);
    res.status(201).json(lead);
  } catch (error) {
    console.error('Create test lead error:', error);
    res.status(500).json({ message: 'Error creating test lead' });
  }
};

export const getCallCounts = async (req: Request, res: Response) => {
  try {
    console.log('[call-counts] Processing request...');

    // Create date objects for today's range in UTC
    const now = new Date();
    console.log('[call-counts] Current time:', now.toISOString());

    // Use UTC date to avoid timezone issues
    const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD

    // Create start of day (00:00:00) and end of day (23:59:59) in UTC
    const startOfDay = new Date(todayStr + 'T00:00:00.000Z');
    const endOfDay = new Date(todayStr + 'T23:59:59.999Z');

    console.log(
      '[call-counts] Filtering calls between:',
      startOfDay.toISOString(),
      'and',
      endOfDay.toISOString()
    );

    // Add try/catch to handle potential database issues
    let allCalls = [];
    try {
      allCalls = await CallModel.find({
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      })
        .select('lead direction')
        .lean();

      console.log(`[call-counts] Found ${allCalls.length} calls for today`);
    } catch (dbError) {
      console.error('[call-counts] Database error fetching calls:', dbError);
      // Return empty call counts instead of failing
      return res.json({
        success: true,
        callCounts: {},
        today: todayStr,
        error: 'Database error occurred, but continuing with empty counts',
      });
    }

    // Create a map of unique leads called - KEY CHANGE: Only set to 1, never increment
    // This ensures each lead is counted exactly once regardless of call count
    const callCounts: { [key: string]: number } = {};
    const uniqueLeadIds = new Set<string>();

    // First, collect all unique lead IDs that have been called
    allCalls.forEach((call) => {
      if (call.lead && call.direction === 'outbound') {
        const leadId = call.lead.toString();
        uniqueLeadIds.add(leadId);
      }
    });

    // Then create a map with each lead having exactly one call
    uniqueLeadIds.forEach((leadId) => {
      callCounts[leadId] = 1;
    });

    // Calculate unique leads called for debugging
    const uniqueLeadsCalled = Object.keys(callCounts).length;
    console.log(`[call-counts] Unique leads called today: ${uniqueLeadsCalled}`);

    // Get all call IDs for debugging
    const callDetails = allCalls.map((call) => ({
      id: call._id
        ? typeof call._id === 'object'
          ? call._id.toString()
          : String(call._id)
        : undefined,
      lead: call.lead
        ? typeof call.lead === 'object'
          ? call.lead.toString()
          : String(call.lead)
        : undefined,
      direction: call.direction,
    }));

    res.json({
      success: true,
      callCounts,
      today: todayStr,
      debug: {
        uniqueLeadsCalled,
        totalCalls: allCalls.length,
        uniqueLeadIds: Array.from(uniqueLeadIds).slice(0, 10), // First 10 unique lead IDs
        callDetails: callDetails.slice(0, 10), // Return just first 10 for debugging
      },
    });
  } catch (error) {
    console.error('[call-counts] Error fetching call counts:', error);
    // Return empty results instead of 500 error
    res.json({
      success: false,
      error: 'Error fetching call counts',
      callCounts: {},
      today: new Date().toISOString().split('T')[0],
    });
  }
};

// Add new endpoint for filter options
export const getFilterOptions = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get unique values from database
    const [states, dispositions, sources] = await Promise.all([
      LeadModel.distinct('state').exec(),
      LeadModel.distinct('disposition').exec(),
      LeadModel.distinct('source').exec(),
    ]);

    // Return available options (intersection of DB values and config)
    res.json({
      states: states.filter((s) => US_STATES.includes(s as any)).sort(),
      dispositions: dispositions.filter((d) => ALLOWED_DISPOSITIONS.includes(d as any)).sort(),
      sources: Object.values(PIPELINE_SOURCES),
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    res.status(500).json({
      error: 'Failed to fetch filter options',
      requestId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    });
  }
};

// Helper to generate filename based on filters (simple version; client ultimately decides)
export function buildCsvFilename(q: any): string {
  const disposition = Array.isArray(q.dispositions) && q.dispositions.length === 1 ? q.dispositions[0] : 'Multiple';
  const source = Array.isArray(q.sources) && q.sources.length === 1 ? (q.sources[0] === 'Marketplace' ? 'MP' : q.sources[0] === 'NextGen' ? 'NG' : 'Mixed') : 'Mixed';
  const safeDisposition = String(disposition || 'All').replace(/[^a-z0-9\-_ ]/gi, '_');
  return `CrokodialCSV (${safeDisposition}, ${source}).csv`;
}

export const exportLeadsCsv = async (req: ValidatedQuery, res: Response): Promise<void> => {
  try {
    if (!req.validatedQuery) throw new Error('validatedQuery missing');

    // Force un-paginated
    const query = { ...req.validatedQuery, getAllResults: true } as any;
    const filename = buildCsvFilename(query);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Build DB cursor (lean for perf)
    const qb = QueryBuilderService.buildLeadsQuery(query);
    const cursor = LeadModel.find(qb.filter)
      .sort(qb.sort as any)
      .lean()
      .cursor({ batchSize: 500 });

    // CSV formatter
    const csvStream = csvFormat({ headers: true });

    // When response closes early → clean resources
    const cleanup = () => {
      try {
        cursor.close();
      } catch (_) {}
    };
    res.on('close', cleanup);
    res.on('error', cleanup);

    csvStream.on('error', (err) => {
      console.error('CSV stream error:', err);
      cleanup();
      if (!res.headersSent) res.status(500).end();
    });

    // Pipe csv formatter to response with back-pressure managed manually on cursor
    csvStream.pipe(res);

    for await (const doc of cursor) {
      const rowOk = csvStream.write({
        id: doc._id?.toString(),
        name: doc.name,
        email: doc.email,
        phone: doc.phone,
        state: doc.state,
        source: doc.source,
        disposition: doc.disposition,
        createdAt: doc.createdAt,
      });
      if (!rowOk) {
        // Wait for drain before continuing
        await new Promise<void>((resolve) => csvStream.once('drain', resolve));
      }
    }

    csvStream.end();
  } catch (err) {
    console.error('exportLeadsCsv error:', err);
    if (!res.headersSent) res.status(500).json({ message: 'CSV export failed' });
  }
};

export const updateLeadNotes = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body as { notes?: string };

    if (typeof notes !== 'string') {
      return res.status(400).json({ message: 'Notes must be provided as a string' });
    }

    const now = new Date();

    const updatedLead = await LeadModel.findOneAndUpdate(
      { _id: id },
      { $set: { notes: notes, updatedAt: now } },
      { new: true, runValidators: true, upsert: false },
    ).lean();

    if (!updatedLead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Broadcast WebSocket event so other tabs update immediately
    try {
      // Dynamic import to avoid circular dependency issues
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { broadcastMessage } = require('../index');
      broadcastMessage({ type: 'LEAD_NOTES_UPDATED', leadId: id, notes: notes, updatedAt: now.toISOString() });
    } catch (wsErr) {
      console.error('Failed to broadcast notesUpdated WS message:', wsErr);
    }

    return res.json({ success: true, leadId: id, notes: notes });
  } catch (error) {
    console.error('updateLeadNotes error:', error);
    return res.status(500).json({ message: 'Error updating notes' });
  }
};
