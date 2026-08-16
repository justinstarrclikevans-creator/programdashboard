import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { parseISO, differenceInWeeks, startOfWeek, isAfter, isBefore, addDays } from 'date-fns';

// Helper to determine if a date is within the "current active week"
// "The current active week is defined as the week that started the most recent Monday with the active week ending on Friday."
export const isDateInCurrentActiveWeek = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const now = new Date();
  
  // Find the most recent Monday
  const currentMonday = startOfWeek(now, { weekStartsOn: 1 });
  // Active week ends on Friday
  const currentFriday = addDays(currentMonday, 4);

  return !isBefore(date, currentMonday) && !isAfter(date, currentFriday);
};

export const parseData = async (excelFile, csvFile) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Parse Excel
      const excelBuffer = await excelFile.arrayBuffer();
      const workbook = XLSX.read(excelBuffer, { type: 'array' });
      
      const readSheet = (name) => {
        // Excel truncates sheet names at 31 chars.
        // We match any sheet that starts with the first 15 chars of the expected name
        // and also contains "Rows" or just directly match if it's short.
        const prefix = name.substring(0, 15).toLowerCase();
        const actualName = workbook.SheetNames.find(sn => 
          sn.toLowerCase().startsWith(prefix) && sn.includes('Rows')
        ) || workbook.SheetNames.find(sn => sn.toLowerCase().startsWith(prefix));
        
        const sheet = actualName ? workbook.Sheets[actualName] : null;
        return sheet ? XLSX.utils.sheet_to_json(sheet, { defval: '' }) : [];
      };

      const sheets = {
        currentFirstShift: readSheet('Current 1st Shift'),
        firstShiftPoints: readSheet('1st Shift Points'),
        drugTesting: readSheet('1st Shift Drug Testing'),
        caseManagement: readSheet('1st Shift Case Management'),
        lscmi: readSheet('1st Shift LSCMI and Brief'),
        reentryAftercare: readSheet('Reentry and Aftercare'),
        orientations: readSheet('Orientations'),
        enrollments: readSheet('Enrollments'),
        waitlist: readSheet('Waitlist'),
        jobChecks: readSheet('Job Checks'),
        screenings: readSheet('Screenings'),
        exits: readSheet('First Shift Exits'),
        intakes: readSheet('Intakes'),
        referrals: readSheet('Referrals'),
      };

      // Parse CSV
      const csvText = await csvFile.text();
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve({ sheets, briefcase: results.data });
        },
        error: (err) => {
          reject(err);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
};
