import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { isFeatureEnabled } from './config/features.ts';
import { FeatureDisabled } from './components/FeatureDisabled.jsx';
import AccessDenied from './components/AccessDenied.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { initializeWebVitalsMonitoring, detectPerformanceIssues } from './lib/performance.js';
import { trackEvent, EVENT_CATEGORIES, EVENT_TYPES } from './lib/analyticsUtils.js';
import { ACTIONS } from './lib/authz.js';

// Eager load critical components
import PublicSite from './pages/PublicSite.jsx';
import PortalLayout from './layouts/PortalLayout.jsx';
import NotFound from './pages/NotFound.jsx';

// Lazy load public site pages (non-critical)
const Services = lazy(() => import('./pages/Services.jsx'));
const MannedGuarding = lazy(() => import('./pages/services/MannedGuarding.jsx'));
const DoorSupervision = lazy(() => import('./pages/services/DoorSupervision.jsx'));
const EventSecurity = lazy(() => import('./pages/services/EventSecurity.jsx'));
const CorporateSecurity = lazy(() => import('./pages/services/CorporateSecurity.jsx'));
const ConstructionSiteSecurity = lazy(() => import('./pages/services/ConstructionSiteSecurity.jsx'));
const About = lazy(() => import('./pages/About.jsx'));
const Contact = lazy(() => import('./pages/Contact.jsx'));
const JoinTheTeam = lazy(() => import('./pages/JoinTheTeam.jsx'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy.jsx'));
const Terms = lazy(() => import('./pages/Terms.jsx'));
const CookiePolicy = lazy(() => import('./pages/CookiePolicy.jsx'));

// Lazy load portal pages - Dashboard is critical, others are lazy
const Dashboard = lazy(() => import('./pages/portal/Dashboard.jsx'));
const Clients = lazy(() => import('./pages/portal/Clients.jsx'));
const ClientDetail = lazy(() => import('./pages/portal/ClientDetail.jsx'));
const Sites = lazy(() => import('./pages/portal/Sites.jsx'));
const Posts = lazy(() => import('./pages/portal/Posts.jsx'));
const Guards = lazy(() => import('./pages/portal/Guards.jsx'));
const TimeTracking = lazy(() => import('./pages/portal/TimeTracking.jsx'));
const Tasks = lazy(() => import('./pages/portal/Tasks.jsx'));
const Incidents = lazy(() => import('./pages/portal/Incidents.jsx'));
const Assets = lazy(() => import('./pages/portal/Assets.jsx'));
const Messages = lazy(() => import('./pages/portal/Messages.jsx'));
const Finance = lazy(() => import('./pages/portal/Finance.jsx'));
const UserManagement = lazy(() => import('./pages/portal/UserManagement.jsx'));
const AIAssistant = lazy(() => import('./pages/portal/AIAssistant.jsx'));
const Settings = lazy(() => import('./pages/portal/Settings.jsx'));
const Reports = lazy(() => import('./pages/portal/Reports.jsx'));
const HR = lazy(() => import('./pages/portal/HR.jsx'));
const Payroll = lazy(() => import('./pages/portal/Payroll.jsx'));
const MySchedule = lazy(() => import('./pages/portal/MySchedule.jsx'));
const OpenShifts = lazy(() => import('./pages/portal/OpenShifts.jsx'));
const ShiftApplications = lazy(() => import('./pages/portal/ShiftApplications.jsx'));
const AuditLog = lazy(() => import('./pages/portal/AuditLog.jsx'));
const ClientPortal = lazy(() => import('./pages/portal/ClientPortal.jsx'));
const Analytics = lazy(() => import('./pages/portal/Analytics.jsx'));
const RecurringPatterns = lazy(() => import('./pages/portal/RecurringPatterns.jsx'));
const ScheduleDemo = lazy(() => import('./pages/ScheduleDemo.jsx'));
const Scheduling = lazy(() => import('./pages/portal/Scheduling.jsx'));
const SchedulingWithDragDrop = lazy(() => import('./pages/portal/SchedulingWithDragDrop.jsx'));
const StaffScheduleView = lazy(() => import('./pages/portal/StaffScheduleView.jsx'));
const Profile = lazy(() => import('./pages/portal/Profile.jsx'));
const StaffSignup = lazy(() => import('./pages/StaffSignup.jsx'));
const ComplianceWizard = lazy(() => import('./pages/portal/ComplianceWizard.jsx'));
const SchedulingBoard = lazy(() => import('./pages/portal/SchedulingBoard.jsx'));
const NewShift = lazy(() => import('./pages/portal/NewShift.jsx'));
const AdminGrading = lazy(() => import('./pages/portal/AdminGrading.jsx'));
const InviteManagement = lazy(() => import('./pages/portal/InviteManagement.jsx'));
const DriveSyncStatus = lazy(() => import('./pages/portal/DriveSyncStatus.jsx'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'));
const PasswordReset = lazy(() => import('./pages/PasswordReset.jsx'));
const DebugAuth = lazy(() => import('./pages/portal/DebugAuth.jsx'));

// Loading component
const LoadingFallback = () => (
  <div className="flex h-screen items-center justify-center bg-night-sky">
    <div className="text-center">
      <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent mx-auto"></div>
      <p className="text-white/70">Loading...</p>
    </div>
  </div>
);

/**
 * FeatureRoute wrapper: renders component if feature enabled, else shows FeatureDisabled.
 * Also enforces a basic role gate so staff/client users don't see admin-only screens.
 */
const FeatureRoute = ({ feature, name, element, action }) => {
  const { loading, can } = useAuth();

  if (!isFeatureEnabled(feature)) {
    return <FeatureDisabled featureName={name} />;
  }

  if (loading) {
    return <LoadingFallback />;
  }

  if (action && !can(action)) {
    return <AccessDenied title="Access denied" message={`Your account role does not have access to ${name}.`} />;
  }

  return element;
};

const AppContent = () => {
  const location = useLocation();

  useEffect(() => {
    // Track page views
    trackEvent(EVENT_CATEGORIES.NAVIGATION, EVENT_TYPES.PAGE_VIEW, {
      path: location.pathname,
      search: location.search,
    });
  }, [location]);

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Public Site Routes */}
        <Route path="/" element={<PublicSite />} />
        <Route path="/signup" element={<StaffSignup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/password-reset" element={<PasswordReset />} />
        {/* Legacy compatibility route for older email templates */}
        <Route path="/portal/password-reset/:token" element={<ResetPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/schedule-demo" element={<ScheduleDemo />} />
        <Route path="/services" element={<Services />} />
        <Route path="/services/manned-guarding" element={<MannedGuarding />} />
        <Route path="/services/door-supervision" element={<DoorSupervision />} />
        <Route path="/services/event-security" element={<EventSecurity />} />
        <Route path="/services/corporate-security" element={<CorporateSecurity />} />
        <Route path="/services/construction-site-security" element={<ConstructionSiteSecurity />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/join-the-team" element={<JoinTheTeam />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/cookie-policy" element={<CookiePolicy />} />

        {/* Portal Routes */}
        <Route path="/portal" element={<PortalLayout />}>
          <Route
            index
            element={
              <FeatureRoute
                feature="DASHBOARD"
                name="Dashboard"
                action={ACTIONS.DASHBOARD_VIEW}
                element={<Dashboard />}
              />
            }
          />
          <Route
            path="profile"
            element={
              <FeatureRoute
                feature="PROFILE"
                name="My Profile"
                action={ACTIONS.PROFILE_VIEW}
                element={<Profile />}
              />
            }
          />

          {/* SCHEDULING Module Routes */}
          <Route
            path="scheduling"
            element={
              <FeatureRoute
                feature="SCHEDULING"
                name="Scheduling"
                action={ACTIONS.SCHEDULING_VIEW}
                element={<Scheduling />}
              />
            }
          />
          <Route
            path="scheduling-drag-drop"
            element={
              <FeatureRoute
                feature="SCHEDULING"
                name="Scheduling"
                action={ACTIONS.SCHEDULING_VIEW}
                element={<SchedulingWithDragDrop />}
              />
            }
          />
          <Route
            path="scheduling-board"
            element={
              <FeatureRoute
                feature="SCHEDULING"
                name="Scheduling Board"
                action={ACTIONS.SCHEDULING_VIEW}
                element={<SchedulingBoard />}
              />
            }
          />
          <Route
            path="scheduling/new"
            element={
              <FeatureRoute
                feature="SCHEDULING"
                name="New Shift"
                action={ACTIONS.SCHEDULING_VIEW}
                element={<NewShift />}
              />
            }
          />
          <Route
            path="recurring-patterns"
            element={
              <FeatureRoute
                feature="RECURRING_PATTERNS"
                name="Recurring Patterns"
                action={ACTIONS.SCHEDULING_VIEW}
                element={<RecurringPatterns />}
              />
            }
          />
          <Route
            path="my-schedule"
            element={
              <FeatureRoute
                feature="MY_SCHEDULE"
                name="My Schedule"
                action={ACTIONS.SCHEDULING_VIEW}
                element={<MySchedule />}
              />
            }
          />
          <Route
            path="my-schedule-view"
            element={
              <FeatureRoute
                feature="MY_SCHEDULE"
                name="My Schedule"
                action={ACTIONS.SCHEDULING_VIEW}
                element={<StaffScheduleView />}
              />
            }
          />
          <Route
            path="open-shifts"
            element={
              <FeatureRoute
                feature="OPEN_SHIFTS"
                name="Open Shifts"
                action={ACTIONS.SCHEDULING_VIEW}
                element={<OpenShifts />}
              />
            }
          />
          <Route
            path="shift-applications"
            element={
              <FeatureRoute
                feature="SHIFT_APPLICATIONS"
                name="Shift Applications"
                action={ACTIONS.SCHEDULING_VIEW}
                element={<ShiftApplications />}
              />
            }
          />

          {/* COMPLIANCE Module Routes */}
          <Route
            path="hr"
            element={
              <FeatureRoute
                feature="COMPLIANCE"
                name="HR & Compliance"
                action={ACTIONS.COMPLIANCE_VIEW}
                element={<HR />}
              />
            }
          />
          <Route
            path="compliance"
            element={
              <FeatureRoute
                feature="COMPLIANCE"
                name="Compliance Wizard"
                action={ACTIONS.COMPLIANCE_VIEW}
                element={<ComplianceWizard />}
              />
            }
          />
          <Route
            path="admin-grading"
            element={
              <FeatureRoute
                feature="COMPLIANCE"
                name="Admin Grading"
                action={ACTIONS.ADMIN_GRADING_VIEW}
                element={<AdminGrading />}
              />
            }
          />
          <Route
            path="invite-management"
            element={
              <FeatureRoute
                feature="COMPLIANCE"
                name="Invite Management"
                action={ACTIONS.INVITE_MANAGEMENT_VIEW}
                element={<InviteManagement />}
              />
            }
          />
          <Route
            path="drive-sync"
            element={
              <FeatureRoute
                feature="COMPLIANCE"
                name="Drive Sync Status"
                action={ACTIONS.DRIVE_SYNC_VIEW}
                element={<DriveSyncStatus />}
              />
            }
          />
          <Route
            path="audit"
            element={
              <FeatureRoute
                feature="AUDIT_LOG"
                name="Audit Log"
                action={ACTIONS.AUDIT_LOG_VIEW}
                element={<AuditLog />}
              />
            }
          />

          {/* Other modules */}
          <Route
            path="clients"
            element={<FeatureRoute feature="CRM" name="Clients / CRM" action={ACTIONS.CLIENTS_VIEW} element={<Clients />} />}
          />
          <Route
            path="clients/:id"
            element={<FeatureRoute feature="CRM" name="Client Details" action={ACTIONS.CLIENTS_VIEW} element={<ClientDetail />} />}
          />
          <Route
            path="sites"
            element={<FeatureRoute feature="SITES" name="Sites" action={ACTIONS.SCHEDULING_VIEW} element={<Sites />} />}
          />
          <Route
            path="posts"
            element={<FeatureRoute feature="POSTS" name="Posts" action={ACTIONS.SCHEDULING_VIEW} element={<Posts />} />}
          />
          <Route
            path="guards"
            element={<FeatureRoute feature="GUARDS" name="Guards" action={ACTIONS.SCHEDULING_VIEW} element={<Guards />} />}
          />
          <Route
            path="time"
            element={<FeatureRoute feature="TIME_TRACKING" name="Time Tracking" action={ACTIONS.SCHEDULING_VIEW} element={<TimeTracking />} />}
          />
          <Route
            path="tasks"
            element={<FeatureRoute feature="TASKS" name="Tasks" action={ACTIONS.SCHEDULING_VIEW} element={<Tasks />} />}
          />
          <Route
            path="incidents"
            element={<FeatureRoute feature="INCIDENTS" name="Incidents" action={ACTIONS.SCHEDULING_VIEW} element={<Incidents />} />}
          />
          <Route
            path="assets"
            element={<FeatureRoute feature="ASSETS" name="Assets" action={ACTIONS.SCHEDULING_VIEW} element={<Assets />} />}
          />
          <Route
            path="messages"
            element={<FeatureRoute feature="MESSAGES" name="Messages" action={ACTIONS.SCHEDULING_VIEW} element={<Messages />} />}
          />
          <Route
            path="finance"
            element={<FeatureRoute feature="FINANCE" name="Finance" action={ACTIONS.FINANCE_VIEW} element={<Finance />} />}
          />
          <Route
            path="ai"
            element={<FeatureRoute feature="AI_ASSISTANT" name="AI Assistant" action={ACTIONS.AI_ASSISTANT_VIEW} element={<AIAssistant />} />}
          />
          <Route
            path="users"
            element={<FeatureRoute feature="USER_MANAGEMENT" name="User Management" action={ACTIONS.USER_MANAGEMENT_VIEW} element={<UserManagement />} />}
          />
          <Route
            path="payroll"
            element={<FeatureRoute feature="PAYROLL" name="Payroll" action={ACTIONS.PAYROLL_VIEW} element={<Payroll />} />}
          />
          <Route
            path="reports"
            element={<FeatureRoute feature="REPORTS" name="Reports" action={ACTIONS.REPORTS_VIEW} element={<Reports />} />}
          />
          <Route
            path="analytics"
            element={<FeatureRoute feature="ANALYTICS" name="Analytics" action={ACTIONS.ANALYTICS_VIEW} element={<Analytics />} />}
          />
          <Route
            path="client-portal"
            element={<FeatureRoute feature="CRM" name="Client Portal" action={ACTIONS.CLIENT_PORTAL_VIEW} element={<ClientPortal />} />}
          />
          <Route
            path="admin/debug-auth"
            element={<FeatureRoute feature="USER_MANAGEMENT" name="Auth Debug" action={ACTIONS.DEBUG_AUTH_VIEW} element={<DebugAuth />} />}
          />
          <Route
            path="settings"
            element={<FeatureRoute feature="SETTINGS" name="Settings" action={ACTIONS.SETTINGS_VIEW} element={<Settings />} />}
          />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const App = () => {
  useEffect(() => {
    // Initialize Web Vitals monitoring on mount
    initializeWebVitalsMonitoring();

    // Detect and log performance issues in development
    if (process.env.NODE_ENV === 'development') {
      detectPerformanceIssues();
    }
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
