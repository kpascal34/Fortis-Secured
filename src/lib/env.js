const rawEnv = import.meta.env;

const read = (key, fallback = '') => {
  const value = rawEnv?.[key];
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
};

const readBool = (key, fallback = false) => {
  const value = read(key, fallback ? 'true' : 'false').toLowerCase();
  return value === 'true';
};

const readNumber = (key, fallback) => {
  const value = Number(read(key, String(fallback)));
  return Number.isFinite(value) ? value : fallback;
};

export const env = {
  mode: read('MODE', 'development'),
  isDev: readBool('DEV', false),
  isProd: readBool('PROD', false),
  baseUrl: read('BASE_URL', '/'),

  appwriteEndpoint: read('VITE_APPWRITE_ENDPOINT', 'https://fra.cloud.appwrite.io/v1'),
  appwriteProjectId: read('VITE_APPWRITE_PROJECT_ID'),
  appwriteDatabaseId: read('VITE_APPWRITE_DATABASE_ID'),

  enableDemoMode: readBool('VITE_ENABLE_DEMO_MODE', false),
  enableComplianceV1: readBool('VITE_ENABLE_COMPLIANCE_V1', false),
  financeIntegrationEnabled: readBool('VITE_FINANCE_INTEGRATION_ENABLED', false),
  breakGlassEmailAllowlist: read('VITE_BREAK_GLASS_EMAIL_ALLOWLIST'),

  adminEmails: read('VITE_ADMIN_EMAILS'),
  internalEmailDomains: read('VITE_INTERNAL_EMAIL_DOMAINS'),
  opsEmail: read('VITE_OPS_EMAIL'),

  compliancePdfFunctionUrl: read('VITE_COMPLIANCE_PDF_FUNCTION_URL'),
  publicBaseUrl: read('VITE_PUBLIC_BASE_URL'),
  licenseExpiryThresholdDays: readNumber('VITE_LICENSE_EXPIRY_THRESHOLD_DAYS', 30),

  analyticsEndpoint: read('VITE_ANALYTICS_ENDPOINT'),
  vapidPublicKey: read('VITE_VAPID_PUBLIC_KEY'),
  filesBucketId: read('VITE_APPWRITE_FILES_BUCKET', 'documents'),
  googleDriveParentFolderId: read('VITE_GOOGLE_DRIVE_PARENT_FOLDER_ID'),
  googleDriveServiceAccountJson: read('VITE_GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON'),

  collectionIds: {
    users: read('VITE_APPWRITE_USERS_COLLECTION_ID'),
    adminProfiles: read('VITE_APPWRITE_ADMIN_PROFILES_COLLECTION_ID'),
    managerProfiles: read('VITE_APPWRITE_MANAGER_PROFILES_COLLECTION_ID', 'manager_profiles'),
    staffProfiles: read('VITE_APPWRITE_STAFF_PROFILES_COLLECTION_ID'),
    clientProfiles: read('VITE_APPWRITE_CLIENT_PROFILES_COLLECTION_ID'),
    auditLogs: read('VITE_APPWRITE_AUDIT_LOGS_COLLECTION_ID', 'audit_logs'),
    clients: read('VITE_APPWRITE_CLIENTS_COLLECTION_ID'),
    guards: read('VITE_APPWRITE_GUARDS_COLLECTION_ID'),
    sites: read('VITE_APPWRITE_SITES_COLLECTION_ID'),
    posts: read('VITE_APPWRITE_POSTS_COLLECTION_ID'),
    shifts: read('VITE_APPWRITE_SHIFTS_COLLECTION_ID'),
    shiftAssignments: read('VITE_APPWRITE_SHIFT_ASSIGNMENTS_COLLECTION_ID'),
    incidents: read('VITE_APPWRITE_INCIDENTS_COLLECTION_ID'),
    assets: read('VITE_APPWRITE_ASSETS_COLLECTION_ID'),
    applications: read('VITE_APPWRITE_APPLICATIONS_COLLECTION_ID'),
    tasks: read('VITE_APPWRITE_TASKS_COLLECTION_ID'),
    staffInvites: read('VITE_APPWRITE_STAFF_INVITES_COLLECTION_ID'),
    staffNumbers: read('VITE_APPWRITE_STAFF_NUMBERS_COLLECTION_ID'),
    staffLeave: read('VITE_APPWRITE_STAFF_LEAVE_COLLECTION_ID'),
    staffTraining: read('VITE_APPWRITE_STAFF_TRAINING_COLLECTION_ID'),
    staffLicenses: read('VITE_APPWRITE_STAFF_LICENSES_COLLECTION_ID'),
    complianceWizard: read('VITE_APPWRITE_COMPLIANCE_WIZARD_COLLECTION_ID'),
    staffGrades: read('VITE_APPWRITE_STAFF_GRADES_COLLECTION_ID'),
    staffCompliance: read('VITE_APPWRITE_STAFF_COMPLIANCE_COLLECTION_ID'),
    adminGrading: read('VITE_APPWRITE_ADMIN_GRADING_COLLECTION_ID'),
    complianceUploads: read('VITE_APPWRITE_COMPLIANCE_UPLOADS_COLLECTION_ID', 'compliance_uploads'),
    notificationOutbox: read('VITE_APPWRITE_NOTIFICATION_OUTBOX_COLLECTION_ID', 'notification_outbox'),
    timesheets: read('VITE_APPWRITE_TIMESHEETS_COLLECTION_ID', 'timesheets'),
    timesheetEntries: read('VITE_APPWRITE_TIMESHEET_ENTRIES_COLLECTION_ID', 'timesheet_entries'),
    payrollExports: read('VITE_APPWRITE_PAYROLL_EXPORTS_COLLECTION_ID', 'payroll_exports'),
    billingExports: read('VITE_APPWRITE_BILLING_EXPORTS_COLLECTION_ID', 'billing_exports'),
    rateCards: read('VITE_APPWRITE_RATE_CARDS_COLLECTION_ID', 'rate_cards'),
    complianceRules: read('VITE_APPWRITE_COMPLIANCE_RULES_COLLECTION_ID', 'compliance_rules'),
    complianceFlags: read('VITE_APPWRITE_COMPLIANCE_FLAGS_COLLECTION_ID', 'compliance_flags'),
    contracts: read('VITE_APPWRITE_CONTRACTS_COLLECTION_ID', 'contracts'),
    marginAlerts: read('VITE_APPWRITE_MARGIN_ALERTS_COLLECTION_ID', 'margin_alerts'),
    forecastModels: read('VITE_APPWRITE_FORECAST_MODELS_COLLECTION_ID', 'forecast_models'),
    forecastSnapshots: read('VITE_APPWRITE_FORECAST_SNAPSHOTS_COLLECTION_ID', 'forecast_snapshots'),
    demandPredictions: read('VITE_APPWRITE_DEMAND_PREDICTIONS_COLLECTION_ID', 'demand_predictions'),
    contractHealthSnapshots: read('VITE_APPWRITE_CONTRACT_HEALTH_SNAPSHOTS_COLLECTION_ID', 'contract_health_snapshots'),
    financeEvents: read('VITE_APPWRITE_FINANCE_EVENTS_COLLECTION_ID', 'finance_events'),
    legalEntities: read('VITE_APPWRITE_LEGAL_ENTITIES_COLLECTION_ID', 'legal_entities'),
    profitSnapshots: read('VITE_APPWRITE_PROFIT_SNAPSHOTS_COLLECTION_ID', 'profit_snapshots'),
    acquisitionTargets: read('VITE_APPWRITE_ACQUISITION_TARGETS_COLLECTION_ID', 'acquisition_targets'),
    acquisitionModels: read('VITE_APPWRITE_ACQUISITION_MODELS_COLLECTION_ID', 'acquisition_models'),
    tenderModels: read('VITE_APPWRITE_TENDER_MODELS_COLLECTION_ID', 'tender_models'),
    strategicForecasts: read('VITE_APPWRITE_STRATEGIC_FORECASTS_COLLECTION_ID', 'strategic_forecasts'),
    enterpriseRiskScores: read('VITE_APPWRITE_ENTERPRISE_RISK_SCORES_COLLECTION_ID', 'enterprise_risk_scores'),
    securityEvents: read('VITE_APPWRITE_SECURITY_EVENTS_COLLECTION_ID', 'security_events'),
    cashflowSnapshots: read('VITE_APPWRITE_CASHFLOW_SNAPSHOTS_COLLECTION_ID', 'cashflow_snapshots'),
    concentrationAlerts: read('VITE_APPWRITE_CONCENTRATION_ALERTS_COLLECTION_ID', 'concentration_alerts'),
    marginLeakageAlerts: read('VITE_APPWRITE_MARGIN_LEAKAGE_ALERTS_COLLECTION_ID', 'margin_leakage_alerts'),
    contractDependencyAlerts: read('VITE_APPWRITE_CONTRACT_DEPENDENCY_ALERTS_COLLECTION_ID', 'contract_dependency_alerts'),
    resilienceSnapshots: read('VITE_APPWRITE_RESILIENCE_SNAPSHOTS_COLLECTION_ID', 'resilience_snapshots'),
    tenderWinModels: read('VITE_APPWRITE_TENDER_WIN_MODELS_COLLECTION_ID', 'tender_win_models'),
    employmentRiskFlags: read('VITE_APPWRITE_EMPLOYMENT_RISK_FLAGS_COLLECTION_ID', 'employment_risk_flags'),
    departments: read('VITE_APPWRITE_DEPARTMENTS_COLLECTION_ID'),
    recurringPatterns: read('VITE_APPWRITE_RECURRING_PATTERNS_COLLECTION_ID'),
    documentTemplates: read('VITE_APPWRITE_DOCUMENT_TEMPLATES_COLLECTION_ID'),
    complianceSubmissions: read('VITE_APPWRITE_COMPLIANCE_SUBMISSIONS_COLLECTION_ID'),
    documentInstances: read('VITE_APPWRITE_DOCUMENT_INSTANCES_COLLECTION_ID'),
  },
};
