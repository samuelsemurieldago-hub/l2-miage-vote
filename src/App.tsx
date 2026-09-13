import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { VoteSessionProvider } from './context/VoteSessionContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminLayout } from './components/AdminLayout';
import { ErrorBoundary } from './components/ErrorBoundary';

import Home from './pages/Home';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCandidates from './pages/admin/AdminCandidates';
import AdminCodes from './pages/admin/AdminCodes';
import AdminElection from './pages/admin/AdminElection';
import AdminResults from './pages/admin/AdminResults';
import AdminSettings from './pages/admin/AdminSettings';
import AdminTracking from './pages/admin/AdminTracking';
import VoteCodeEntry from './pages/vote/VoteCodeEntry';
import VoteBallot from './pages/vote/VoteBallot';
import VoteDone from './pages/vote/VoteDone';

// The admin area is the only part of the app that needs Supabase Auth —
// keeping AuthProvider scoped here means an auth hiccup can never take
// down the public student-facing pages.
function AdminArea() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<AdminLogin />} />

        {/* Sous-admin's only page — any authenticated user, no sidebar/layout. */}
        <Route
          path="suivi"
          element={
            <ProtectedRoute>
              <AdminTracking />
            </ProtectedRoute>
          }
        />

        <Route
          element={
            <ProtectedRoute requireFullAdmin>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="candidates" element={<AdminCandidates />} />
          <Route path="codes" element={<AdminCodes />} />
          <Route path="election" element={<AdminElection />} />
          <Route path="results" element={<AdminResults />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <VoteSessionProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />

            <Route path="/vote" element={<VoteCodeEntry />} />
            <Route path="/vote/ballot" element={<VoteBallot />} />
            <Route path="/vote/done" element={<VoteDone />} />

            <Route path="/admin/*" element={<AdminArea />} />

            <Route path="*" element={<Home />} />
          </Routes>
        </BrowserRouter>
      </VoteSessionProvider>
    </ErrorBoundary>
  );
}
