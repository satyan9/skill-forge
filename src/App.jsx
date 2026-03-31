import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import TCSGenerator from './pages/TCSGenerator';
import JSONFormatter from './pages/JSONFormatter';
import RegexTester from './pages/RegexTester';
import AuthPage from './pages/AuthPage';
import HistoryPage from './pages/HistoryPage';
import ProfilePage from './pages/ProfilePage';
import './index.css';

function AppLayout({ children }) {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <Routes>
            {/* Public auth route */}
            <Route path="/auth" element={<AuthPage />} />

            {/* Protected app routes */}
            <Route path="/" element={<Navigate to="/skill-forge" replace />} />

            <Route path="/skill-forge" element={
              <ProtectedRoute>
                <AppLayout>
                  <TCSGenerator />
                </AppLayout>
              </ProtectedRoute>
            } />

            <Route path="/history" element={
              <ProtectedRoute>
                <AppLayout>
                  <HistoryPage />
                </AppLayout>
              </ProtectedRoute>
            } />

            <Route path="/json-formatter" element={
              <ProtectedRoute>
                <AppLayout>
                  <JSONFormatter />
                </AppLayout>
              </ProtectedRoute>
            } />

            <Route path="/regex-tester" element={
              <ProtectedRoute>
                <AppLayout>
                  <RegexTester />
                </AppLayout>
              </ProtectedRoute>
            } />

            <Route path="/profile" element={
              <ProtectedRoute>
                <AppLayout>
                  <ProfilePage />
                </AppLayout>
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
