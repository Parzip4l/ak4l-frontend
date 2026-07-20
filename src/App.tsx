import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { TopNavigation } from "@/components/Layout/TopNavigation";
import { ProtectedRoute } from "@/components/Layout/ProtectedRoute";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
// import Unauthorized from "./pages/Unauthorized"; 

// QSHE Module Pages
import SafetyMetrics from "./pages/QSHE/SafetyMetrics";
import SafetyAdmin from "./pages/QSHE/SafetyAdmin";
import RikesNapza from "./pages/QSHE/RikesNapza";
import MedicalOnsite from "./pages/QSHE/MedicalOnsite";

// Security Module Pages
import SecurityMetrics from "./pages/Security/SecurityMetrics";
import SecurityAdmin from "./pages/Security/SecurityAdmin";
import BUJPReports from "./pages/Security/BUJPReports";
import CompetencyMonitoring from "./pages/Security/CompetencyMonitoring";
import VisitorManagement from "./pages/Security/VisitorManagement";
import VMSAdmin from "./pages/Security/VMSAdmin";
import EptwPermitCheck from "./pages/Security/EptwPermitCheck";

// User Management
import UserManagement from "./pages/UserManagement/UserManagement";

// Apar Hydrant 
import AparHydrantDashboard from "./pages/AparHydrant/AparDashboardPage";
import AparReportPage from "./pages/AparHydrant/AparSchedulePage";
import AparHydrantListPage from "./pages/AparHydrant/AparListPage";
import AdminPage from "./pages/AparHydrant/AparAdminPage";

// Reports
import Reports from "./pages/Reports";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={<div className="p-10 text-center"><h1>403 - Unauthorized</h1></div>} />
            
            {/* Protected routes with navigation */}
            <Route path="/" element={
              <ProtectedRoute>
                <TopNavigation>
                    <Dashboard />
                </TopNavigation>
              </ProtectedRoute>
            } />
            
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <TopNavigation>
                    <Dashboard />
                </TopNavigation>
              </ProtectedRoute>
            } />

            {/* QSHE Module Routes */}
            <Route path="/qshe/safety-metrics" element={
              <ProtectedRoute permission="safety_metrics.read">
                <TopNavigation>
                    <SafetyMetrics />
                </TopNavigation>
              </ProtectedRoute>
            } />
            
            <Route path="/qshe/safety-admin" element={
              <ProtectedRoute permission="safety_metrics.create">
                <TopNavigation>
                    <SafetyAdmin />
                </TopNavigation>
              </ProtectedRoute>
            } />
            
            <Route path="/qshe/rikes-napza" element={
              <ProtectedRoute permission="medical_reports.read">
                <TopNavigation>
                    <RikesNapza />
                </TopNavigation>
              </ProtectedRoute>
            } />
            
            <Route path="/qshe/medical-onsite" element={
              <ProtectedRoute permission="medical_reports.read">
                <TopNavigation>
                    <MedicalOnsite />
                </TopNavigation>
              </ProtectedRoute>
            } />

            {/* Security Module Routes */}
            <Route path="/security/security-metrics" element={
              <ProtectedRoute permission="security_metrics.read">
                <TopNavigation>
                    <SecurityMetrics />
                </TopNavigation>
              </ProtectedRoute>
            } />
            
            <Route path="/security/security-admin" element={
              <ProtectedRoute permission="security_metrics.create">
                <TopNavigation>
                    <SecurityAdmin />
                </TopNavigation>
              </ProtectedRoute>
            } />
            
            <Route path="/security/bujp-reports" element={
              <ProtectedRoute permission="security_metrics.read">
                <TopNavigation>
                    <BUJPReports />
                </TopNavigation>
              </ProtectedRoute>
            } />
            
            <Route path="/security/competency" element={
              <ProtectedRoute permission="security_metrics.read">
                <TopNavigation>
                    <CompetencyMonitoring />
                </TopNavigation>
              </ProtectedRoute>
            } />
            
            <Route path="/security/vms" element={
              <ProtectedRoute permission="visitor_requests.read">
                <TopNavigation>
                    <VisitorManagement />
                </TopNavigation>
              </ProtectedRoute>
            } />
            
            <Route path="/security/vms-admin" element={
              <ProtectedRoute permission="visitor_requests.approve">
                <TopNavigation>
                    <VMSAdmin />
                </TopNavigation>
              </ProtectedRoute>
            } />

            <Route path="/security/eptw-check" element={
              <ProtectedRoute permission="security_metrics.read">
                <TopNavigation>
                    <EptwPermitCheck />
                </TopNavigation>
              </ProtectedRoute>
            } />

            {/* Apar Management */}
            <Route path="/apar-hydrant/dashboard" element={
              <ProtectedRoute permission="safety_metrics.read">
                <TopNavigation>
                    <AparHydrantDashboard />
                </TopNavigation>
              </ProtectedRoute>
            } />

            <Route path="/apar-hydrant/list" element={
              <ProtectedRoute permission="safety_metrics.read">
                <TopNavigation>
                    <AparHydrantListPage />
                </TopNavigation>
              </ProtectedRoute>
            } />

            <Route path="/apar-hydrant/schedule" element={
              <ProtectedRoute permission="safety_metrics.read">
                <TopNavigation>
                    <AparReportPage />
                </TopNavigation>
              </ProtectedRoute>
            } />

            <Route path="/apar-hydrant/admin" element={
              <ProtectedRoute permission="safety_metrics.update">
                <TopNavigation>
                    <AdminPage />
                </TopNavigation>
              </ProtectedRoute>
            } />

            {/* User Management */}
            <Route path="/user-management" element={
              <ProtectedRoute permission="users.manage">
                <TopNavigation>
                    <UserManagement />
                </TopNavigation>
              </ProtectedRoute>
            } />

            {/* Reports */}
            <Route path="/reports" element={
              <ProtectedRoute permission="reports.view_summary">
                <TopNavigation>
                    <Reports />
                </TopNavigation>
              </ProtectedRoute>
            } />

            {/* 404 catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
