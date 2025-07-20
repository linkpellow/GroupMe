"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDemographicsAnalytics = exports.getLeadDetailsAnalytics = exports.getCampaignAnalytics = exports.getCPAAnalytics = exports.getSourceCodeAnalytics = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Lead_1 = __importDefault(require("../models/Lead"));
const SourceCodeQuality_1 = __importDefault(require("../models/SourceCodeQuality"));
/**
 * Analytics Controller - SOLD Lead Performance Analytics
 * Provides comprehensive business intelligence for lead conversion tracking
 */
// Time range calculation utility
const getTimeRange = (period) => {
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
    return ranges[period] || ranges.weekly;
};
// Source Code Analytics - Track source_hash performance and quality
const getSourceCodeAnalytics = async (req, res) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const userId = new mongoose_1.default.Types.ObjectId(req.user.id);
        const { period = 'weekly' } = req.query;
        const timeRange = getTimeRange(period);
        // Get source code performance with SOLD conversion tracking
        const sourceCodeData = await Lead_1.default.aggregate([
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
        const qualityAssignments = await SourceCodeQuality_1.default.find({ userId }).lean();
        const qualityMap = new Map(qualityAssignments.map((q) => [q.sourceCode, q.quality]));
        // Enhance data with quality information
        const enhancedData = sourceCodeData.map((item) => ({
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
    }
    catch (error) {
        console.error('[getSourceCodeAnalytics] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get source code analytics'
        });
    }
};
exports.getSourceCodeAnalytics = getSourceCodeAnalytics;
// CPA Analytics - Cost Per Acquisition analysis
const getCPAAnalytics = async (req, res) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const userId = new mongoose_1.default.Types.ObjectId(req.user.id);
        const { period = 'weekly' } = req.query;
        const timeRange = getTimeRange(period);
        // SOLD leads base query
        const soldQuery = {
            tenantId: userId,
            disposition: 'SOLD',
            createdAt: { $gte: timeRange.start, $lte: timeRange.end }
        };
        // CPA calculation with detailed lead breakdown
        const cpaData = await Lead_1.default.aggregate([
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
    }
    catch (error) {
        console.error('[getCPAAnalytics] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get CPA analytics'
        });
    }
};
exports.getCPAAnalytics = getCPAAnalytics;
// Campaign Analytics - Campaign performance based on SOLD conversions
const getCampaignAnalytics = async (req, res) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const userId = new mongoose_1.default.Types.ObjectId(req.user.id);
        const { period = 'weekly' } = req.query;
        const timeRange = getTimeRange(period);
        const campaignData = await Lead_1.default.aggregate([
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
    }
    catch (error) {
        console.error('[getCampaignAnalytics] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get campaign analytics'
        });
    }
};
exports.getCampaignAnalytics = getCampaignAnalytics;
// Lead Details Analytics - Comprehensive lead data with source codes
const getLeadDetailsAnalytics = async (req, res) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const userId = new mongoose_1.default.Types.ObjectId(req.user.id);
        const { period = 'weekly' } = req.query;
        const timeRange = getTimeRange(period);
        const leadDetails = await Lead_1.default.aggregate([
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
    }
    catch (error) {
        console.error('[getLeadDetailsAnalytics] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get lead details analytics'
        });
    }
};
exports.getLeadDetailsAnalytics = getLeadDetailsAnalytics;
// Demographics Analytics - Geographic SOLD distribution analysis
const getDemographicsAnalytics = async (req, res) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const userId = new mongoose_1.default.Types.ObjectId(req.user.id);
        const { period = 'weekly' } = req.query;
        const timeRange = getTimeRange(period);
        const demographicsData = await Lead_1.default.aggregate([
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
    }
    catch (error) {
        console.error('[getDemographicsAnalytics] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get demographics analytics'
        });
    }
};
exports.getDemographicsAnalytics = getDemographicsAnalytics;
