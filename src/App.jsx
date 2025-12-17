import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { initializeWebVitalsMonitoring, detectPerformanceIssues } from './lib/performance.js';
import { trackEvent, EVENT_CATEGORIES, EVENT_TYPES } from './lib/analyticsUtils.js';
import PublicSite from './pages/PublicSite.jsx';
import PortalLayout from './layouts/PortalLayout.jsx';
import NotFound from './pages/NotFound.jsx';
// Public Site Pages
import Services from './pages/Services.jsx';
import MannedGuarding from './pages/services/MannedGuarding.jsx';
import DoorSupervision from './pages/services/DoorSupervision.jsx';
import EventSecurity from './pages/services/EventSecurity.jsx';
import CorporateSecurity from './pages/services/CorporateSecurity.jsx';
import ConstructionSiteSecurity from './pages/services/ConstructionSiteSecurity.jsx';
import About from './pages/About.jsx';
import Contact from './pages/Contact.jsx';
import JoinTheTeam from './pages/JoinTheTeam.jsx';
import PrivacyPolicy from './pages/PrivacyPolicy.jsx';
import Terms from './pages/Terms.jsx';
import CookiePolicy from './pages/CookiePolicy.jsx';
// Portal Pages
import Dashboard from './pages/portal/Dashboard.jsx';
import Clients from './pages/portal/Clients.jsx';
import ClientDetail from './pages/portal/ClientDetail.jsx';
import Scheduling from './pages/portal/Scheduling.jsx';
import Sites from './pages/portal/Sites.jsx';
import Posts from './pages/portal/Posts.jsx';
import Guards from './pages/portal/Guards.jsx';
import TimeTracking from './pages/portal/TimeTracking.jsx';
import Tasks from './pages/portal/Tasks.jsx';
import Incidents from './pages/portal/Incidents.jsx';
import Assets from './pages/portal/Assets.jsx';
import Messages from './pages/portal/Messages.jsx';
import Finance from './pages/portal/Finance.jsx';
import UserManagement from './pages/portal/UserManagement.jsx';
import AIAssistant from './pages/portal/AIAssistant.jsx';
import Settings from './pages/portal/Settings.jsx';
import Reports from './pages/portal/Reports.jsx';
import HR from './pages/portal/HR.jsx';
import Payroll from './pages/portal/Payroll.jsx';
import MySchedule from './pages/portal/MySchedule.jsx';
import OpenShifts from './pages/portal/OpenShifts.jsx';
import AuditLog from './pages/portal/AuditLog.jsx';
import ClientPortal from './pages/portal/ClientPortal.jsx';
import Analytics from './pages/portal/Analytics.jsx';

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
