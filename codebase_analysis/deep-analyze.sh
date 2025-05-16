#!/bin/bash

# Simple Analysis Script for Crokodial Application
# This script creates a basic overview of the application structure

# Create an output file
OUTPUT_FILE="codebase_overview.md"

echo "==== CROKODIAL ANALYSIS ===="
echo "$(date)"
echo "Creating overview file: $OUTPUT_FILE"
echo ""

# Initialize output file
echo "# Crokodial Codebase Overview" > "$OUTPUT_FILE"
echo "Generated on: $(date)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Basic directory structure
echo "## Directory Structure" >> "$OUTPUT_FILE"
echo "```" >> "$OUTPUT_FILE"
find dialer-app -type d -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/.git/*" | sort >> "$OUTPUT_FILE"
echo "```" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Frontend components
echo "## Frontend Components" >> "$OUTPUT_FILE"
echo "```" >> "$OUTPUT_FILE"
find dialer-app/client/src/components -type f -name "*.tsx" 2>/dev/null | sort >> "$OUTPUT_FILE"
echo "```" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Pages
echo "## Pages" >> "$OUTPUT_FILE"
echo "```" >> "$OUTPUT_FILE"
find dialer-app/client/src/pages -type f -name "*.tsx" 2>/dev/null | sort >> "$OUTPUT_FILE"
echo "```" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# API Routes
echo "## API Routes" >> "$OUTPUT_FILE"
echo "```" >> "$OUTPUT_FILE"
find dialer-app/server/src/routes -type f -name "*.ts" 2>/dev/null | sort >> "$OUTPUT_FILE"
echo "```" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Database Models
echo "## Database Models" >> "$OUTPUT_FILE"
echo "```" >> "$OUTPUT_FILE"
find dialer-app/server/src/models -type f -name "*.ts" 2>/dev/null | sort >> "$OUTPUT_FILE"
echo "```" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Context Providers
echo "## Context Providers" >> "$OUTPUT_FILE"
echo "```" >> "$OUTPUT_FILE"
find dialer-app/client/src/context -type f -name "*.tsx" 2>/dev/null | sort >> "$OUTPUT_FILE"
echo "```" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Find TODOs
echo "## TODO Items" >> "$OUTPUT_FILE"
echo "Locations of TODO comments in the codebase:" >> "$OUTPUT_FILE"
echo "```" >> "$OUTPUT_FILE"
grep -rn "TODO" --include="*.tsx" --include="*.ts" --include="*.js" dialer-app 2>/dev/null | grep -v "node_modules" >> "$OUTPUT_FILE"
echo "```" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Stats
echo "## Project Statistics" >> "$OUTPUT_FILE"
echo "- Total Files: $(find dialer-app -type f | grep -v "node_modules" | grep -v "dist" | grep -v ".git" | wc -l)" >> "$OUTPUT_FILE"
echo "- Frontend Components: $(find dialer-app/client/src/components -type f -name "*.tsx" 2>/dev/null | wc -l)" >> "$OUTPUT_FILE"
echo "- Pages: $(find dialer-app/client/src/pages -type f -name "*.tsx" 2>/dev/null | wc -l)" >> "$OUTPUT_FILE" 
echo "- API Routes: $(find dialer-app/server/src/routes -type f -name "*.ts" 2>/dev/null | wc -l)" >> "$OUTPUT_FILE"
echo "- Data Models: $(find dialer-app/server/src/models -type f -name "*.ts" 2>/dev/null | wc -l)" >> "$OUTPUT_FILE"
echo "- Context Providers: $(find dialer-app/client/src/context -type f -name "*.tsx" 2>/dev/null | wc -l)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "Analysis complete! Results saved to $OUTPUT_FILE" 