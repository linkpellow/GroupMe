# Stats Dashboard Implementation Plan

## Overview
This document outlines the implementation plan for five comprehensive analytics dashboard screens focused on SOLD lead performance analysis.

## Screen 1: Source Hash Analytics
**Purpose**: Track source code performance and quality metrics
**Data Sources**: MongoDB leads collection, aggregated by source_hash
**UI Notes**: Table with sortable columns, quality badge system, trend indicators
**Implementation**: New API endpoint `/api/analytics/sold/source-codes`

## Screen 2: Cost Per Acquisition (CPA) Analytics  
**Purpose**: Analyze cost efficiency and ROI for different acquisition channels
**Data Sources**: Lead costs, conversion data, campaign spend metrics
**UI Notes**: Charts showing cost trends, profitability analysis, budget allocation
**Implementation**: New API endpoint `/api/analytics/sold/cpa`

## Screen 3: Campaign Performance Analytics
**Purpose**: Evaluate campaign effectiveness and conversion rates
**Data Sources**: Campaign data, lead attribution, conversion tracking
**UI Notes**: Performance cards, conversion funnel, campaign comparison
**Implementation**: New API endpoint `/api/analytics/sold/campaigns`

## Screen 4: Source Code Breakdown Analytics
**Purpose**: Detailed breakdown of lead sources with comprehensive metrics
**Data Sources**: Source code data, quality ratings, performance history
**UI Notes**: Detailed table with filtering, quality management, export options
**Implementation**: New API endpoint `/api/analytics/sold/lead-details`

## Screen 5: Demographic Map Analytics
**Purpose**: Geographic distribution and performance visualization
**Data Sources**: Lead location data, state-level performance metrics
**UI Notes**: Interactive US map, state-level drill-down, performance heatmap
**Implementation**: New API endpoint `/api/analytics/sold/demographics`

## Implementation Guidelines
- All screens require authentication middleware
- Data must be filtered by tenantId for multi-tenant security
- Time-based filtering (30 days, 6 months, 1 year) on all screens
- Responsive design with mobile optimization
- Loading states and error handling for all API calls
- Professional UI using Chakra UI component library

## Data Requirements
- MongoDB aggregation pipelines for efficient data processing
- Proper indexing on frequently queried fields
- Caching strategy for improved performance
- Real-time data updates where applicable

## Testing Strategy
- Unit tests for all new API endpoints
- Integration tests for dashboard components
- End-to-end testing for user workflows
- Performance testing for data-heavy operations 