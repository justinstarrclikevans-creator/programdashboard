import { useState } from 'react';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import './index.css';

function App() {
  const [data, setData] = useState(null);

  if (!data) {
    return <FileUpload onDataLoaded={setData} />;
  }

  return <Dashboard data={data} />;
}

export default App;
