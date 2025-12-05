import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ContestProvider } from './contexts/ContestContext';
import { Toaster } from './components/ui/toaster';
import ProtectedRoute from './components/ProtectedRoute';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';

// Contestant Pages
import Dashboard from './pages/Dashboard';
import CodingPage from './pages/CodingPage';

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminParticipants from './pages/admin/AdminParticipants';
import AdminParticipantDetail from './pages/admin/AdminParticipantDetail';
import AdminProblems from './pages/admin/AdminProblems';
import AdminRoundControls from './pages/admin/AdminRoundControls';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ContestProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* Protected Contestant Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/:roundId"
              element={
                <ProtectedRoute>
                  <CodingPage />
                </ProtectedRoute>
              }
            />

            {/* Protected Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/participants"
              element={
                <ProtectedRoute adminOnly>
                  <AdminParticipants />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/participant/:id"
              element={
                <ProtectedRoute adminOnly>
                  <AdminParticipantDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/problems"
              element={
                <ProtectedRoute adminOnly>
                  <AdminProblems />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/rounds"
              element={
                <ProtectedRoute adminOnly>
                  <AdminRoundControls />
                </ProtectedRoute>
              }
            />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
          <Toaster />
        </ContestProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
