/**
 * Notification Service
 * Handles all notification types including compliance notifications
 */

import { databases, config } from '../lib/appwrite.js';
import { ID } from 'appwrite';

const dbId = config.databaseId;
const notificationsCol = config.complianceNotificationsCollectionId || 'compliance_notifications';

/**
 * Send a compliance notification to a staff member
 */
export async function sendComplianceNotification(staffId, type, title, message, metadata = {}) {
  if (config.isDemoMode) {
    console.log('Demo mode: notification not sent', { staffId, type, title });
    return { $id: 'demo_notification' };
  }

  if (!notificationsCol || notificationsCol === 'compliance_notifications') {
    console.warn('Compliance notifications collection not configured');
    return null;
  }

  try {
    const notification = await databases.createDocument(
      dbId,
      notificationsCol,
      ID.unique(),
      {
        staff_id: staffId,
        compliance_id: metadata.complianceId || null,
        type,
        title,
        message,
        read: false,
        created_at: new Date().toISOString(),
        metadata: JSON.stringify(metadata),
      }
    );

    console.log(`✅ Notification sent to ${staffId}: ${type}`);
    return notification;
  } catch (error) {
    console.error('Failed to send notification:', error);
    throw error;
  }
}

export async function notifyStepSaved(staffId, stepNumber, complianceId) {
  return sendComplianceNotification(
    staffId,
    'step_saved',
    `Step ${stepNumber} Saved`,
    `Your BS7858 compliance step ${stepNumber} has been saved successfully.`,
    { complianceId, stepNumber }
  );
}

export async function notifyComplianceSubmitted(staffId, complianceId, reviewerIds = []) {
  await sendComplianceNotification(
    staffId,
    'submitted',
    'Compliance Submitted',
    'Your BS7858 compliance has been submitted for review.',
    { complianceId }
  );

  for (const reviewerId of reviewerIds) {
    await sendComplianceNotification(
      reviewerId,
      'review_required',
      'Compliance Review Required',
      `A staff member has submitted their BS7858 compliance for review.`,
      { complianceId, staffId }
    );
  }
}

export async function notifyComplianceApproved(staffId, complianceId, reviewerName) {
  return sendComplianceNotification(
    staffId,
    'approved',
    '✅ Compliance Approved',
    `Congratulations! Your BS7858 compliance has been approved by ${reviewerName}.`,
    { complianceId, reviewerName }
  );
}

export async function notifyComplianceRejected(staffId, complianceId, reason, reviewerName) {
  return sendComplianceNotification(
    staffId,
    'rejected',
    '❌ Compliance Rejected',
    `Your BS7858 compliance has been rejected by ${reviewerName}. Reason: ${reason}`,
    { complianceId, reason, reviewerName }
  );
}

export async function notifyMissingSections(staffId, complianceId, missingSections) {
  const sectionsText = missingSections.join(', ');
  return sendComplianceNotification(
    staffId,
    'missing_info',
    '⚠️ Missing Information',
    `Missing sections: ${sectionsText}. Please complete all sections.`,
    { complianceId, missingSections }
  );
}
