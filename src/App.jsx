import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { initializeWebVitalsMonitoring, detectPerformanceIssues } from './lib/performance.js';
import { trackEvent, EVENT_CATEGORIES, EVENT_TYPES } from './lib/analyticsUtils.js';

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
const Scheduling = lazy(() => import('./pages/portal/Scheduling.jsx'));
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
const AuditLog = lazy(() => import('./pages/portal/AuditLog.jsx'));
const ClientPortal = lazy(() => import('./pages/portal/ClientPortal.jsx'));
const Analytics = lazy(() => import('./pages/portal/Analytics.jsx'));

// Loading component
const LoadingFallback = () => (
  <div className="flex h-screen items-center justify-center bg-night-sky">
    <div className="text-center">
      <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent mx-auto"></div>
      <p className="text-white/70">Loading...</p>
    </div>
  </div>
);

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
          <Route index element={<Dashboard />} />
          <Route path="clients" element={<Clients />} />
          <Route path="clients/:id" element={<ClientDetail />} />
          <Route path="sites" element={<Sites />} />
          <Route path="posts" element={<Posts />} />
          <Route path="guards" element={<Guards />} />
          <Route path="scheduling" element={<Scheduling />} />
          <Route path="my-schedule" element={<MySchedule />} />
          <Route path="open-shifts" element={<OpenShifts />} />
          <Route path="time" element={<TimeTracking />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="incidents" element={<Incidents />} />
          <Route path="assets" element={<Assets />} />
          <Route path="messages" element={<Messages />} />
          <Route path="finance" element={<Finance />} />
          <Route path="ai" element={<AIAssistant />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="hr" element={<HR />} />
          <Route path="payroll" element={<Payroll />} />
          <Route path="reports" element={<Reports />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="audit" element={<AuditLog />} />
          <Route path="client-portal" element={<ClientPortal />} />
          <Route path="settings" element={<Settings />} />
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
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
