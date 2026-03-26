import React from "react";
import {BrowserRouter, Routes, Route, Navigate} from "react-router-dom";
import {AuthProvider} from "@/contexts/AuthContext";
import {ProtectedRoute} from "@/components/ProtectedRoute";
import {DashboardLayout} from "@/layouts/DashboardLayout";

// Pages
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import DashboardPage from "@/pages/DashboardPage";
import MembersPage from "@/pages/MembersPage";
import FamiliesPage from "@/pages/FamiliesPage";
import GroupsPage from "@/pages/GroupsPage";
import AttendancePage from "@/pages/AttendancePage";
import EventsPage from "@/pages/EventsPage";
import FinancesPage from "@/pages/FinancesPage";
import BaptismsPage from "@/pages/BaptismsPage";
import ReportsPage from "@/pages/ReportsPage";
import SettingsPage from "@/pages/SettingsPage";
import UsersPage from "@/pages/UsersPage";
import ActivitiesPage from "@/pages/ActivitiesPage";
import VisitorsPage from "@/pages/VisitorsPage";
import ProgramPage from "@/pages/ProgramPage";
import LeadersPage from "@/pages/LeadersPage";
import CommunionPage from "@/pages/CommunionPage";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <DashboardPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/visitors"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <VisitorsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/members"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <MembersPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/families"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <FamiliesPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/groups"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <GroupsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/attendance"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <AttendancePage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/events"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <EventsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/programs"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ProgramPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/leaders"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <LeadersPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/activities"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ActivitiesPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/finances"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <FinancesPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/donations"
            element={<Navigate to="/dashboard/finances" replace />}
          />
          <Route
            path="/dashboard/baptisms"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <BaptismsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/communion"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <CommunionPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/reports"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ReportsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/settings"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <SettingsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/users"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <UsersPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Redirect root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* 404 - Redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
