const xlsx = require('xlsx');

try {
  const workbook = xlsx.readFile('/Users/justinevans/Desktop/Program Dashboard/Supervision.xlsx');
  console.log("Sheet names:");
  console.log(workbook.SheetNames);
  
  workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet, { defval: '' });
      console.log(`\n--- ${sheetName} ---`);
      if (data.length > 0) {
        console.log("Total rows:", data.length);
        console.log("First row headers:", Object.keys(data[0]));
      } else {
        console.log("Empty sheet or no headers parsed.");
      }
  });
} catch (e) {
  console.error("Error reading file:", e.message);
}
