import React, { useEffect, useMemo, useState } from 'react';
import GlassPanel from '../../components/GlassPanel.jsx';
import PortalHeader from '../../components/PortalHeader.jsx';
import { useCurrentUser, useRole } from '../../hooks/useRBAC';
import {
  getComplianceProgress,
  submitStep1Identity,
  submitStep2Employment,
  submitStep3Evidence,
  submitStep4References,
  submitStep5Criminal,
  submitStep6SIALicence,
  submitStep7Video,
  submitComplianceReview,
} from '../../services/complianceService.js';
import { uploadComplianceFileWithMeta } from '../../services/fileUploadService.js';
import { syncFileToGoogleDrive } from '../../services/googleDriveService.js';

const defaultAddress = { line1: '', postcode: '', months: 0 };
const defaultJob = { employer: '', jobTitle: '', fromDate: '', toDate: '' };
const defaultRef = { name: '', email: '', phone: '', type: 'employer', position: '' };

const ComplianceWizard = () => {
  const { user, loading: userLoading } = useCurrentUser();
  const { isStaff, isAdmin } = useRole();
  const [progress, setProgress] = useState(null);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const [step1, setStep1] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    nationalInsuranceNumber: '',
    addresses: [defaultAddress],
  });

  const [step2, setStep2] = useState({ jobs: [defaultJob] });
  const [evidenceFiles, setEvidenceFiles] = useState('');
  const [refs, setRefs] = useState({ references: [defaultRef, { ...defaultRef, type: 'character' }] });
  const [criminalFile, setCriminalFile] = useState('');
  const [sia, setSia] = useState({ licenceNumber: '', expiryDate: '' });
  const [videoFile, setVideoFile] = useState('');

  const currentStep = useMemo(() => progress?.current_step || step, [progress, step]);

  useEffect(() => {
    const loadProgress = async () => {
      if (!user || userLoading) return;
      try {
        const data = await getComplianceProgress(user.$id);
        setProgress(data);
        if (data.current_step) setStep(data.current_step);
      } catch (err) {
        setError(err.message || 'Could not load compliance record');
      }
    };
    loadProgress();
  }, [user, userLoading]);

  const onSaveStep1 = async () => {
    try {
      setBusy(true);
      await submitStep1Identity(user.$id, step1);
      setToast('Step 1 saved');
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to save step 1');
    } finally {
      setBusy(false);
    }
  };

  const onSaveStep2 = async () => {
    try {
      setBusy(true);
      await submitStep2Employment(user.$id, step2);
      setToast('Step 2 saved');
      setStep(3);
    } catch (err) {
      setError(err.message || 'Failed to save step 2');
    } finally {
      setBusy(false);
    }
  };

  const onSaveStep3 = async () => {
    try {
      setBusy(true);
      const ids = evidenceFiles.split(',').map(s => s.trim()).filter(Boolean);
      await submitStep3Evidence(user.$id, ids);
      setToast('Step 3 saved');
      setStep(4);
    } catch (err) {
      setError(err.message || 'Failed to save step 3');
    } finally {
      setBusy(false);
    }
  };

  // Upload handlers with automatic Drive sync
  const handleUploadEvidence = async (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file || !user) return;
      setBusy(true);
      const { appwriteFileId, fileName } = await uploadComplianceFileWithMeta(file, file.name);
      const updated = [
        ...evidenceFiles.split(',').map(s => s.trim()).filter(Boolean),
        appwriteFileId,
      ].join(',');
      setEvidenceFiles(updated);
      await syncFileToGoogleDrive(user.$id, appwriteFileId, fileName, 'evidence', appwriteFileId);
      setToast('Evidence uploaded and synced');
      e.target.value = '';
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const handleUploadCriminal = async (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file || !user) return;
      setBusy(true);
      const { appwriteFileId, fileName } = await uploadComplianceFileWithMeta(file, file.name);
      setCriminalFile(appwriteFileId);
      await syncFileToGoogleDrive(user.$id, appwriteFileId, fileName, 'criminal', appwriteFileId);
      setToast('Criminal record uploaded and synced');
      e.target.value = '';
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const handleUploadVideo = async (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file || !user) return;
      setBusy(true);
      const { appwriteFileId, fileName } = await uploadComplianceFileWithMeta(file, file.name);
      setVideoFile(appwriteFileId);
      await syncFileToGoogleDrive(user.$id, appwriteFileId, fileName, 'video', appwriteFileId);
      setToast('Video uploaded and synced');
      e.target.value = '';
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const onSaveStep4 = async () => {
    try {
      setBusy(true);
      await submitStep4References(user.$id, refs);
      setToast('Step 4 saved');
      setStep(5);
    } catch (err) {
      setError(err.message || 'Failed to save step 4');
    } finally {
      setBusy(false);
    }
  };

  const onSaveStep5 = async () => {
    try {
      setBusy(true);
      await submitStep5Criminal(user.$id, criminalFile);
      setToast('Step 5 saved');
      setStep(6);
    } catch (err) {
      setError(err.message || 'Failed to save step 5');
    } finally {
      setBusy(false);
    }
  };

  const onSaveStep6 = async () => {
    try {
      setBusy(true);
      await submitStep6SIALicence(user.$id, sia.licenceNumber, sia.expiryDate);
      setToast('Step 6 saved');
      setStep(7);
    } catch (err) {
      setError(err.message || 'Failed to save step 6');
    } finally {
      setBusy(false);
    }
  };

  const onSaveStep7 = async () => {
    try {
      setBusy(true);
      await submitStep7Video(user.$id, videoFile);
      setToast('Step 7 saved');
    } catch (err) {
      setError(err.message || 'Failed to save step 7');
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = async () => {
    try {
      setBusy(true);
      await submitComplianceReview(user.$id);
      setToast('Submitted for review');
    } catch (err) {
      setError(err.message || 'Submission failed');
    } finally {
      setBusy(false);
    }
  };

  if (!isStaff && !isAdmin) {
    return (
      <div className="min-h-screen bg-night-sky p-6 text-white">
        <GlassPanel className="bg-white/5 border-white/10">
          <p className="text-red-200">Only staff or admins can access the compliance wizard.</p>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-night-sky to-night-sky px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <PortalHeader
          eyebrow="Compliance"
          title="BS7858 Compliance Wizard"
          description="Complete all 7 steps. Gaps >31 days or <5 years coverage will fail validation."
        />

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
        )}
        {toast && (
          <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-200">{toast}</div>
        )}

        {/* Step 1 */}
        <GlassPanel className="mb-6 border-white/10 bg-white/5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Step 1: Identity & Right to Work</h3>
            <span className="text-sm text-white/60">Must cover 5-year address history</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="First Name" value={step1.firstName} onChange={(v) => setStep1({ ...step1, firstName: v })} />
            <Input label="Last Name" value={step1.lastName} onChange={(v) => setStep1({ ...step1, lastName: v })} />
            <Input label="Date of Birth" type="date" value={step1.dateOfBirth} onChange={(v) => setStep1({ ...step1, dateOfBirth: v })} />
            <Input label="NI Number" value={step1.nationalInsuranceNumber} onChange={(v) => setStep1({ ...step1, nationalInsuranceNumber: v })} />
          </div>
          <div className="mt-4 space-y-3">
            <p className="text-sm text-white/70">Address history (total 60+ months)</p>
            {step1.addresses.map((addr, idx) => (
              <div key={idx} className="grid gap-2 md:grid-cols-3">
                <Input label="Address line" value={addr.line1} onChange={(v) => updateAddress(idx, 'line1', v, step1, setStep1)} />
                <Input label="Postcode" value={addr.postcode} onChange={(v) => updateAddress(idx, 'postcode', v, step1, setStep1)} />
                <Input label="Months at address" type="number" value={addr.months} onChange={(v) => updateAddress(idx, 'months', Number(v), step1, setStep1)} />
              </div>
            ))}
            <button className="text-sm text-accent" type="button" onClick={() => setStep1({ ...step1, addresses: [...step1.addresses, defaultAddress] })}>+ Add address</button>
          </div>
          <ActionRow onSave={onSaveStep1} disabled={busy} done={currentStep >= 1} />
        </GlassPanel>

        {/* Step 2 */}
        <GlassPanel className="mb-6 border-white/10 bg-white/5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Step 2: Employment History (5 years, no gaps &gt;31 days)</h3>
          </div>
          <div className="space-y-3">
            {step2.jobs.map((job, idx) => (
              <div key={idx} className="grid gap-2 md:grid-cols-4">
                <Input label="Employer" value={job.employer} onChange={(v) => updateJob(idx, 'employer', v, step2, setStep2)} />
                <Input label="Job Title" value={job.jobTitle} onChange={(v) => updateJob(idx, 'jobTitle', v, step2, setStep2)} />
                <Input label="From" type="date" value={job.fromDate} onChange={(v) => updateJob(idx, 'fromDate', v, step2, setStep2)} />
                <Input label="To" type="date" value={job.toDate} onChange={(v) => updateJob(idx, 'toDate', v, step2, setStep2)} />
              </div>
            ))}
            <button className="text-sm text-accent" type="button" onClick={() => setStep2({ jobs: [...step2.jobs, defaultJob] })}>+ Add job</button>
          </div>
          <ActionRow onSave={onSaveStep2} disabled={busy || currentStep < 1} done={currentStep >= 2} />
        </GlassPanel>

        {/* Step 3 */}
        <GlassPanel className="mb-6 border-white/10 bg-white/5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Step 3: Evidence Uploads</h3>
            <span className="text-sm text-white/60">Enter Appwrite file IDs (comma separated)</span>
          </div>
          <Input label="Evidence file IDs" value={evidenceFiles} onChange={setEvidenceFiles} placeholder="file1,file2" />
          <div className="mt-2">
            <label className="mb-2 block text-sm text-white/80">Or upload evidence</label>
            <input type="file" accept="application/pdf,image/*" onChange={handleUploadEvidence} className="block w-full text-sm text-white/80" />
          </div>
          <ActionRow onSave={onSaveStep3} disabled={busy || currentStep < 2} done={currentStep >= 3} />
        </GlassPanel>

        {/* Step 4 */}
        <GlassPanel className="mb-6 border-white/10 bg-white/5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Step 4: References (1 employer + 1 character)</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {refs.references.map((ref, idx) => (
              <div key={idx} className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">{ref.type}</p>
                <Input label="Name" value={ref.name} onChange={(v) => updateRef(idx, 'name', v, refs, setRefs)} />
                <Input label="Email" value={ref.email} onChange={(v) => updateRef(idx, 'email', v, refs, setRefs)} />
                <Input label="Phone" value={ref.phone} onChange={(v) => updateRef(idx, 'phone', v, refs, setRefs)} />
                <Input label="Position" value={ref.position} onChange={(v) => updateRef(idx, 'position', v, refs, setRefs)} />
              </div>
            ))}
          </div>
          <ActionRow onSave={onSaveStep4} disabled={busy || currentStep < 3} done={currentStep >= 4} />
        </GlassPanel>

        {/* Step 5 */}
        <GlassPanel className="mb-6 border-white/10 bg-white/5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Step 5: Criminal Record (Basic Disclosure upload)</h3>
          </div>
          <Input label="Criminal record file ID" value={criminalFile} onChange={setCriminalFile} placeholder="file id" />
          <div className="mt-2">
            <label className="mb-2 block text-sm text-white/80">Or upload criminal record</label>
            <input type="file" accept="application/pdf,image/*" onChange={handleUploadCriminal} className="block w-full text-sm text-white/80" />
          </div>
          <ActionRow onSave={onSaveStep5} disabled={busy || currentStep < 4} done={currentStep >= 5} />
        </GlassPanel>

        {/* Step 6 */}
        <GlassPanel className="mb-6 border-white/10 bg-white/5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Step 6: SIA Licence</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Licence number" value={sia.licenceNumber} onChange={(v) => setSia({ ...sia, licenceNumber: v })} />
            <Input label="Expiry date" type="date" value={sia.expiryDate} onChange={(v) => setSia({ ...sia, expiryDate: v })} />
          </div>
          <ActionRow onSave={onSaveStep6} disabled={busy || currentStep < 5} done={currentStep >= 6} />
        </GlassPanel>

        {/* Step 7 */}
        <GlassPanel className="mb-6 border-white/10 bg-white/5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Step 7: Intro Video</h3>
          </div>
          <Input label="Video file ID" value={videoFile} onChange={setVideoFile} placeholder="file id" />
          <div className="mt-2">
            <label className="mb-2 block text-sm text-white/80">Or upload intro video</label>
            <input type="file" accept="video/*" onChange={handleUploadVideo} className="block w-full text-sm text-white/80" />
          </div>
          <ActionRow onSave={onSaveStep7} disabled={busy || currentStep < 6} done={currentStep >= 7} />
        </GlassPanel>

        <div className="flex justify-end">
          <button
            onClick={onSubmit}
            disabled={busy || currentStep < 7}
            className="rounded-lg bg-accent px-5 py-3 font-semibold text-night-sky disabled:cursor-not-allowed disabled:bg-white/20"
          >
            Submit for Review
          </button>
        </div>
      </div>
    </div>
  );
};

const Input = ({ label, value, onChange, type = 'text', placeholder = '' }) => (
  <label className="block text-sm text-white/80">
    {label}
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="mt-1 w-full rounded-lg bg-white/5 px-3 py-3 text-white outline-none ring-1 ring-white/10 focus:ring-accent"
    />
  </label>
);

const ActionRow = ({ onSave, disabled, done }) => (
  <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
    <div className="text-xs text-white/60">{done ? 'Saved' : 'Not saved'}</div>
    <button
      type="button"
      onClick={onSave}
      disabled={disabled}
      className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-night-sky disabled:cursor-not-allowed disabled:bg-white/20"
    >
      Save Step
    </button>
  </div>
);

function updateAddress(idx, key, value, state, setter) {
  const addresses = state.addresses.map((a, i) => (i === idx ? { ...a, [key]: value } : a));
  setter({ ...state, addresses });
}

function updateJob(idx, key, value, state, setter) {
  const jobs = state.jobs.map((j, i) => (i === idx ? { ...j, [key]: value } : j));
  setter({ ...state, jobs });
}

function updateRef(idx, key, value, state, setter) {
  const references = state.references.map((r, i) => (i === idx ? { ...r, [key]: value } : r));
  setter({ ...state, references });
}

export default ComplianceWizard;
