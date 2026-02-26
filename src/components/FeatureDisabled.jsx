import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AiOutlineClockCircle } from 'react-icons/ai';

/**
 * FeatureDisabled Component
 * Displays a "Coming Soon" page for disabled features
 * @param {Object} props
 * @param {string} [props.featureName='This feature'] - Name of the disabled feature
 */
export function FeatureDisabled({ featureName = 'This feature' }) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-[400px] px-4">
      <div className="text-center max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-accent/20 rounded-full blur-xl" />
            <AiOutlineClockCircle className="relative h-16 w-16 text-accent" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mb-3">Coming Soon</h2>
        <p className="fs-banner mb-6 text-left">
          {featureName} is not currently available. We're scaling back to focus on our core offerings and will return with enhanced functionality.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('/portal')}
            className="inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 font-medium text-brand-foreground transition-colors hover:opacity-90"
          >
            Return to Dashboard
          </button>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 font-medium text-text transition-colors hover:bg-surface-2"
          >
            Go Back
          </button>
        </div>

        <p className="text-xs text-white/50 mt-6">
          Thank you for your patience as we improve the platform.
        </p>
      </div>
    </div>
  );
}

/**
 * FeatureGuard Component
 * Wraps content and shows FeatureDisabled if feature is not enabled
 * @param {Object} props
 * @param {boolean} props.enabled - Whether the feature is enabled
 * @param {string} [props.featureName='This feature'] - Name of the feature
 * @param {React.ReactNode} props.children - Content to show if enabled
 */
export function FeatureGuard({
  enabled,
  featureName = 'This feature',
  children,
}) {
  if (!enabled) {
    return <FeatureDisabled featureName={featureName} />;
  }

  return <>{children}</>;
}
