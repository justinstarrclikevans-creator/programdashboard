import { useState, useMemo } from 'react';
import { differenceInWeeks, differenceInDays } from 'date-fns';
import { Check, X, AlertCircle } from 'lucide-react';
import { isDateInCurrentActiveWeek } from '../lib/parser';

export default function Dashboard({ data }) {
  const [activeTab, setActiveTab] = useState('overview');
  
  const { sheets, briefcase } = data;

  // Process data for Overview
  const metrics = useMemo(() => {
    const locations = ['Charleston', 'Columbia', 'Spartanburg'];
    
    // Overall counts
    const overview = {
      screenings: sheets.screenings.length,
      intakes: sheets.intakes.length,
      enrollments: sheets.enrollments.length,
      exits: sheets.exits.length,
    };

    // By Location (assuming there is a 'Location' or 'Center' column, or we get it from briefcase if mapped)
    // The instructions don't specify which column 'Location' is in the Supervision sheets.
    // Let's assume it exists in the respective sheets or map from Briefcase.
    const mapLocation = (record) => {
      // Trying to find location from briefcase first
      const name = (record['First Name'] || record['Name'] || '').toString().trim().toLowerCase();
      const lastName = (record['Last Name'] || '').toString().trim().toLowerCase();
      
      const briefCaseMatch = briefcase.find(b => {
        const bName = (b['First Name'] || '').toString().trim().toLowerCase();
        const bLast = (b['Last Name'] || '').toString().trim().toLowerCase();
        return (bName === name && bLast === lastName) || bName === name;
      });

      return record['At which Turn90 Center is the client...'] || 
             record['At which Turn90 Center is the client currently enrolled?'] ||
             record['Location'] || 
             record['Center'] || 
             briefCaseMatch?.Location || 
             'Unknown';
    };

    const countByLocation = (sheetData) => {
      const counts = { Charleston: 0, Columbia: 0, Spartanburg: 0, Unknown: 0 };
      sheetData.forEach(row => {
        const loc = mapLocation(row);
        if (counts[loc] !== undefined) counts[loc]++;
      });
      return counts;
    };

    const locationMetrics = {
      intakes: countByLocation(sheets.intakes),
      enrollments: countByLocation(sheets.enrollments),
      exits: countByLocation(sheets.exits),
      upcomingOrientations: countByLocation(sheets.orientations),
      waitlist: countByLocation(sheets.waitlist),
    };

    return { overview, locationMetrics };
  }, [sheets, briefcase]);

  // Process data for Current 1st Shift
  const currentFirstShiftData = useMemo(() => {
    return sheets.currentFirstShift.map(participant => {
      const first = (participant['First'] || participant['First Name'] || '').toString().trim();
      const last = (participant['Last'] || participant['Last Name'] || '').toString().trim();
      const name = `${first} ${last}`.trim();
      
      // Calculate weeks enrolled
      const startDate = participant['Enrollment Start Date:'] || participant['Enrollment start date'] || participant['Start Date'];
      let weeksEnrolled = 0;
      if (startDate) {
        weeksEnrolled = differenceInWeeks(new Date(), new Date(startDate)) + 1;
      }

      // Find points for current active week
      const pointsRecord = sheets.firstShiftPoints.find(p => {
        const pFirst = (p['First'] || p['First Name'] || '').toString().trim();
        const pLast = (p['Last'] || p['Last Name'] || '').toString().trim();
        return `${pFirst} ${pLast}`.trim().toLowerCase() === name.toLowerCase();
      });
      let currentWeekPoints = 0;
      if (pointsRecord) {
         // Assuming the points sheet has columns that are dates or "Week X" mapped to a date
         // Or a single 'Current Week Points' column. If we don't know, we will just try to find a column that is a recent date.
         // Let's look for any column whose header is a date in the current active week
         for (const [key, value] of Object.entries(pointsRecord)) {
           if (isDateInCurrentActiveWeek(key)) {
             currentWeekPoints = Number(value) || 0;
           }
         }
         // Fallback if there's a generic 'Points' column
         if (currentWeekPoints === 0 && pointsRecord['Total Points']) {
            currentWeekPoints = pointsRecord['Total Points']; // Placeholder logic
         }
      }

      // Checkboxes: Drug test this week
      const drugTestRecord = sheets.drugTesting.find(d => {
        const dFirst = (d['First'] || d['First Name'] || '').toString().trim();
        const dLast = (d['Last'] || d['Last Name'] || '').toString().trim();
        return `${dFirst} ${dLast}`.trim().toLowerCase() === name.toLowerCase();
      });
      let drugTestThisWeek = false;
      if (drugTestRecord) {
        for (const [key, value] of Object.entries(drugTestRecord)) {
          if (isDateInCurrentActiveWeek(key) || isDateInCurrentActiveWeek(value)) {
            drugTestThisWeek = true;
          }
        }
      }

      // Checkboxes: Case management this week
      const cmRecord = sheets.caseManagement.find(c => {
        const cFirst = (c['First'] || c['First Name'] || '').toString().trim();
        const cLast = (c['Last'] || c['Last Name'] || '').toString().trim();
        return `${cFirst} ${cLast}`.trim().toLowerCase() === name.toLowerCase();
      });
      let cmThisWeek = false;
      let recentCMNote = '';
      if (cmRecord) {
        for (const [key, value] of Object.entries(cmRecord)) {
          if (isDateInCurrentActiveWeek(key) || isDateInCurrentActiveWeek(value) || key.toLowerCase().includes('date')) {
             if (isDateInCurrentActiveWeek(value) || isDateInCurrentActiveWeek(key)) {
                cmThisWeek = true;
             }
             if (value && typeof value === 'string' && value.length > 10) {
               recentCMNote = value; // capturing note for feedback
             }
          }
        }
      }

      // Historical checkboxes
      const infoComplete = Object.keys(participant).length > 3; // Basic assumption if many fields filled
      const lscmiRecord = sheets.lscmi.find(l => {
        const lFirst = (l['First'] || l['First Name'] || '').toString().trim();
        const lLast = (l['Last'] || l['Last Name'] || '').toString().trim();
        return `${lFirst} ${lLast}`.trim().toLowerCase() === name.toLowerCase();
      });
      const lscmiComplete = !!lscmiRecord;
      const casePlanComplete = lscmiRecord && 
         (lscmiRecord['Focus Area 1'] && lscmiRecord['Focus Area 2'] && lscmiRecord['My goal while at Turn90 is']);

      // Find location
      const briefCaseMatch = briefcase.find(b => (b['First Name'] || '').toString().trim().toLowerCase() === name.toLowerCase());
      const location = participant['At which Turn90 Center is the client...'] || 
                       participant['At which Turn90 Center is the client currently enrolled?'] ||
                       participant['Location'] || 
                       briefCaseMatch?.Location || 
                       'Unknown';

      // Find job checks
      const jobCheckRecord = sheets.jobChecks.find(j => {
        const jFirst = (j['First'] || j['First Name'] || '').toString().trim();
        const jLast = (j['Last'] || j['Last Name'] || '').toString().trim();
        return `${jFirst} ${jLast}`.trim().toLowerCase() === name.toLowerCase();
      });
      let jobCheckDaysAgo = 0;
      if (jobCheckRecord && jobCheckRecord['Last Check Date']) {
         jobCheckDaysAgo = differenceInDays(new Date(), new Date(jobCheckRecord['Last Check Date']));
      }

      const briefcaseRecord = briefcase.find(b => {
        const bName = (b['First Name'] || '').toString().trim().toLowerCase();
        const bLast = (b['Last Name'] || '').toString().trim().toLowerCase();
        return (bName === name.toLowerCase().split(' ')[0] && bLast === name.toLowerCase().split(' ')[1]) || bName === name.toLowerCase();
      });

      return {
        name,
        location,
        weeksEnrolled,
        currentWeekPoints,
        drugTestThisWeek,
        cmThisWeek,
        infoComplete,
        lscmiComplete,
        casePlanComplete: !!casePlanComplete,
        recentCMNote,
        jobCheckDaysAgo,
        lscmiRecord,
        briefcaseRecord
      };
    });
  }, [sheets, briefcase]);

  const feedbackData = useMemo(() => {
    // Generate feedback for first shift
    const locationFeedback = { Charleston: [], Columbia: [], Spartanburg: [] };
    
    currentFirstShiftData.forEach(p => {
      const issues = [];
      const todos = [];

      // Points and Compliance
      if (p.currentWeekPoints < 50) issues.push(`Low points this week (${p.currentWeekPoints}).`);
      if (!p.infoComplete) todos.push("Complete First Shift Intake info.");
      if (!p.lscmiComplete) todos.push("Complete LSCMI.");
      if (!p.casePlanComplete) todos.push("Complete Case Plan (Focus Areas and Goal).");
      if (!p.drugTestThisWeek) todos.push("Administer drug test for this week.");
      if (!p.cmThisWeek) todos.push("Complete case management meeting for this week.");
      if (p.jobCheckDaysAgo > 30) todos.push(`Complete Job Check (overdue by ${p.jobCheckDaysAgo - 30} days).`);

      // Briefcase Todos
      if (p.briefcaseRecord) {
        if (!p.briefcaseRecord['CS: State ID']) todos.push("Briefcase: Obtain State ID.");
        if (!p.briefcaseRecord['ER: Resume Completed']) todos.push("Briefcase: Complete Resume.");
        if (!p.briefcaseRecord['FIN: Bank Account']) todos.push("Briefcase: Open Bank Account.");
      }

      // CBT with JIC Recommendations based on top LSCMI scores
      let cbtRecommendations = [];
      if (p.lscmiRecord) {
        const domains = [
          { key: '1.6 Score in Alcohol / Drug Problem (ADP)', topic: 'Substance Abuse & Relapse Prevention' },
          { key: '1.8 Score in Antisocial Pattern (AP)', topic: 'Antisocial Patterns & Anger Management' },
          { key: '1.7 Score in Procriminal Attitudes (PA)', topic: 'Procriminal Attitudes & Cognitive Restructuring' },
          { key: '1.5 Score in Companions (CO)', topic: 'Social Skills & Peer Relationships' },
          { key: '1.2 Score for Employment / Education (EE)', topic: 'Employment Skills & Problem Solving' },
          { key: '1.3 Score for Family / Martial (FM)', topic: 'Family Relationships & Conflict Resolution' },
          { key: '1.4 Score for Leisure / Recreation (LR)', topic: 'Positive Leisure Activities' }
        ];

        const scores = domains.map(d => ({
          ...d,
          score: parseInt(p.lscmiRecord[d.key] || 0, 10)
        })).sort((a, b) => b.score - a.score);

        // Take top 2 highest scores greater than 0
        const topScores = scores.filter(s => s.score > 0).slice(0, 2);
        cbtRecommendations = topScores.map(s => `CBT Focus: ${s.topic} (Score: ${s.score})`);
      }
      
      if (issues.length > 0 || todos.length > 0 || p.recentCMNote || cbtRecommendations.length > 0) {
        if (locationFeedback[p.location]) {
          locationFeedback[p.location].push({
            name: p.name,
            issues,
            todos,
            cbtRecommendations,
            note: p.recentCMNote
          });
        }
      }
    });

    // Reentry and Aftercare
    const reentryFeedback = sheets.reentryAftercare.map(p => {
       const first = (p['First'] || p['First Name'] || '').toString().trim();
       const last = (p['Last'] || p['Last Name'] || '').toString().trim();
       const name = `${first} ${last}`.trim() || 'Unknown';
       const note = p['Notes'] || p['Note'] || '';
       return { name, note };
    });

    return { locationFeedback, reentryFeedback };
  }, [currentFirstShiftData, sheets.reentryAftercare]);

  const locations = ['Charleston', 'Columbia', 'Spartanburg'];
  const tabs = ['overview', 'current_first_shift', ...locations.map(l => l.toLowerCase()), 'reentry'];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-xl font-bold text-slate-800">Program Dashboard</h1>
        <div className="text-sm text-slate-500">
          Last Updated: {new Date().toLocaleDateString()}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col overflow-y-auto">
          <nav className="p-4 space-y-1">
            <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeTab === 'overview' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'}`}>Overview</button>
            <button onClick={() => setActiveTab('current_first_shift')} className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeTab === 'current_first_shift' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'}`}>Current 1st Shift</button>
            
            <div className="pt-4 pb-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Locations Feedback</div>
            {locations.map(loc => (
              <button key={loc} onClick={() => setActiveTab(loc.toLowerCase())} className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeTab === loc.toLowerCase() ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'}`}>{loc}</button>
            ))}

            <div className="pt-4 pb-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Other Programs</div>
            <button onClick={() => setActiveTab('reentry')} className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeTab === 'reentry' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'}`}>Reentry & Aftercare</button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-8">
          
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800">Overall Metrics</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {Object.entries(metrics.overview).map(([key, value]) => (
                  <div key={key} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">{key}</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
                  </div>
                ))}
              </div>

              <h2 className="text-2xl font-bold text-slate-800 mt-10">Metrics by Location</h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {locations.map(loc => (
                  <div key={loc} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
                      <h3 className="text-lg font-semibold text-slate-800">{loc}</h3>
                    </div>
                    <div className="p-4 space-y-3">
                      {Object.keys(metrics.locationMetrics).map(metricKey => (
                        <div key={metricKey} className="flex justify-between items-center">
                          <span className="text-sm text-slate-600 capitalize">{metricKey.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span className="text-sm font-medium text-slate-900 bg-slate-100 px-2 py-1 rounded-full">{metrics.locationMetrics[metricKey]?.[loc] || 0}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'current_first_shift' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800">Current 1st Shift</h2>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Location</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Weeks Enrolled</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Current Pts</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Drug Test</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Case Mgmt</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Info Complete</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">LSCMI</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Case Plan</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {currentFirstShiftData.map((p, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{p.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{p.location}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{p.weeksEnrolled}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{p.currentWeekPoints}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">{p.drugTestThisWeek ? <Check className="w-5 h-5 text-green-500 mx-auto"/> : <X className="w-5 h-5 text-red-500 mx-auto"/>}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">{p.cmThisWeek ? <Check className="w-5 h-5 text-green-500 mx-auto"/> : <X className="w-5 h-5 text-red-500 mx-auto"/>}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">{p.infoComplete ? <Check className="w-5 h-5 text-green-500 mx-auto"/> : <X className="w-5 h-5 text-red-500 mx-auto"/>}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">{p.lscmiComplete ? <Check className="w-5 h-5 text-green-500 mx-auto"/> : <X className="w-5 h-5 text-red-500 mx-auto"/>}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">{p.casePlanComplete ? <Check className="w-5 h-5 text-green-500 mx-auto"/> : <X className="w-5 h-5 text-red-500 mx-auto"/>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {locations.map(loc => loc.toLowerCase() === activeTab && (
            <div key={loc} className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800">{loc} - First Shift Feedback</h2>
              <div className="space-y-4">
                {feedbackData.locationFeedback[loc]?.length > 0 ? feedbackData.locationFeedback[loc].map((fb, i) => (
                  <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-800 mb-3">{fb.name}</h3>
                    {fb.issues.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1 text-amber-500"/> Issues
                        </h4>
                        <ul className="list-disc list-inside space-y-1">
                          {fb.issues.map((issue, j) => (
                            <li key={j} className="text-sm text-slate-700">{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {fb.todos && fb.todos.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2 flex items-center">
                          <Check className="w-4 h-4 mr-1 text-blue-500"/> Actionable Todos
                        </h4>
                        <ul className="list-disc list-inside space-y-1">
                          {fb.todos.map((todo, j) => (
                            <li key={j} className="text-sm text-slate-700">{todo}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {fb.cbtRecommendations && fb.cbtRecommendations.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1 text-purple-500"/> CBT with JIC Recommendations
                        </h4>
                        <ul className="list-disc list-inside space-y-1">
                          {fb.cbtRecommendations.map((rec, j) => (
                            <li key={j} className="text-sm text-slate-700">{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {fb.note && (
                      <div>
                        <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Recent CM Note</h4>
                        <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-md border border-slate-100">{fb.note}</p>
                      </div>
                    )}
                  </div>
                )) : (
                  <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
                    No feedback issues for this location.
                  </div>
                )}
              </div>
            </div>
          ))}

          {activeTab === 'reentry' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800">Reentry & Aftercare</h2>
              <div className="space-y-4">
                {feedbackData.reentryFeedback.length > 0 ? feedbackData.reentryFeedback.map((fb, i) => (
                  <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">{fb.name}</h3>
                    <div>
                      <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Notes</h4>
                      <p className="text-sm text-slate-600">{fb.note || 'No notes available.'}</p>
                    </div>
                  </div>
                )) : (
                  <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
                    No Reentry & Aftercare participants found.
                  </div>
                )}
              </div>
            </div>
          )}
          
        </main>
      </div>
    </div>
  );
}
