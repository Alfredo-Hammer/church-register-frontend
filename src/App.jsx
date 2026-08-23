import React from "react";
import {BrowserRouter, Routes, Route, Navigate} from "react-router-dom";
import {Toaster} from "sonner";
import {AuthProvider} from "@/contexts/AuthContext";
import {ProtectedRoute} from "@/components/ProtectedRoute";
import {PlatformProtectedRoute} from "@/components/PlatformProtectedRoute";
import {DashboardLayout} from "@/layouts/DashboardLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import {useTheme} from "@/contexts/ThemeContext";

// Pages
import LandingPage from "@/pages/LandingPage";
import DisplayPage from "@/pages/DisplayPage";
import PublicConferenceRegistrationPage from "@/pages/PublicConferenceRegistrationPage";
import PublicMemberRegistrationPage from "@/pages/PublicMemberRegistrationPage";
import PublicVisitorRegistrationPage from "@/pages/PublicVisitorRegistrationPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import VerifyEmailPage from "@/pages/VerifyEmailPage";
import DashboardPage from "@/pages/DashboardPage";
import MembersPage from "@/pages/MembersPage";
import MemberDetailPage from "@/pages/MemberDetailPage";
import BirthdaysPage from "@/pages/BirthdaysPage";
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
import PrayerPage from "@/pages/PrayerPage";
import ProfilePage from "@/pages/ProfilePage";
import LettersPage from "@/pages/LettersPage";
import InternalRegulationsPage from "@/pages/InternalRegulationsPage";
import InventoryPage from "@/pages/InventoryPage";
import InventoryDetailPage from "@/pages/InventoryDetailPage";
import PlanningPage from "@/pages/PlanningPage";
import PlanningDetailPage from "@/pages/PlanningDetailPage";
import ConferencePage from "@/pages/ConferencePage";
import ConferenceDetailPage from "@/pages/ConferenceDetailPage";
import ConferenceCheckInPage from "@/pages/ConferenceCheckInPage";
import ConferenceManualAttendancePage from "@/pages/ConferenceManualAttendancePage";
import AnnouncementsPage from "@/pages/AnnouncementsPage";
import SuperAdminPage from "@/pages/SuperAdminPage";
import ForcePasswordChangePage from "@/pages/ForcePasswordChangePage";

function App() {
  const {theme} = useTheme();

  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Toaster theme={theme} richColors position="top-right" closeButton />
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />

            {/* Superadmin de plataforma: mismo login unificado, scope aparte sin DashboardLayout */}
            <Route
              path="/super-admin"
              element={
                <PlatformProtectedRoute>
                  <SuperAdminPage />
                </PlatformProtectedRoute>
              }
            />

            {/* Protected routes */}
            {/* Sin DashboardLayout a propósito: la cuenta tiene contraseña
                temporal, no debe poder navegar a otra pantalla todavía. */}
            <Route
              path="/dashboard/cambiar-password"
              element={
                <ProtectedRoute>
                  <ForcePasswordChangePage />
                </ProtectedRoute>
              }
            />
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
              path="/dashboard/members/:id"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <MemberDetailPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/birthdays"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <BirthdaysPage />
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
                <ProtectedRoute roles={["ADMIN", "PASTOR", "TESORERO"]}>
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
              path="/dashboard/prayer"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <PrayerPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/letters"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <LettersPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/normas-internas"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <InternalRegulationsPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/inventory"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <InventoryPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/inventory/:id"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <InventoryDetailPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/planning"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <PlanningPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/planning/:id"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <PlanningDetailPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/announcements"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <AnnouncementsPage />
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

            <Route
              path="/dashboard/conference"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <ConferencePage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/conference/:id"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <ConferenceDetailPage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            {/* Sin DashboardLayout a propósito: pantalla de uso rápido en el
                celular, en la puerta de la clase — el sidebar solo estorba. */}
            <Route
              path="/dashboard/conference/:id/check-in/:sessionId"
              element={
                <ProtectedRoute>
                  <ConferenceCheckInPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/conference/:id/attendance/:sessionId"
              element={
                <ProtectedRoute>
                  <ConferenceManualAttendancePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/profile"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <ProfilePage />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />

            {/* Landing page pública */}
            {/* Pantalla pública del salón: sin sesión, se identifica por token */}
            <Route path="/pantalla/:token" element={<DisplayPage />} />
            <Route path="/registro-conferencia/:token" element={<PublicConferenceRegistrationPage />} />
            <Route path="/registro-miembro/:joinCode" element={<PublicMemberRegistrationPage />} />
            <Route path="/registro-visitante/:joinCode" element={<PublicVisitorRegistrationPage />} />

            <Route path="/" element={<LandingPage />} />

            {/* 404 - Redirect to landing */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
