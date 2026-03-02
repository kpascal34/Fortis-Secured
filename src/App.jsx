import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { isFeatureEnabled } from './config/features.ts';
import { FeatureDisabled } from './components/FeatureDisabled.jsx';
import AccessDenied from './components/AccessDenied.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { initializeWebVitalsMonitoring, detectPerformanceIssues } from './lib/performance.js';
import { trackEvent, EVENT_CATEGORIES, EVENT_TYPES } from './lib/analyticsUtils.js';
import { can, PERMISSIONS as RBAC_PERMISSIONS } from './lib/rbac.ts';
import { env } from './lib/env.js';
import { getFatalConfigError } from './lib/config.js';
import RequirePermission from './components/auth/RequirePermission.tsx';

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
const Timesheets = lazy(() => import('./pages/portal/Timesheets.jsx'));
const TimesheetDetail = lazy(() => import('./pages/portal/TimesheetDetail.jsx'));
const TimesheetApprovals = lazy(() => import('./pages/portal/TimesheetApprovals.jsx'));
const Tasks = lazy(() => import('./pages/portal/Tasks.jsx'));
const Incidents = lazy(() => import('./pages/portal/Incidents.jsx'));
const Assets = lazy(() => import('./pages/portal/Assets.jsx'));
const Messages = lazy(() => import('./pages/portal/Messages.jsx'));
const Finance = lazy(() => import('./pages/portal/Finance.jsx'));
const UserManagement = lazy(() => import('./pages/portal/UserManagement.jsx'));
const AIAssistant = lazy(() => import('./pages/portal/AIAssistant.jsx'));
const Settings = lazy(() => import('./pages/portal/Settings.jsx'));
const ManageDepartments = lazy(() => import('./pages/portal/ManageDepartments.jsx'));
const Reports = lazy(() => import('./pages/portal/Reports.jsx'));
const HR = lazy(() => import('./pages/portal/HR.jsx'));
const Payroll = lazy(() => import('./pages/portal/Payroll.jsx'));
const Entities = lazy(() => import('./pages/portal/Entities.jsx'));
const RiskAlerts = lazy(() => import('./pages/portal/RiskAlerts.jsx'));
const CashflowDashboard = lazy(() => import('./pages/portal/CashflowDashboard.jsx'));
const ResilienceDashboard = lazy(() => import('./pages/portal/ResilienceDashboard.jsx'));
const TenderWorkbench = lazy(() => import('./pages/portal/TenderWorkbench.jsx'));
const EmploymentRiskFlags = lazy(() => import('./pages/portal/EmploymentRiskFlags.jsx'));
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
const ComplianceFlags = lazy(() => import('./pages/portal/ComplianceFlags.jsx'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'));
const PasswordReset = lazy(() => import('./pages/PasswordReset.jsx'));
const UIAudit = lazy(() => import('./pages/portal/UIAudit.jsx'));
const AdminDebug = lazy(() => import('./pages/portal/AdminDebug.jsx'));

// Loading component
const LoadingFallback = () => (
  <div className="flex h-screen items-center justify-center bg-night-sky">
    <div className="text-center">
      <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent mx-auto"></div>
      <p className="text-white/70">Loading...</p>
    </div>
  </div>
);

const PortalRouteErrorFallback = ({ errorCode, onReset }) => (
  <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-dark via-night-sky to-night-sky px-4">
    <div className="max-w-lg rounded-3xl border border-red-500/30 bg-red-500/5 p-8 text-white backdrop-blur-md">
      <h1 className="text-2xl font-bold">Portal error</h1>
      <p className="mt-3 text-white/80">
        The portal failed to render this page. Please retry, then contact support if it persists.
      </p>
      <div className="mt-4 rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-200">
        <p className="font-semibold">Error code: {errorCode || 'PORTAL-ROUTE-UNKNOWN'}</p>
        <p>Check browser console and backend logs for this code.</p>
      </div>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-night-sky hover:bg-accent/90"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => window.location.assign('/portal')}
          className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
        >
          Go to portal home
        </button>
      </div>
    </div>
  </div>
);

/**
 * FeatureRoute wrapper: renders component if feature enabled and permission is granted.
 */
const FeatureRoute = ({ feature, name, element, permission }) => {
  const { user, loading, resolvedRole, permissions } = useAuth();

  if (!isFeatureEnabled(feature)) {
    return <FeatureDisabled featureName={name} />;
  }

  if (loading) {
    return <LoadingFallback />;
  }

  if (!user) {
    return (
      <AccessDenied
        title="Sign-in required"
        message="Please sign in to access this portal area."
      />
    );
  }

  const allowed = permission
    ? can(permission, { role: user?.role, resolvedRole, permissions })
    : true;

  if (!allowed) {
    return (
      <AccessDenied
        title="Access denied"
        message={`Your account does not have permission to access ${name}.`}
      />
    );
  }

  if (!permission) return element;

  return <RequirePermission permission={permission}>{element}</RequirePermission>;
};

const AppContent = () => {
  const location = useLocation();
  const fatalConfigError = getFatalConfigError();

  useEffect(() => {
    // Track page views
    trackEvent(EVENT_CATEGORIES.NAVIGATION, EVENT_TYPES.PAGE_VIEW, {
      path: location.pathname,
      search: location.search,
    });

    if (env.isDev) {
      console.debug('[Portal Routing]', location.pathname, location.search);
    }
  }, [location]);

  if (fatalConfigError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-night-sky px-4">
        <div className="max-w-2xl rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-red-100">
          <h1 className="text-2xl font-bold">Fatal configuration error</h1>
          <p className="mt-3 text-sm">{fatalConfigError}</p>
          <p className="mt-2 text-sm">Set required VITE_APPWRITE_* values and redeploy.</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Public Site Routes */}
        <Route path="/" element={<PublicSite />} />
        <Route path="/signup" element={<StaffSignup />} />
        <Route path="/portal/invite/:token" element={<StaffSignup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/portal/forgot-password" element={<ForgotPassword />} />
        <Route path="/password-reset" element={<PasswordReset />} />
        {/* Password reset + compatibility routes */}
        <Route path="/portal/password-reset/:token" element={<ResetPassword />} />
        <Route path="/portal/reset-password" element={<ResetPassword />} />
        <Route path="/portal/reset-password/:token" element={<ResetPassword />} />
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

        {env.isDev && (
          <Route
            path="/portal/ui-audit"
            element={
              <RequirePermission permission={RBAC_PERMISSIONS.DEBUG_ADMIN}>
                <UIAudit />
              </RequirePermission>
            }
          />
        )}

        {/* Portal Routes */}
        <Route
          path="/portal"
          element={
            <ErrorBoundary
              area="portal-routes"
              errorCodePrefix="PORTAL-ROUTE"
              renderFallback={PortalRouteErrorFallback}
            >
              <PortalLayout />
            </ErrorBoundary>
          }
        >
          <Route
            index
            element={
              <FeatureRoute
                feature="DASHBOARD"
                name="Dashboard"
                permission={RBAC_PERMISSIONS.VIEW_DASHBOARD}
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
                permission={RBAC_PERMISSIONS.VIEW_PROFILE}
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
                permission={RBAC_PERMISSIONS.VIEW_SCHEDULING}
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
                permission={RBAC_PERMISSIONS.VIEW_SCHEDULING}
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
                permission={RBAC_PERMISSIONS.VIEW_SCHEDULING}
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
                permission={RBAC_PERMISSIONS.MANAGE_SHIFTS}
                element={<NewShift />}
              />
            }
          />
          <Route
            path="new-shift"
            element={
              <FeatureRoute
                feature="SCHEDULING"
                name="New Shift"
                permission={RBAC_PERMISSIONS.MANAGE_SHIFTS}
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
                permission={RBAC_PERMISSIONS.VIEW_RECURRING_PATTERNS}
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
                permission={RBAC_PERMISSIONS.VIEW_MY_SCHEDULE}
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
                permission={RBAC_PERMISSIONS.VIEW_MY_SCHEDULE}
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
                permission={RBAC_PERMISSIONS.VIEW_OPEN_SHIFTS}
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
                permission={RBAC_PERMISSIONS.REVIEW_SHIFT_APPLICATIONS}
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
                permission={RBAC_PERMISSIONS.VIEW_COMPLIANCE}
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
                permission={RBAC_PERMISSIONS.VIEW_COMPLIANCE}
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
                permission={RBAC_PERMISSIONS.MANAGE_COMPLIANCE}
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
                permission={RBAC_PERMISSIONS.MANAGE_INVITES}
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
                permission={RBAC_PERMISSIONS.VIEW_DRIVE_SYNC}
                element={<DriveSyncStatus />}
              />
            }
          />
          <Route
            path="compliance-flags"
            element={
              <FeatureRoute
                feature="COMPLIANCE"
                name="Compliance Flags"
                permission={RBAC_PERMISSIONS.MANAGE_COMPLIANCE}
                element={<ComplianceFlags />}
              />
            }
          />
          <Route
            path="audit"
            element={
              <FeatureRoute
                feature="AUDIT_LOG"
                name="Audit Log"
                permission={RBAC_PERMISSIONS.VIEW_AUDIT_LOG}
                element={<AuditLog />}
              />
            }
          />

          {/* Other modules */}
          <Route
            path="clients"
            element={<FeatureRoute feature="CRM" name="Clients / CRM" permission={RBAC_PERMISSIONS.VIEW_CLIENTS} element={<Clients />} />}
          />
          <Route
            path="clients/:id"
            element={<FeatureRoute feature="CRM" name="Client Details" permission={RBAC_PERMISSIONS.VIEW_CLIENTS} element={<ClientDetail />} />}
          />
          <Route
            path="sites"
            element={<FeatureRoute feature="SITES" name="Sites" permission={RBAC_PERMISSIONS.VIEW_SITES} element={<Sites />} />}
          />
          <Route
            path="posts"
            element={<FeatureRoute feature="POSTS" name="Posts" permission={RBAC_PERMISSIONS.VIEW_POSTS} element={<Posts />} />}
          />
          <Route
            path="guards"
            element={<FeatureRoute feature="GUARDS" name="Guards" permission={RBAC_PERMISSIONS.VIEW_GUARDS} element={<Guards />} />}
          />
          <Route
            path="time"
            element={<FeatureRoute feature="TIME_TRACKING" name="My Timesheets" permission={RBAC_PERMISSIONS.VIEW_TIME_TRACKING} element={<Timesheets />} />}
          />
          <Route
            path="time/:id"
            element={<FeatureRoute feature="TIME_TRACKING" name="Timesheet Detail" permission={RBAC_PERMISSIONS.VIEW_TIME_TRACKING} element={<TimesheetDetail />} />}
          />
          <Route
            path="time-approvals"
            element={<FeatureRoute feature="TIME_TRACKING" name="Timesheet Approvals" permission={RBAC_PERMISSIONS.MANAGE_SHIFTS} element={<TimesheetApprovals />} />}
          />
          <Route
            path="tasks"
            element={<FeatureRoute feature="TASKS" name="Tasks" permission={RBAC_PERMISSIONS.VIEW_TASKS} element={<Tasks />} />}
          />
          <Route
            path="incidents"
            element={<FeatureRoute feature="INCIDENTS" name="Incidents" permission={RBAC_PERMISSIONS.VIEW_INCIDENTS} element={<Incidents />} />}
          />
          <Route
            path="assets"
            element={<FeatureRoute feature="ASSETS" name="Assets" permission={RBAC_PERMISSIONS.VIEW_ASSETS} element={<Assets />} />}
          />
          <Route
            path="messages"
            element={<FeatureRoute feature="MESSAGES" name="Messages" permission={RBAC_PERMISSIONS.VIEW_MESSAGES} element={<Messages />} />}
          />
          <Route
            path="finance"
            element={<FeatureRoute feature="FINANCE" name="Finance" permission={RBAC_PERMISSIONS.VIEW_FINANCE} element={<Finance />} />}
          />
          <Route
            path="ai"
            element={<FeatureRoute feature="AI_ASSISTANT" name="AI Assistant" permission={RBAC_PERMISSIONS.USE_AI_ASSISTANT} element={<AIAssistant />} />}
          />
          <Route
            path="users"
            element={<FeatureRoute feature="USER_MANAGEMENT" name="User Management" permission={RBAC_PERMISSIONS.MANAGE_USERS} element={<UserManagement />} />}
          />
          <Route
            path="admin-debug"
            element={
              <RequirePermission permission={RBAC_PERMISSIONS.DEBUG_ADMIN}>
                <AdminDebug />
              </RequirePermission>
            }
          />
          <Route
            path="payroll"
            element={<FeatureRoute feature="PAYROLL" name="Payroll" permission={RBAC_PERMISSIONS.VIEW_PAYROLL} element={<Payroll />} />}
          />
          <Route
            path="reports"
            element={<FeatureRoute feature="REPORTS" name="Reports" permission={RBAC_PERMISSIONS.VIEW_REPORTS} element={<Reports />} />}
          />
          <Route
            path="entities"
            element={<FeatureRoute feature="ENTITY_MANAGEMENT" name="Entities" permission={RBAC_PERMISSIONS.VIEW_REPORTS} element={<Entities />} />}
          />
          <Route
            path="enterprise-alerts"
            element={<FeatureRoute feature="ENTERPRISE_ALERTS" name="Enterprise Alerts" permission={RBAC_PERMISSIONS.VIEW_REPORTS} element={<RiskAlerts />} />}
          />
          <Route
            path="cashflow"
            element={<FeatureRoute feature="CASHFLOW_DASHBOARD" name="Cashflow" permission={RBAC_PERMISSIONS.VIEW_REPORTS} element={<CashflowDashboard />} />}
          />
          <Route
            path="resilience"
            element={<FeatureRoute feature="RESILIENCE_DASHBOARD" name="Resilience" permission={RBAC_PERMISSIONS.VIEW_REPORTS} element={<ResilienceDashboard />} />}
          />
          <Route
            path="tender-workbench"
            element={<FeatureRoute feature="TENDER_WORKBENCH" name="Tender Workbench" permission={RBAC_PERMISSIONS.VIEW_FINANCE} element={<TenderWorkbench />} />}
          />
          <Route
            path="employment-risk"
            element={<FeatureRoute feature="EMPLOYMENT_RISK" name="Employment Risk" permission={RBAC_PERMISSIONS.VIEW_REPORTS} element={<EmploymentRiskFlags />} />}
          />
          <Route
            path="analytics"
            element={<FeatureRoute feature="ANALYTICS" name="Analytics" permission={RBAC_PERMISSIONS.VIEW_ANALYTICS} element={<Analytics />} />}
          />
          <Route
            path="client-portal"
            element={<FeatureRoute feature="CRM" name="Client Portal" permission={RBAC_PERMISSIONS.VIEW_CUSTOMER_PORTAL} element={<ClientPortal />} />}
          />
          <Route
            path="settings"
            element={<FeatureRoute feature="SETTINGS" name="Settings" permission={RBAC_PERMISSIONS.MANAGE_SETTINGS} element={<Settings />} />}
          />
          <Route
            path="departments"
            element={<FeatureRoute feature="SETTINGS" name="Manage Departments" permission={RBAC_PERMISSIONS.MANAGE_DEPARTMENTS} element={<ManageDepartments />} />}
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
    if (env.isDev) {
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
