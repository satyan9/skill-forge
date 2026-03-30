import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import TCSGenerator from './pages/TCSGenerator';
import JSONFormatter from './pages/JSONFormatter';
import RegexTester from './pages/RegexTester';
import './index.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <Topbar />
          <div className="page-content">
            <Routes>
              <Route path="/" element={<Navigate to="/skill-forge" replace />} />
              <Route path="/skill-forge" element={<TCSGenerator />} />
              <Route path="/json-formatter" element={<JSONFormatter />} />
              <Route path="/regex-tester" element={<RegexTester />} />
            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;
