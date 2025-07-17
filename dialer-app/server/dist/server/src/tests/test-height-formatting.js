"use strict";
/**
 * Test script for height formatting logic
 */
// Function to format height (first digit is feet, remaining digits are inches)
function formatHeight(height) {
    if (!height || height.length < 2)
        return height;
    const feet = height.charAt(0);
    const inches = height.substring(1);
    return `${feet}'${inches}"`;
}
// Test cases
const testCases = [
    { input: "50", expected: "5'0\"", description: "5 feet 0 inches" },
    { input: "59", expected: "5'9\"", description: "5 feet 9 inches" },
    { input: "510", expected: "5'10\"", description: "5 feet 10 inches" },
    { input: "60", expected: "6'0\"", description: "6 feet 0 inches" },
    { input: "65", expected: "6'5\"", description: "6 feet 5 inches" },
    { input: "70", expected: "7'0\"", description: "7 feet 0 inches" },
    { input: "410", expected: "4'10\"", description: "4 feet 10 inches" }
];
// Run tests
console.log("Testing height formatting function\n");
console.log("Format: input → output (description)\n");
let passedCount = 0;
let failedCount = 0;
testCases.forEach((testCase) => {
    const result = formatHeight(testCase.input);
    const passed = result === testCase.expected;
    if (passed) {
        passedCount++;
        console.log(`✓ "${testCase.input}" → "${result}" (${testCase.description})`);
    }
    else {
        failedCount++;
        console.error(`✗ "${testCase.input}" → "${result}" (expected: "${testCase.expected}" - ${testCase.description})`);
    }
});
console.log(`\nSummary: ${passedCount} passed, ${failedCount} failed`);
if (failedCount > 0) {
    process.exit(1);
}
else {
    console.log("\nAll tests passed! Height formatting is working correctly.");
}
