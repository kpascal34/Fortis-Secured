import React from 'react';

const emptyRow = { activityType: 'employment', employer: '', role: '', fromDate: '', toDate: '', gapExplanation: '' };

const EmploymentHistoryStep = ({ rows, onChange }) => {
  const updateRow = (index, key, value) => {
    const next = rows.map((row, i) => (i === index ? { ...row, [key]: value } : row));
    onChange(next);
  };

  const addRow = () => onChange([...rows, { ...emptyRow }]);

  const removeRow = (index) => {
    if (rows.length === 1) return;
    onChange(rows.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div key={`${index}-${row.fromDate}`} className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">History row {index + 1}</p>
            <button type="button" onClick={() => removeRow(index)} className="text-xs text-red-300">Remove</button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Activity Type" value={row.activityType} onChange={(v) => updateRow(index, 'activityType', v)} placeholder="employment, education, unemployment" />
            <Input label="Employer / Institution" value={row.employer} onChange={(v) => updateRow(index, 'employer', v)} />
            <Input label="Role / Activity" value={row.role} onChange={(v) => updateRow(index, 'role', v)} />
            <Input label="From" type="date" value={row.fromDate} onChange={(v) => updateRow(index, 'fromDate', v)} />
            <Input label="To" type="date" value={row.toDate} onChange={(v) => updateRow(index, 'toDate', v)} />
            <Input label="Gap explanation (required if gap > 31 days)" value={row.gapExplanation} onChange={(v) => updateRow(index, 'gapExplanation', v)} />
          </div>
        </div>
      ))}
      <button type="button" onClick={addRow} className="rounded-lg border border-accent/60 px-3 py-2 text-sm text-accent">+ Add row</button>
    </div>
  );
};

const Input = ({ label, value, onChange, type = 'text', placeholder = '' }) => (
  <label className="text-sm text-white/80">
    {label}
    <input
      type={type}
      value={value || ''}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white"
    />
  </label>
);

export const employmentEmptyRow = emptyRow;
export default EmploymentHistoryStep;
