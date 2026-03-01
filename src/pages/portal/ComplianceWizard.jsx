import React, { useMemo, useState } from 'react';
import GlassPanel from '../../components/GlassPanel.jsx';
import PortalHeader from '../../components/PortalHeader.jsx';
import SignaturePad from '../../components/compliance/SignaturePad.jsx';
import EmploymentHistoryStep, { employmentEmptyRow } from '../../components/compliance/EmploymentHistoryStep.jsx';
import { useCurrentUser, useRole } from '../../hooks/useRBAC.js';
import Button from '../../components/ui/Button.jsx';
import {
  createAuditLog,
  getMySubmission,
  getSubmissionInstances,
  listAllSubmissions,
  submitToComplianceFunction,
  updateSubmissionStatus,
  upsertDraftSubmission,
} from '../../services/complianceWizardV1Service.js';

const CONSENTS = [
  { key: 'criminalChecks', label: 'I consent to criminal record checks.' },
  { key: 'employmentChecks', label: 'I consent to employment and reference checks.' },
  { key: 'identityChecks', label: 'I consent to identity and right-to-work checks.' },
  { key: 'dataProcessing', label: 'I consent to processing personal data for vetting.' },
];

const initialState = {
  personalDetails: { firstName: '', lastName: '', dob: '', address: '', phone: '', email: '' },
  siaDbs: { siaNumber: '', siaExpiry: '', dbsNumber: '', dbsIssueDate: '' },
  employmentHistory: [{ ...employmentEmptyRow }],
  rightToWork: { declaration: false, documentType: '', expiryDate: '' },
  consents: Object.fromEntries(CONSENTS.map((c) => [c.key, false])),
  declarationAccepted: false,
  declarationName: '',
  signatureDataUrl: '',
  signatureDate: new Date().toISOString().slice(0, 10),
};

const steps = [
  'Personal Details',
  'SIA Licence & DBS',
  '5-Year Employment/Activity History',
  'Right to Work',
  'Vetting Consent',
  'Declaration',
  'Signature',
];

const ComplianceWizard = () => {
  const { user, loading: userLoading } = useCurrentUser();
  const { isStaff, isAdmin, loading: roleLoading } = useRole();
  const [state, setState] = useState(initialState);
  const [activeStep, setActiveStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [submission, setSubmission] = useState(null);
  const [instances, setInstances] = useState([]);
  const [adminSubmissions, setAdminSubmissions] = useState([]);
  const [adminNote, setAdminNote] = useState('');

  React.useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        if (isStaff) {
          const existing = await getMySubmission(user.$id);
          setSubmission(existing);
          if (existing?.formData) {
            setState((prev) => ({ ...prev, ...JSON.parse(existing.formData) }));
          }
          setInstances(await getSubmissionInstances(user.$id));
        }
        if (isAdmin) {
          setAdminSubmissions(await listAllSubmissions());
        }
      } catch (loadError) {
        setError(loadError.message || 'Failed to load compliance data.');
      }
    };
    load();
  }, [user, isStaff, isAdmin]);

  const coverage = useMemo(() => validateEmploymentCoverage(state.employmentHistory), [state.employmentHistory]);

  const submitDisabledReason = getSubmitDisabledReason(state, coverage);
  const isSubmitDisabled = busy || Boolean(submitDisabledReason);

  const saveDraft = async () => {
    setBusy(true);
    setError('');
    try {
      const saved = await upsertDraftSubmission({ existingId: submission?.$id, staffId: user.$id, formData: state });
      await createAuditLog({
        actorUserId: user.$id,
        action: 'compliance_draft_saved',
        entityType: 'complianceSubmissions',
        entityId: saved.$id,
        metadata: { step: activeStep + 1 },
      });
      setSubmission(saved);
      setToast('Draft saved.');
    } catch (saveError) {
      setError(saveError.message || 'Failed to save draft.');
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    const validationError = validateBeforeSubmit(state, coverage);
    if (validationError) {
      setError(validationError);
      return;
    }

    setBusy(true);
    setError('');
    try {
      const saved = await upsertDraftSubmission({ existingId: submission?.$id, staffId: user.$id, formData: state });
      const fullName = `${state.personalDetails.firstName} ${state.personalDetails.lastName}`.trim();
      const result = await submitToComplianceFunction({
        staffId: user.$id,
        fullName,
        submissionId: saved.$id,
        formData: state,
      });

      await updateSubmissionStatus(saved.$id, 'submitted');
      await createAuditLog({ actorUserId: user.$id, action: 'compliance_submitted', entityType: 'complianceSubmissions', entityId: saved.$id, metadata: result });
      setToast('Submitted successfully. PDF generated and uploaded to Drive.');
      setInstances(await getSubmissionInstances(user.$id));
      setSubmission({ ...saved, status: 'submitted' });
    } catch (submitError) {
      setError(submitError.message || 'Submission failed.');
    } finally {
      setBusy(false);
    }
  };

  const adminDecision = async (doc, approved) => {
    try {
      setBusy(true);
      await updateSubmissionStatus(doc.$id, approved ? 'approved' : 'rejected', adminNote, user.$id);
      await createAuditLog({
        actorUserId: user.$id,
        action: approved ? 'compliance_approved' : 'compliance_rejected',
        entityType: 'complianceSubmissions',
        entityId: doc.$id,
        metadata: { notes: adminNote },
      });
      setToast(`Submission ${approved ? 'approved' : 'rejected'}.`);
      setAdminSubmissions(await listAllSubmissions());
    } catch (decisionError) {
      setError(decisionError.message || 'Failed to update submission status.');
    } finally {
      setBusy(false);
    }
  };

  if (userLoading || roleLoading) return <div className="p-6 text-white">Loading...</div>;
  if (!isStaff && !isAdmin) return <div className="p-6 text-white">Access denied.</div>;

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-dark via-night-sky to-night-sky px-4 py-8 text-white">
        <div className="mx-auto max-w-6xl">
          <PortalHeader eyebrow="Compliance" title="Compliance Submissions" description="Review, approve or reject staff submissions." />
          {error && <Alert tone="error" message={error} />}
          {toast && <Alert tone="success" message={toast} />}
          <div className="space-y-4">
            {adminSubmissions.map((doc) => (
              <GlassPanel key={doc.$id} className="border-white/10 bg-white/5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-white/70">Staff ID: {doc.staffId}</p>
                    <p className="text-base font-semibold">Status: {doc.status}</p>
                    {doc.webViewLink && <a className="text-accent underline" href={doc.webViewLink} target="_blank" rel="noreferrer">Open generated PDF</a>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="success" onClick={() => adminDecision(doc, true)} disabled={busy} disabledReason="Please wait while we process your previous action.">Approve</Button>
                    <Button variant="danger" onClick={() => adminDecision(doc, false)} disabled={busy} disabledReason="Please wait while we process your previous action.">Reject</Button>
                  </div>
                </div>
              </GlassPanel>
            ))}
          </div>
          <label className="mt-5 block text-sm text-white/80">Review notes
            <textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} className="mt-1 w-full rounded border border-white/20 bg-white/5 p-3" />
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-night-sky to-night-sky px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <PortalHeader eyebrow="Compliance" title="Compliance Wizard v1" description="Complete your pre-employment declaration and vetting consent." />
        {error && <Alert tone="error" message={error} />}
        {toast && <Alert tone="success" message={toast} />}

        <GlassPanel className="mb-4 border-white/10 bg-white/5">
          <div className="grid gap-2 md:grid-cols-7">
            {steps.map((name, index) => (
              <Button
                key={name}
                type="button"
                onClick={() => setActiveStep(index)}
                variant={index === activeStep ? 'tabActive' : 'tab'}
              >
                {index + 1}. {name}
              </Button>
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="border-white/10 bg-white/5">
          {activeStep === 0 && <PersonalDetails value={state.personalDetails} onChange={(v) => setState({ ...state, personalDetails: v })} />}
          {activeStep === 1 && <SiaDbs value={state.siaDbs} onChange={(v) => setState({ ...state, siaDbs: v })} />}
          {activeStep === 2 && (
            <>
              <EmploymentHistoryStep rows={state.employmentHistory} onChange={(v) => setState({ ...state, employmentHistory: v })} />
              <p className={`mt-3 text-sm ${coverage.ok ? 'text-emerald-300' : 'text-amber-300'}`}>{coverage.message}</p>
            </>
          )}
          {activeStep === 3 && <RightToWork value={state.rightToWork} onChange={(v) => setState({ ...state, rightToWork: v })} />}
          {activeStep === 4 && <ConsentStep value={state.consents} onChange={(v) => setState({ ...state, consents: v })} />}
          {activeStep === 5 && <DeclarationStep value={state} onChange={setState} />}
          {activeStep === 6 && <SignatureStep value={state} onChange={setState} />}

          <div className="mt-6 flex flex-wrap justify-between gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={saveDraft}
              disabled={busy}
              disabledReason="Please wait while we process your previous action."
            >
              Save Draft
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setActiveStep((s) => Math.max(0, s - 1))}>Back</Button>
              <Button
                type="button"
                onClick={() => activeStep === 6 ? submit() : setActiveStep((s) => Math.min(6, s + 1))}
                disabled={activeStep === 6 ? isSubmitDisabled : busy}
                disabledReason={activeStep === 6 ? submitDisabledReason : 'Please wait while we process your previous action.'}
              >
                {activeStep === 6 ? 'Submit' : 'Next'}
              </Button>
            </div>
          </div>
        </GlassPanel>

        {instances.length > 0 && (
          <GlassPanel className="mt-6 border-white/10 bg-white/5">
            <h3 className="mb-2 text-lg font-semibold">Your completed PDFs</h3>
            {instances.map((item) => (
              <p key={item.$id} className="text-sm text-white/80">
                <a href={item.webViewLink} target="_blank" rel="noreferrer" className="text-accent underline">Open PDF ({item.createdAt?.slice(0, 10)})</a>
              </p>
            ))}
          </GlassPanel>
        )}
      </div>
    </div>
  );
};

const Alert = ({ tone, message }) => <div className={`mb-4 rounded-lg border p-3 text-sm ${tone === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'}`}>{message}</div>;
const Input = ({ label, value, onChange, type = 'text', placeholder = '', disabled = false }) => <label className="text-sm text-white/80">{label}<input type={type} value={value || ''} placeholder={placeholder} disabled={disabled} tabIndex={disabled ? -1 : undefined} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/50" /></label>;

const PersonalDetails = ({ value, onChange }) => (
  <div className="grid gap-3 md:grid-cols-2">
    <Input label="First Name" value={value.firstName} onChange={(v) => onChange({ ...value, firstName: v })} />
    <Input label="Last Name" value={value.lastName} onChange={(v) => onChange({ ...value, lastName: v })} />
    <Input label="Date of birth" type="date" value={value.dob} onChange={(v) => onChange({ ...value, dob: v })} />
    <Input label="Phone" value={value.phone} onChange={(v) => onChange({ ...value, phone: v })} />
    <Input label="Email" value={value.email} onChange={(v) => onChange({ ...value, email: v })} />
    <Input label="Address" value={value.address} onChange={(v) => onChange({ ...value, address: v })} />
  </div>
);

const SiaDbs = ({ value, onChange }) => (
  <div className="grid gap-3 md:grid-cols-2">
    <Input label="SIA licence number" value={value.siaNumber} onChange={(v) => onChange({ ...value, siaNumber: v })} />
    <Input label="SIA expiry" type="date" value={value.siaExpiry} onChange={(v) => onChange({ ...value, siaExpiry: v })} />
    <Input label="DBS certificate number" value={value.dbsNumber} onChange={(v) => onChange({ ...value, dbsNumber: v })} />
    <Input label="DBS issue date" type="date" value={value.dbsIssueDate} onChange={(v) => onChange({ ...value, dbsIssueDate: v })} />
  </div>
);

const RightToWork = ({ value, onChange }) => (
  <div className="space-y-3">
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.declaration} onChange={(e) => onChange({ ...value, declaration: e.target.checked })} /> I confirm I have the legal right to work in the UK.</label>
    <Input label="RTW document type" value={value.documentType} onChange={(v) => onChange({ ...value, documentType: v })} />
    <Input label="Document expiry" type="date" value={value.expiryDate} onChange={(v) => onChange({ ...value, expiryDate: v })} />
  </div>
);

const ConsentStep = ({ value, onChange }) => (
  <div className="space-y-3">
    {CONSENTS.map((consent) => (
      <label key={consent.key} className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={value[consent.key]} onChange={(e) => onChange({ ...value, [consent.key]: e.target.checked })} />
        {consent.label}
      </label>
    ))}
  </div>
);

const DeclarationStep = ({ value, onChange }) => (
  <div className="space-y-3">
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.declarationAccepted} onChange={(e) => onChange({ ...value, declarationAccepted: e.target.checked })} /> I declare the information provided is accurate and complete.</label>
    <Input label="Declared full name" value={value.declarationName} onChange={(v) => onChange({ ...value, declarationName: v })} />
  </div>
);

const SignatureStep = ({ value, onChange }) => (
  <div className="space-y-3">
    <p className="text-sm text-white/70">Please sign in the box below.</p>
    <SignaturePad value={value.signatureDataUrl} onChange={(v) => onChange({ ...value, signatureDataUrl: v })} />
    <Input label="Signature date" type="date" value={value.signatureDate} onChange={(v) => onChange({ ...value, signatureDate: v })} />
  </div>
);

function validateEmploymentCoverage(rows) {
  if (!rows.length) return { ok: false, message: 'At least one employment/activity row is required.' };
  const normalized = [...rows].filter((r) => r.fromDate).sort((a, b) => new Date(b.toDate || Date.now()) - new Date(a.toDate || Date.now()));
  if (!normalized.length) return { ok: false, message: 'Employment dates are required.' };

  const now = new Date();
  const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
  let cursor = now;

  for (const row of normalized) {
    const from = new Date(row.fromDate);
    const to = new Date(row.toDate || now);
    const gapDays = Math.floor((cursor - to) / 86400000);
    if (gapDays > 31 && !row.gapExplanation?.trim()) {
      return { ok: false, message: `Gap of ${gapDays} days detected. Add a gap explanation.` };
    }
    cursor = from;
  }

  if (cursor > fiveYearsAgo) {
    return { ok: false, message: 'Employment/activity history must cover the full previous 5 years.' };
  }

  return { ok: true, message: '5-year history coverage looks valid.' };
}

function validateBeforeSubmit(state, coverage) {
  const requiredPaths = [
    state.personalDetails.firstName,
    state.personalDetails.lastName,
    state.personalDetails.dob,
    state.personalDetails.address,
    state.personalDetails.email,
    state.siaDbs.siaNumber,
    state.siaDbs.siaExpiry,
    state.siaDbs.dbsNumber,
    state.rightToWork.declaration,
    state.rightToWork.documentType,
    state.declarationAccepted,
    state.declarationName,
    state.signatureDataUrl,
    state.signatureDate,
  ];

  if (requiredPaths.some((value) => !value)) return 'Please complete all required fields before submitting.';
  if (!coverage.ok) return coverage.message;

  const missingConsent = CONSENTS.find((consent) => !state.consents[consent.key]);
  if (missingConsent) return `Consent required: ${missingConsent.label}`;

  return '';
}


function getSubmitDisabledReason(state, coverage) {
  if (!coverage.ok) return coverage.message;

  const missingConsent = CONSENTS.find((consent) => !state.consents[consent.key]);
  if (missingConsent) return `Consent required: ${missingConsent.label}`;

  if (!state.signatureDataUrl) return 'Signature is required before submission.';

  return '';
}

export default ComplianceWizard;
