import { useState } from 'react';
import { UploadCloud, AlertCircle } from 'lucide-react';
import { parseData } from '../lib/parser';

export default function FileUpload({ onDataLoaded }) {
  const [files, setFiles] = useState({ excel: null, csv: null });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDrop = (e, type) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFiles(prev => ({ ...prev, [type]: droppedFile }));
    }
  };

  const handleChange = (e, type) => {
    if (e.target.files.length > 0) {
      setFiles(prev => ({ ...prev, [type]: e.target.files[0] }));
    }
  };

  const handleProcess = async () => {
    if (!files.excel || !files.csv) {
      setError('Please upload both the Supervision Excel file and the Master Briefcase CSV file.');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const data = await parseData(files.excel, files.csv);
      onDataLoaded(data);
    } catch (err) {
      setError('Failed to parse files: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-50">
      <div className="w-full max-w-2xl p-8 bg-white rounded-xl shadow-sm border border-slate-200">
        <h1 className="text-3xl font-bold text-center text-slate-800 mb-2">Program Dashboard</h1>
        <p className="text-center text-slate-500 mb-8">Upload your program data files to view the dashboard.</p>

        <div className="space-y-6">
          <div 
            className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-colors ${files.excel ? 'border-green-400 bg-green-50' : 'border-slate-300 hover:border-blue-400 bg-slate-50'}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, 'excel')}
          >
            <UploadCloud className={`w-10 h-10 mb-3 ${files.excel ? 'text-green-500' : 'text-slate-400'}`} />
            <p className="text-sm font-medium text-slate-700 mb-1">
              {files.excel ? files.excel.name : 'Upload Supervision.xlsx'}
            </p>
            <p className="text-xs text-slate-500 mb-4">Drag & drop or click to select</p>
            <input type="file" accept=".xlsx" onChange={(e) => handleChange(e, 'excel')} className="hidden" id="excel-upload" />
            <label htmlFor="excel-upload" className="cursor-pointer px-4 py-2 bg-white border border-slate-200 rounded-md text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
              Select Excel File
            </label>
          </div>

          <div 
            className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-colors ${files.csv ? 'border-green-400 bg-green-50' : 'border-slate-300 hover:border-blue-400 bg-slate-50'}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, 'csv')}
          >
            <UploadCloud className={`w-10 h-10 mb-3 ${files.csv ? 'text-green-500' : 'text-slate-400'}`} />
            <p className="text-sm font-medium text-slate-700 mb-1">
              {files.csv ? files.csv.name : 'Upload Master Briefcase Export.csv'}
            </p>
            <p className="text-xs text-slate-500 mb-4">Drag & drop or click to select</p>
            <input type="file" accept=".csv" onChange={(e) => handleChange(e, 'csv')} className="hidden" id="csv-upload" />
            <label htmlFor="csv-upload" className="cursor-pointer px-4 py-2 bg-white border border-slate-200 rounded-md text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
              Select CSV File
            </label>
          </div>

          {error && (
            <div className="flex items-center p-4 bg-red-50 text-red-700 rounded-md">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleProcess}
            disabled={!files.excel || !files.csv || loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Processing...' : 'View Dashboard'}
          </button>
        </div>
      </div>
    </div>
  );
}
