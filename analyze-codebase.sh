#!/bin/bash

# Script to analyze the Crokodial codebase and provide a comprehensive overview

echo "==== CROKODIAL CODEBASE ANALYSIS ===="
echo "$(date)"
echo ""

# Store the root directory
ROOT_DIR=$(pwd)
OUTPUT_FILE="$ROOT_DIR/codebase_analysis.txt"

# Initialize the output file
echo "# Crokodial Codebase Analysis" > "$OUTPUT_FILE"
echo "Generated on: $(date)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Function to count files by extension
count_files_by_extension() {
  local dir=$1
  echo "## File Counts by Extension (in $dir)" >> "$OUTPUT_FILE"
  echo "| Extension | Count |" >> "$OUTPUT_FILE"
  echo "|-----------|-------|" >> "$OUTPUT_FILE"
  
  find "$dir" -type f | grep -v "node_modules" | grep -v "dist" | grep -v ".git" | 
  sed -E 's/.*\.([^.]+)$/\1/' | sort | uniq -c | sort -rn |
  while read count ext; do
    if [ ! -z "$ext" ]; then
      echo "| .$ext | $count |" >> "$OUTPUT_FILE"
    fi
  done
  echo "" >> "$OUTPUT_FILE"
}

# Project structure overview
echo "## Project Structure" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
find "$ROOT_DIR/dialer-app" -type d -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/.git/*" | 
sort | sed -e "s|$ROOT_DIR/||" | sed -e 's|[^/]*/|  |g' >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Analyze frontend
echo "## Frontend Analysis" >> "$OUTPUT_FILE"
echo "### Package Dependencies" >> "$OUTPUT_FILE"
echo '```json' >> "$OUTPUT_FILE"
jq '.dependencies' "$ROOT_DIR/dialer-app/client/package.json" >> "$OUTPUT_FILE" 2>/dev/null || echo "Error: jq not installed or package.json not found" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "### Main Components" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
find "$ROOT_DIR/dialer-app/client/src/components" -type f -name "*.tsx" | 
sort | sed -e "s|$ROOT_DIR/dialer-app/client/src/components/||" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "### Pages/Routes" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
find "$ROOT_DIR/dialer-app/client/src/pages" -type f -name "*.tsx" 2>/dev/null | 
sort | sed -e "s|$ROOT_DIR/dialer-app/client/src/pages/||" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Analyze router configuration
if [ -f "$ROOT_DIR/dialer-app/client/src/App.tsx" ]; then
  echo "### Frontend Routes" >> "$OUTPUT_FILE"
  echo '```tsx' >> "$OUTPUT_FILE"
  grep -A 30 "Routes" "$ROOT_DIR/dialer-app/client/src/App.tsx" | grep -B 30 "/Routes" >> "$OUTPUT_FILE" 2>/dev/null
  echo '```' >> "$OUTPUT_FILE"
  echo "" >> "$OUTPUT_FILE"
fi

# Analyze backend
echo "## Backend Analysis" >> "$OUTPUT_FILE"
echo "### Package Dependencies" >> "$OUTPUT_FILE"
echo '```json' >> "$OUTPUT_FILE"
jq '.dependencies' "$ROOT_DIR/dialer-app/server/package.json" >> "$OUTPUT_FILE" 2>/dev/null || echo "Error: jq not installed or package.json not found" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "### API Routes" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
find "$ROOT_DIR/dialer-app/server/src/routes" -type f -name "*.ts" 2>/dev/null | 
sort | sed -e "s|$ROOT_DIR/dialer-app/server/src/routes/||" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "### API Endpoints" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
grep -r "router\.(get|post|put|delete|patch)" --include="*.ts" "$ROOT_DIR/dialer-app/server/src/routes" 2>/dev/null | 
sed -E 's/.*router\.(get|post|put|delete|patch)\("([^"]+)".*/\1 \2/' | sort >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "### Database Models" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
find "$ROOT_DIR/dialer-app/server/src/models" -type f -name "*.ts" 2>/dev/null | 
sort | sed -e "s|$ROOT_DIR/dialer-app/server/src/models/||" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# File counts
count_files_by_extension "$ROOT_DIR/dialer-app/client"
count_files_by_extension "$ROOT_DIR/dialer-app/server"

# Check for TODO comments
echo "## TODO Items in Code" >> "$OUTPUT_FILE"
echo "These may indicate incomplete features:" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"
grep -r "TODO" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" "$ROOT_DIR/dialer-app" | 
grep -v "node_modules" | sed -e "s|$ROOT_DIR/||" >> "$OUTPUT_FILE" 2>/dev/null
echo '```' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "Analysis complete! Results saved to $OUTPUT_FILE"
echo "To view the results, run: cat $OUTPUT_FILE" 