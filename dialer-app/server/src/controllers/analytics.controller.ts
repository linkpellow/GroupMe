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
    const sourceCodeData = await LeadModel.aggregate([
      {
        $match: {
          tenantId: userId,
          createdAt: { $gte: timeRange.start, $lte: timeRange.end },
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
          totalRevenue: {
            $sum: {
              $cond: [
                { $eq: ['$disposition', 'SOLD'] },
                { $toDouble: { $ifNull: ['$price', 0] } },
                0
              ]
            }
          },
          totalSpent: {
            $sum: { $toDouble: { $ifNull: ['$price', 0] } }
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
          }
        }
      },
      {
        $sort: { soldLeads: -1 }
      },
      {
        $limit: 100
      }
    ]);

    // Get quality assignments for source codes
    const qualityAssignments = await SourceCodeQualityModel.find({ userId }).lean();
    const qualityMap = new Map(
      qualityAssignments.map((q: ISourceCodeQuality) => [q.sourceCode, q.quality])
    );

    // Enhance data with quality information
    const enhancedData = sourceCodeData.map((item: any) => ({
      ...item,
      quality: qualityMap.get(item._id) || null
    }));

    res.json({
      success: true,
      data: enhancedData,
      meta: {
        period,
        timeRange,
        totalSourceCodes: enhancedData.length
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

    // SOLD leads base query
    const soldQuery = {
      tenantId: userId,
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

    const campaignData = await LeadModel.aggregate([
      {
        $match: {
          tenantId: userId,
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

    const leadDetails = await LeadModel.aggregate([
      {
        $match: {
          tenantId: userId,
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

    const demographicsData = await LeadModel.aggregate([
      {
        $match: {
          tenantId: userId,
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