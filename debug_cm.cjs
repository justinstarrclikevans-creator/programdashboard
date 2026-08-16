const xlsx = require('xlsx');

try {
  const workbook = xlsx.readFile('/Users/justinevans/Desktop/Program Dashboard/Supervision.xlsx');
  
  const cmName = workbook.SheetNames.find(n => n.startsWith('1st Shift Case Manageme'));
  if (cmName) {
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[cmName], { defval: '' });
    const contexts = new Set();
    data.forEach(row => {
      if (row['Service Context']) contexts.add(row['Service Context']);
    });
    console.log("Service Contexts in Case Management:", Array.from(contexts));
  } else {
    console.log("Sheet not found");
  }

} catch (e) {
  console.error("Error reading file:", e.message);
}
