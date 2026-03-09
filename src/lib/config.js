import { env } from './env.js';

const REQUIRED_BASE = ['appwriteEndpoint', 'appwriteProjectId', 'appwriteDatabaseId'];
const REQUIRED_COLLECTIONS = [
  'clients', 'guards', 'sites', 'posts', 'shifts', 'shiftAssignments', 'incidents', 'assets', 'applications',
  'staffInvites', 'staffProfiles', 'staffCompliance', 'auditLogs', 'complianceUploads', 'notificationOutbox', 'recurringPatterns',
  'managerProfiles', 'timesheets', 'timesheetEntries', 'payrollExports', 'billingExports', 'rateCards', 'complianceRules', 'complianceFlags',
  'contracts', 'marginAlerts', 'forecastModels', 'forecastSnapshots', 'demandPredictions', 'contractHealthSnapshots', 'financeEvents',
  'legalEntities', 'profitSnapshots', 'acquisitionTargets', 'acquisitionModels', 'tenderModels', 'strategicForecasts',
  'enterpriseRiskScores', 'securityEvents', 'cashflowSnapshots', 'concentrationAlerts', 'marginLeakageAlerts',
  'contractDependencyAlerts', 'resilienceSnapshots', 'tenderWinModels', 'employmentRiskFlags',
];

const requestedDemoMode = env.enableDemoMode;
const forceDisableDemoInProd = env.isProd;
const isDemoMode = forceDisableDemoInProd ? false : requestedDemoMode;

const missingBase = REQUIRED_BASE.filter((key) => !env[key]);
const missingCollections = REQUIRED_COLLECTIONS.filter((key) => !env.collectionIds[key]);
const hasRequiredConfig = missingBase.length === 0 && missingCollections.length === 0;

export const config = {
  endpoint: env.appwriteEndpoint,
  projectId: env.appwriteProjectId,
  databaseId: env.appwriteDatabaseId,
  isDemoMode,
  envMode: env.mode,
  hasRequiredConfig,
  missingRequiredConfig: [...missingBase, ...missingCollections.map((id) => `collection:${id}`)],
  usersCollectionId: env.collectionIds.users,
  adminProfilesCollectionId: env.collectionIds.adminProfiles,
  managerProfilesCollectionId: env.collectionIds.managerProfiles,
  staffProfilesCollectionId: env.collectionIds.staffProfiles,
  clientProfilesCollectionId: env.collectionIds.clientProfiles,
  auditLogsCollectionId: env.collectionIds.auditLogs,
  clientsCollectionId: env.collectionIds.clients,
  guardsCollectionId: env.collectionIds.guards,
  sitesCollectionId: env.collectionIds.sites,
  postsCollectionId: env.collectionIds.posts,
  shiftsCollectionId: env.collectionIds.shifts,
  shiftAssignmentsCollectionId: env.collectionIds.shiftAssignments,
  incidentsCollectionId: env.collectionIds.incidents,
  assetsCollectionId: env.collectionIds.assets,
  applicationsCollectionId: env.collectionIds.applications,
  tasksCollectionId: env.collectionIds.tasks,
  staffInvitesCollectionId: env.collectionIds.staffInvites,
  staffNumbersCollectionId: env.collectionIds.staffNumbers,
  staffLeaveCollectionId: env.collectionIds.staffLeave,
  staffTrainingCollectionId: env.collectionIds.staffTraining,
  staffLicensesCollectionId: env.collectionIds.staffLicenses,
  complianceWizardCollectionId: env.collectionIds.complianceWizard,
  staffGradesCollectionId: env.collectionIds.staffGrades,
  staffComplianceCollectionId: env.collectionIds.staffCompliance,
  adminGradingCollectionId: env.collectionIds.adminGrading,
  complianceUploadsCollectionId: env.collectionIds.complianceUploads,
  notificationOutboxCollectionId: env.collectionIds.notificationOutbox,
  timesheetsCollectionId: env.collectionIds.timesheets,
  timesheetEntriesCollectionId: env.collectionIds.timesheetEntries,
  payrollExportsCollectionId: env.collectionIds.payrollExports,
  billingExportsCollectionId: env.collectionIds.billingExports,
  rateCardsCollectionId: env.collectionIds.rateCards,
  complianceRulesCollectionId: env.collectionIds.complianceRules,
  complianceFlagsCollectionId: env.collectionIds.complianceFlags,
  contractsCollectionId: env.collectionIds.contracts,
  marginAlertsCollectionId: env.collectionIds.marginAlerts,
  forecastModelsCollectionId: env.collectionIds.forecastModels,
  forecastSnapshotsCollectionId: env.collectionIds.forecastSnapshots,
  demandPredictionsCollectionId: env.collectionIds.demandPredictions,
  contractHealthSnapshotsCollectionId: env.collectionIds.contractHealthSnapshots,
  financeEventsCollectionId: env.collectionIds.financeEvents,
  legalEntitiesCollectionId: env.collectionIds.legalEntities,
  profitSnapshotsCollectionId: env.collectionIds.profitSnapshots,
  acquisitionTargetsCollectionId: env.collectionIds.acquisitionTargets,
  acquisitionModelsCollectionId: env.collectionIds.acquisitionModels,
  tenderModelsCollectionId: env.collectionIds.tenderModels,
  strategicForecastsCollectionId: env.collectionIds.strategicForecasts,
  enterpriseRiskScoresCollectionId: env.collectionIds.enterpriseRiskScores,
  securityEventsCollectionId: env.collectionIds.securityEvents,
  cashflowSnapshotsCollectionId: env.collectionIds.cashflowSnapshots,
  concentrationAlertsCollectionId: env.collectionIds.concentrationAlerts,
  marginLeakageAlertsCollectionId: env.collectionIds.marginLeakageAlerts,
  contractDependencyAlertsCollectionId: env.collectionIds.contractDependencyAlerts,
  resilienceSnapshotsCollectionId: env.collectionIds.resilienceSnapshots,
  tenderWinModelsCollectionId: env.collectionIds.tenderWinModels,
  employmentRiskFlagsCollectionId: env.collectionIds.employmentRiskFlags,
  financeIntegrationEnabled: env.financeIntegrationEnabled,
  breakGlassEmailAllowlist: env.breakGlassEmailAllowlist,
  departmentsCollectionId: env.collectionIds.departments,
  recurringPatternsCollectionId: env.collectionIds.recurringPatterns,
  documentTemplatesCollectionId: env.collectionIds.documentTemplates,
  complianceSubmissionsCollectionId: env.collectionIds.complianceSubmissions,
  documentInstancesCollectionId: env.collectionIds.documentInstances,
  documentsBucketId: env.filesBucketId,
  compliancePdfFunctionUrl: env.compliancePdfFunctionUrl,
  licenseExpiryThresholdDays: env.licenseExpiryThresholdDays,
  enableComplianceV1: env.enableComplianceV1,
  publicBaseUrl: env.publicBaseUrl,
  adminEmails: env.adminEmails,
  internalEmailDomains: env.internalEmailDomains,
  opsEmail: env.opsEmail,
  googleDriveParentFolderId: env.googleDriveParentFolderId,
  googleDriveServiceAccountJson: env.googleDriveServiceAccountJson,
};

export const getFatalConfigError = () => {
  if (!env.isProd) return null;
  if (config.isDemoMode) {
    return 'Demo mode is disabled in production. Remove VITE_ENABLE_DEMO_MODE=true from production config.';
  }
  if (!config.hasRequiredConfig) {
    return `Missing required production configuration: ${config.missingRequiredConfig.join(', ')}`;
  }
  return null;
};

// Log missing config in development so devs notice early
if (env.isDev && !config.isDemoMode && !config.hasRequiredConfig) {
  console.warn(
    '[Fortis Config] Missing configuration (will be fatal in production):',
    config.missingRequiredConfig.join(', ')
  );
}
