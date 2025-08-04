const fs = require("fs");
const { parse } = require("csv-parse/sync");

// Get CSV file path from command line
const csvPath = process.argv[2];

if (!csvPath) {
  console.log("Usage: node analyze-csv.js <path-to-csv-file>");
  process.exit(1);
}

try {
  console.log(`Analyzing CSV file: ${csvPath}\n`);

  const fileContent = fs.readFileSync(csvPath, "utf-8");
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    quote: '"',
    escape: '"',
    relax_quotes: true,
    relax_column_count: true,
    trim: true,
  });

  console.log(`Total records: ${records.length}\n`);

  if (records.length === 0) {
    console.log("No records found in CSV");
    process.exit(0);
  }

  // Get all unique field names
  const allFields = new Set();
  records.forEach((record) => {
    Object.keys(record).forEach((field) => allFields.add(field));
  });

  console.log(`Fields found in CSV:`);
  console.log("===================");
  Array.from(allFields)
    .sort()
    .forEach((field) => {
      console.log(`- ${field}`);
    });

  // Analyze field data
  console.log("\nField Analysis:");
  console.log("===============");

  const fieldStats = {};

  // Initialize stats
  allFields.forEach((field) => {
    fieldStats[field] = {
      total: 0,
      empty: 0,
      samples: [],
    };
  });

  // Collect stats
  records.forEach((record, index) => {
    Object.entries(record).forEach(([field, value]) => {
      if (value && value.trim() !== "") {
        fieldStats[field].total++;
        if (fieldStats[field].samples.length < 5) {
          fieldStats[field].samples.push(value);
        }
      } else {
        fieldStats[field].empty++;
      }
    });
  });

  // Display stats
  Object.entries(fieldStats)
    .sort()
    .forEach(([field, stats]) => {
      const percentFilled = ((stats.total / records.length) * 100).toFixed(1);
      console.log(`\n${field}:`);
      console.log(
        `  - Filled: ${stats.total}/${records.length} (${percentFilled}%)`,
      );
      console.log(`  - Empty: ${stats.empty}`);
      if (stats.samples.length > 0) {
        console.log(`  - Sample values:`);
        stats.samples.forEach((sample) => {
          console.log(`    * "${sample}"`);
        });
      }
    });

  // Show first 3 complete records
  console.log("\n\nFirst 3 Records (Complete):");
  console.log("===========================");
  records.slice(0, 3).forEach((record, index) => {
    console.log(`\nRecord ${index + 1}:`);
    Object.entries(record).forEach(([field, value]) => {
      if (value && value.trim() !== "") {
        console.log(`  ${field}: "${value}"`);
      }
    });
  });
} catch (error) {
  console.error("Error analyzing CSV:", error.message);
  process.exit(1);
}
