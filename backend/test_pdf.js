const pdf = require('pdf-parse');
const fs = require('fs');

console.log("Testing pdf-parse...");
try {
    // Just testing the import and initialization
    console.log("Imported successfully.");
} catch (e) {
    console.error("Error:", e.message);
}
