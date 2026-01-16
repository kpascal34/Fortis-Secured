import React, { useState, useEffect } from 'react';
import { getGradingCriteriaTemplate, getGradingScale, getGradeColor, getAverageCriteriaGrade } from '../services/gradingService';
import GlassPanel from './GlassPanel';

const GradingModal = ({ isOpen, staff, onClose, onSubmit, isLoading = false, existingGrade = null }) => {
  const [criteria, setCriteria] = useState({});
  const [comment, setComment] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && staff) {
      // Initialize criteria with existing grade data if available
      if (existingGrade?.criteria) {
        const parsedCriteria = typeof existingGrade.criteria === 'string' 
          ? JSON.parse(existingGrade.criteria) 
          : existingGrade.criteria;
        setCriteria(parsedCriteria);
      } else {
        // Initialize all criteria with default score
        const template = getGradingCriteriaTemplate();
        const initialCriteria = {};
        Object.keys(template).forEach(key => {
          initialCriteria[key] = 3; // Default to satisfactory
        });
        setCriteria(initialCriteria);
      }
      setComment(existingGrade?.comment || '');
      setError(null);
    }
  }, [isOpen, staff, existingGrade]);

  const handleCriterionChange = (criterion, value) => {
    const numValue = parseInt(value, 10);
    if (numValue >= 1 && numValue <= 5) {
      setCriteria({ ...criteria, [criterion]: numValue });
      setError(null);
    }
  };

  const handleSubmit = async () => {
    // Validation
    const template = getGradingCriteriaTemplate();
    for (const criterion of Object.keys(template)) {
      if (!criteria[criterion] || criteria[criterion] < 1 || criteria[criterion] > 5) {
        setError(`${template[criterion].label} score must be 1-5`);
        return;
      }
    }

    if (!comment.trim()) {
      setError('Please add comments about the performance');
      return;
    }

    try {
      const averageGrade = getAverageCriteriaGrade(criteria);
      await onSubmit({
        criteria,
        overallGrade: Math.round(averageGrade),
        comment: comment.trim(),
      });
      // Reset form after successful submission
      setCriteria({});
      setComment('');
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to submit grade');
    }
  };

  if (!isOpen) return null;

  const template = getGradingCriteriaTemplate();
  const scale = getGradingScale();
  const averageGrade = getAverageCriteriaGrade(criteria);
  const overallGradeInfo = scale.find(s => s.grade === Math.round(averageGrade));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <GlassPanel className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border-white/20 bg-night-sky/95 p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">Grade Staff Member</h2>
          {staff && (
            <p className="mt-1 text-white/70">
              {staff.firstName} {staff.lastName}
              {staff.email && <span className="ml-2 text-sm text-white/50">({staff.email})</span>}
            </p>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Criteria Scoring Grid */}
        <div className="mb-6 space-y-4">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
            <span className="rounded-full bg-accent/20 px-2 py-1 text-xs text-accent">Criteria</span>
            Performance Assessment
          </h3>

          <div className="space-y-4 rounded-lg bg-white/5 p-4">
            {Object.entries(template).map(([key, criterion]) => (
              <div key={key} className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">{criterion.label}</p>
                    <p className="text-xs text-white/60">{criterion.description}</p>
                  </div>
                  <span className="text-xs font-semibold text-accent">
                    Score: {criteria[key] || 0}/5
                  </span>
                </div>
                
                {/* Score Slider */}
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={criteria[key] || 3}
                    onChange={(e) => handleCriterionChange(key, e.target.value)}
                    className="flex-1 cursor-pointer"
                  />
                  {/* Score Indicators */}
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button
                        key={score}
                        onClick={() => handleCriterionChange(key, score)}
                        className={`h-8 w-8 rounded font-semibold text-xs transition-all ${
                          criteria[key] === score
                            ? `${score === 1 ? 'bg-red-500' : score === 2 ? 'bg-orange-500' : score === 3 ? 'bg-yellow-500' : score === 4 ? 'bg-blue-500' : 'bg-green-500'} text-white scale-110`
                            : `bg-white/10 text-white/50 hover:bg-white/20`
                        }`}
                        title={scale.find(s => s.grade === score)?.label}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Overall Grade Preview */}
        {overallGradeInfo && (
          <div className={`mb-6 rounded-lg border p-4 ${
            Math.round(averageGrade) === 5 ? 'bg-green-500/10 border-green-500/30' :
            Math.round(averageGrade) === 4 ? 'bg-blue-500/10 border-blue-500/30' :
            Math.round(averageGrade) === 3 ? 'bg-yellow-500/10 border-yellow-500/30' :
            Math.round(averageGrade) === 2 ? 'bg-orange-500/10 border-orange-500/30' :
            'bg-red-500/10 border-red-500/30'
          }`}>
            <p className="text-xs text-white/70">Overall Grade (Average)</p>
            <div className="mt-2 flex items-center justify-between">
              <div>
                <p className={`text-3xl font-bold ${
                  Math.round(averageGrade) === 5 ? 'text-green-400' :
                  Math.round(averageGrade) === 4 ? 'text-blue-400' :
                  Math.round(averageGrade) === 3 ? 'text-yellow-400' :
                  Math.round(averageGrade) === 2 ? 'text-orange-400' :
                  'text-red-400'
                }`}>
                  {Math.round(averageGrade)}/5
                </p>
                <p className={`text-sm font-semibold ${
                  Math.round(averageGrade) === 5 ? 'text-green-300' :
                  Math.round(averageGrade) === 4 ? 'text-blue-300' :
                  Math.round(averageGrade) === 3 ? 'text-yellow-300' :
                  Math.round(averageGrade) === 2 ? 'text-orange-300' :
                  'text-red-300'
                }`}>
                  {overallGradeInfo.label}
                </p>
              </div>
              <p className={`text-sm ${
                Math.round(averageGrade) === 5 ? 'text-green-200' :
                Math.round(averageGrade) === 4 ? 'text-blue-200' :
                Math.round(averageGrade) === 3 ? 'text-yellow-200' :
                Math.round(averageGrade) === 2 ? 'text-orange-200' :
                'text-red-200'
              }`}>
                {overallGradeInfo.description}
              </p>
            </div>
          </div>
        )}

        {/* Comments Section */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-semibold text-white">
            Performance Comments <span className="text-accent">*</span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              if (error?.includes('comments')) setError(null);
            }}
            placeholder="Provide detailed feedback on the staff member's performance, areas of strength, and areas for improvement..."
            rows="4"
            className="w-full rounded-lg bg-white/5 px-4 py-3 text-white placeholder-white/40 outline-none ring-1 ring-white/10 focus:ring-accent"
          />
          <p className="mt-1 text-xs text-white/60">
            Minimum required. Be specific and constructive.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 rounded-lg border border-white/20 bg-white/5 px-4 py-2 font-semibold text-white transition-all hover:bg-white/10 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !staff}
            className="flex-1 rounded-lg bg-accent px-4 py-2 font-semibold text-night-sky transition-all hover:bg-accent/90 disabled:opacity-50"
          >
            {isLoading ? 'Submitting…' : 'Submit Grade'}
          </button>
        </div>

        {/* Scale Reference */}
        <div className="mt-6 border-t border-white/10 pt-4">
          <p className="mb-2 text-xs font-semibold text-white/70">GRADING SCALE REFERENCE</p>
          <div className="grid gap-2 text-xs">
            {scale.map((s) => (
              <div key={s.grade} className="flex items-center gap-2">
                <span className={`inline-flex h-5 w-5 items-center justify-center rounded font-semibold ${
                  s.color === 'red' ? 'bg-red-500/20 text-red-400' :
                  s.color === 'orange' ? 'bg-orange-500/20 text-orange-400' :
                  s.color === 'yellow' ? 'bg-yellow-500/20 text-yellow-400' :
                  s.color === 'blue' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  {s.grade}
                </span>
                <span className={`font-semibold ${
                  s.color === 'red' ? 'text-red-400' :
                  s.color === 'orange' ? 'text-orange-400' :
                  s.color === 'yellow' ? 'text-yellow-400' :
                  s.color === 'blue' ? 'text-blue-400' :
                  'text-green-400'
                }`}>{s.label}</span>
                <span className="text-white/50">—</span>
                <span className="text-white/60">{s.description}</span>
              </div>
            ))}
          </div>
        </div>
      </GlassPanel>
    </div>
  );
};

export default GradingModal;
