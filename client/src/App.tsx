import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import { Toaster } from 'react-hot-toast';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './layouts/DashboardLayout';

// Pages lazy/direct imports
import { LandingPage } from './pages/LandingPage';
import { AuthPages } from './pages/AuthPages';
import { Dashboard } from './pages/Dashboard';
import { AdminDashboard } from './pages/AdminDashboard';

// Tools components
import { PdfTools } from './features/pdf/PdfTools';
import { ImageTools } from './features/image/ImageTools';
import { ImageEditor } from './features/editor/ImageEditor';
import { OcrTools } from './features/ocr/OcrTools';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        {/* React Toast Alerts */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1E293B',
              color: '#F8FAFC',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
            },
            success: {
              iconTheme: {
                primary: '#22C55E',
                secondary: '#FFFFFF',
              },
            },
            error: {
              iconTheme: {
                primary: '#EF4444',
                secondary: '#FFFFFF',
              },
            },
          }}
        />

        <Routes>
          {/* Public Landing & Auth Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPages isLogin={true} />} />
          <Route path="/signup" element={<AuthPages isLogin={false} />} />
          <Route path="/forgot-password" element={<AuthPages isForgot={true} />} />
          <Route path="/reset-password/:token" element={<AuthPages isReset={true} />} />

          {/* Protected Tool Routes (Accessible by Guest, but routes mount in DashboardLayout if logged in) */}
          {/* To provide an integrated Workspace feel, tools can run inside DashboardLayout if logged in, otherwise they render standard Nav/Footer layout on Landing pages. We route them directly under DashboardLayout so users can use them inside their workspace, and also make guest paths available if not logged in. */}
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/files" element={
              <ProtectedRoute>
                <Dashboard isFilesView={true} />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/admin" element={
              <ProtectedRoute requireAdmin={true}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            
            {/* Tools are housed inside the DashboardLayout workspace */}
            <Route path="/tools/pdf" element={<PdfTools />} />
            <Route path="/tools/image" element={<ImageTools />} />
            <Route path="/tools/editor" element={<ImageEditor />} />
            <Route path="/tools/ocr" element={<OcrTools />} />
          </Route>

          {/* Fallback Catch-all redirecting to Landing */}
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
