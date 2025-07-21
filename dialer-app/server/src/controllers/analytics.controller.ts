import { Request, Response } from 'express';
import mongoose from 'mongoose';
import LeadModel, { ILead } from '../models/Lead';
import SourceCodeQualityModel, { ISourceCodeQuality } from '../models/SourceCodeQuality';

// Define the AuthenticatedRequest interface locally
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role?: string;
  };
}

/**
 * Analytics Controller - SOLD Lead Performance Analytics
 * Provides comprehensive business intelligence for lead conversion tracking
 */

// Time range calculation utility
const getTimeRange = (period: string) => {
  const now = new Date();
  const ranges = {
    weekly: {
      start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      end: now
    },
    monthly: {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: now
    },
    yearly: {
      start: new Date(now.getFullYear(), 0, 1),
      end: now
    },
    'all-time': {
      start: new Date('2020-01-01'),
      end: now
    }
  };
  
  return ranges[period as keyof typeof ranges] || ranges.weekly;
};

// Source Code Analytics - Track source_hash performance and quality
export const getSourceCodeAnalytics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const userId = new mongoose.Types.ObjectId(req.user.id);
    const { period = 'weekly' } = req.query;
    const timeRange = getTimeRange(period as string);

    // Get source code performance with SOLD conversion tracking
    // Use flexible tenant filtering like /leads endpoint to handle legacy data
    const tenantFilter = req.user?.role === 'admin'
      ? { $or: [{ tenantId: userId }, { tenantId: { $exists: false } }] }
      : { $or: [{ tenantId: userId }, { tenantId: { $exists: false } }] };

    // First, get ALL unique source codes (not filtered by time)
    const allSourceCodes = await LeadModel.aggregate([
      {
        $match: {
          ...tenantFilter,
          $or: [
            { sourceHash: { $exists: true, $nin: [null, ''] } },
            { sourceCode: { $exists: true, $nin: [null, ''] } }
          ]
        }
      },
      {
        $addFields: {
          sourceIdentifier: {
            $cond: {
              if: { $and: [{ $ne: ['$sourceHash', null] }, { $ne: ['$sourceHash', ''] }] },
              then: '$sourceHash',
              else: '$sourceCode'
            }
          }
        }
      },
      {
        $group: {
          _id: '$sourceIdentifier',
          totalLeads: { $sum: 1 },
          soldLeads: {
            $sum: {
              $cond: [{ $eq: ['$disposition', 'SOLD'] }, 1, 0]
            }
          },
          // Track total cost (all leads)
          totalCost: {
            $sum: { $toDouble: { $ifNull: ['$price', 0] } }
          },
          // Track sales in date range for "Hot Sources"
          soldInPeriod: {
            $sum: {
              $cond: [
                { 
                  $and: [
                    { $eq: ['$disposition', 'SOLD'] },
                    { $gte: ['$createdAt', timeRange.start] },
                    { $lte: ['$createdAt', timeRange.end] }
                  ]
                },
                1,
                0
              ]
            }
          },
          lastSaleDate: {
            $max: {
              $cond: [
                { $eq: ['$disposition', 'SOLD'] },
                '$createdAt',
                null
              ]
            }
          }
        }
      },
      {
        $addFields: {
          conversionRate: {
            $cond: [
              { $gt: ['$totalLeads', 0] },
              { $multiply: [{ $divide: ['$soldLeads', '$totalLeads'] }, 100] },
              0
            ]
          },
          // Calculate cost per sale
          costPerSale: {
            $cond: [
              { $gt: ['$soldLeads', 0] },
              { $divide: ['$totalCost', '$soldLeads'] },
              0
            ]
          }
        }
      },
      {
        $sort: { totalCost: -1 }
      }
    ]);

    // Get quality assignments for source codes
    const qualityAssignments = await SourceCodeQualityModel.find({ tenantId: userId }).lean();
    const qualityMap = new Map(
      qualityAssignments.map((q: ISourceCodeQuality) => [q.sourceCode, q])
    );

    // Enhance data with quality information
    const enhancedData = allSourceCodes.map((item: any) => ({
      code: item._id,
      totalLeads: item.totalLeads,
      soldLeads: item.soldLeads,
      conversionRate: item.conversionRate,
      totalCost: item.totalCost,
      costPerSale: item.costPerSale,
      soldInPeriod: item.soldInPeriod,
      lastSaleDate: item.lastSaleDate,
      quality: qualityMap.get(item._id)?.quality || 'Low Quality',
      autoFlagged: qualityMap.get(item._id)?.autoFlagged || false,
      manualOverride: qualityMap.get(item._id)?.manualOverride || false
    }));

    // Calculate summary metrics
    const hotSources = enhancedData.filter(item => item.soldInPeriod > 0).length;
    const totalCost = enhancedData.reduce((sum, item) => sum + item.totalCost, 0);
    const totalSold = enhancedData.reduce((sum, item) => sum + item.soldLeads, 0);
    const avgCostPerSale = totalSold > 0 ? totalCost / totalSold : 0;

    // Find top performer (most sales in period)
    const topPerformer = enhancedData
      .filter(item => item.soldInPeriod > 0)
      .sort((a, b) => b.soldInPeriod - a.soldInPeriod)[0];

    res.json({
      success: true,
      data: enhancedData,
      meta: {
        period,
        timeRange,
        totalSourceCodes: enhancedData.length,
        hotSources,
        totalCost,
        avgCostPerSale,
        topPerformer: topPerformer?.code || 'N/A'
      }
    });

  } catch (error) {
    console.error('[getSourceCodeAnalytics] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get source code analytics'
    });
  }
};

// CPA Analytics - Cost Per Acquisition analysis
export const getCPAAnalytics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const userId = new mongoose.Types.ObjectId(req.user.id);
    const { period = 'weekly' } = req.query;
    const timeRange = getTimeRange(period as string);

    // SOLD leads base query with flexible tenant filtering
    const tenantFilter = req.user?.role === 'admin'
      ? { $or: [{ tenantId: userId }, { tenantId: { $exists: false } }] }
      : { $or: [{ tenantId: userId }, { tenantId: { $exists: false } }] };

    const soldQuery = {
      ...tenantFilter,
      disposition: 'SOLD',
      createdAt: { $gte: timeRange.start, $lte: timeRange.end }
    };

    // CPA calculation with detailed lead breakdown
    const cpaData = await LeadModel.aggregate([
      { $match: soldQuery },
      {
        $group: {
          _id: null,
          totalSpent: { $sum: { $toDouble: { $ifNull: ['$price', 0] } } },
          soldCount: { $sum: 1 },
          leads: {
            $push: {
              name: '$name',
              price: { $toDouble: { $ifNull: ['$price', 0] } },
              purchaseDate: '$createdAt',
              sourceCode: {
                $cond: {
                  if: { $and: [{ $ne: ['$sourceHash', null] }, { $ne: ['$sourceHash', ''] }] },
                  then: '$sourceHash',
                  else: '$sourceCode'
                }
              },
              state: '$state'
            }
          }
        }
      },
      {
        $addFields: {
          cpa: {
            $cond: [
              { $gt: ['$soldCount', 0] },
              { $divide: ['$totalSpent', '$soldCount'] },
              0
            ]
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: cpaData[0] || {
        totalSpent: 0,
        soldCount: 0,
        cpa: 0,
        leads: []
      },
      meta: {
        period,
        timeRange
      }
    });

  } catch (error) {
    console.error('[getCPAAnalytics] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get CPA analytics'
    });
  }
};

// Campaign Analytics - Campaign performance based on SOLD conversions
export const getCampaignAnalytics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const userId = new mongoose.Types.ObjectId(req.user.id);
    const { period = 'weekly' } = req.query;
    const timeRange = getTimeRange(period as string);

    // Use flexible tenant filtering for campaign data
    const tenantFilter = req.user?.role === 'admin'
      ? { $or: [{ tenantId: userId }, { tenantId: { $exists: false } }] }
      : { $or: [{ tenantId: userId }, { tenantId: { $exists: false } }] };

    const campaignData = await LeadModel.aggregate([
      {
        $match: {
          ...tenantFilter,
          createdAt: { $gte: timeRange.start, $lte: timeRange.end },
          campaignName: { $exists: true, $nin: [null, ''] }
        }
      },
      {
        $group: {
          _id: '$campaignName',
          totalLeads: { $sum: 1 },
          soldLeads: {
            $sum: {
              $cond: [{ $eq: ['$disposition', 'SOLD'] }, 1, 0]
            }
          },
          totalSpent: {
            $sum: { $toDouble: { $ifNull: ['$price', 0] } }
          },
          revenue: {
            $sum: {
              $cond: [
                { $eq: ['$disposition', 'SOLD'] },
                { $toDouble: { $ifNull: ['$price', 0] } },
                0
              ]
            }
          }
        }
      },
      {
        $addFields: {
          conversionRate: {
            $cond: [
              { $gt: ['$totalLeads', 0] },
              { $multiply: [{ $divide: ['$soldLeads', '$totalLeads'] }, 100] },
              0
            ]
          },
          roi: {
            $cond: [
              { $gt: ['$totalSpent', 0] },
              { $multiply: [{ $divide: [{ $subtract: ['$revenue', '$totalSpent'] }, '$totalSpent'] }, 100] },
              0
            ]
          }
        }
      },
      {
        $sort: { soldLeads: -1 }
      },
      {
        $limit: 50
      }
    ]);

    res.json({
      success: true,
      data: campaignData,
      meta: {
        period,
        timeRange,
        totalCampaigns: campaignData.length
      }
    });

  } catch (error) {
    console.error('[getCampaignAnalytics] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get campaign analytics'
    });
  }
};

// Lead Details Analytics - Comprehensive lead data with source codes
export const getLeadDetailsAnalytics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const userId = new mongoose.Types.ObjectId(req.user.id);
    const { period = 'weekly' } = req.query;
    const timeRange = getTimeRange(period as string);

    // Use flexible tenant filtering for lead details
    const tenantFilter = req.user?.role === 'admin'
      ? { $or: [{ tenantId: userId }, { tenantId: { $exists: false } }] }
      : { $or: [{ tenantId: userId }, { tenantId: { $exists: false } }] };

    const leadDetails = await LeadModel.aggregate([
      {
        $match: {
          ...tenantFilter,
          disposition: 'SOLD',
          createdAt: { $gte: timeRange.start, $lte: timeRange.end }
        }
      },
      {
        $project: {
          name: 1,
          state: 1,
          disposition: 1,
          price: { $toDouble: { $ifNull: ['$price', 0] } },
          purchaseDate: '$createdAt',
          sourceCode: {
            $cond: {
              if: { $and: [{ $ne: ['$sourceHash', null] }, { $ne: ['$sourceHash', ''] }] },
              then: '$sourceHash',
              else: '$sourceCode'
            }
          },
          sourceHash: 1,  // Add raw sourceHash field
          campaignName: 1,
          city: 1
        }
      },
      {
        $sort: { purchaseDate: -1 }
      },
      {
        $limit: 1000
      }
    ]);

    res.json({
      success: true,
      data: leadDetails,
      meta: {
        period,
        timeRange,
        totalSOLDLeads: leadDetails.length
      }
    });

  } catch (error) {
    console.error('[getLeadDetailsAnalytics] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get lead details analytics'
    });
  }
};

// Demographics Analytics - Geographic SOLD distribution analysis
export const getDemographicsAnalytics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const userId = new mongoose.Types.ObjectId(req.user.id);
    const { period = 'weekly' } = req.query;
    const timeRange = getTimeRange(period as string);

    // Use flexible tenant filtering for demographics
    const tenantFilter = req.user?.role === 'admin'
      ? { $or: [{ tenantId: userId }, { tenantId: { $exists: false } }] }
      : { $or: [{ tenantId: userId }, { tenantId: { $exists: false } }] };

    const demographicsData = await LeadModel.aggregate([
      {
        $match: {
          ...tenantFilter,
          disposition: 'SOLD',
          createdAt: { $gte: timeRange.start, $lte: timeRange.end },
          state: { $exists: true, $nin: [null, ''] }
        }
      },
      {
        $group: {
          _id: '$state',
          soldCount: { $sum: 1 },
          totalSpent: {
            $sum: { $toDouble: { $ifNull: ['$price', 0] } }
          },
          avgPrice: {
            $avg: { $toDouble: { $ifNull: ['$price', 0] } }
          }
        }
      },
      {
        $addFields: {
          avgCPA: '$avgPrice'
        }
      },
      {
        $sort: { soldCount: -1 }
      },
      {
        $limit: 50
      }
    ]);

    res.json({
      success: true,
      data: demographicsData,
      meta: {
        period,
        timeRange,
        totalStates: demographicsData.length
      }
    });

  } catch (error) {
    console.error('[getDemographicsAnalytics] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get demographics analytics'
    });
  }
};

// Update Source Code Quality Flag
export const updateSourceCodeQuality = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const userId = new mongoose.Types.ObjectId(req.user.id);
    const { sourceCode, quality } = req.body;

    // Validate input
    if (!sourceCode || !quality) {
      return res.status(400).json({
        success: false,
        message: 'sourceCode and quality are required'
      });
    }

    if (!['Quality', 'Low Quality'].includes(quality)) {
      return res.status(400).json({
        success: false,
        message: 'quality must be either "Quality" or "Low Quality"'
      });
    }

    // Update or create quality flag (manual override)
    const updatedQuality = await (SourceCodeQualityModel as any).updateQuality(
      sourceCode,
      userId, // tenantId
      quality,
      false // isAuto = false (manual)
    );

    res.json({
      success: true,
      data: updatedQuality,
      message: `Source code ${sourceCode} marked as ${quality}`
    });

  } catch (error) {
    console.error('[updateSourceCodeQuality] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update source code quality'
    });
  }
}; 