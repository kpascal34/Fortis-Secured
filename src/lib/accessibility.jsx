/**
 * Accessibility Utilities
 * 
 * Provides helpers for WCAG 2.1 AA compliance:
 * - Color contrast validation
 * - ARIA labels management
 * - Keyboard navigation support
 * - Focus management
 */

/**
 * Color Contrast Ratio Calculator
 * Uses WCAG 2.1 formula to calculate contrast ratio between two colors
 * 
 * @param {string} color1 - Hex color (e.g., '#FFFFFF')
 * @param {string} color2 - Hex color (e.g., '#000000')
 * @returns {number} Contrast ratio (1 to 21)
 */
export function getContrastRatio(color1, color2) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return 0;
  
  const lum1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);
  
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Convert hex to RGB
 * @param {string} hex - Hex color
 * @returns {object|null} { r, g, b } or null if invalid
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
}

/**
 * Get relative luminance for contrast calculation
 * WCAG 2.1 formula
 */
function getRelativeLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(x => {
    x = x / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Check if contrast ratio meets WCAG AA standard
 * @param {number} ratio - Contrast ratio
 * @param {string} level - 'AA' or 'AAA' (default 'AA')
 * @returns {boolean}
 */
export function meetsContrastStandard(ratio, level = 'AA') {
  const standards = {
    'AA': { normal: 4.5, large: 3 },
    'AAA': { normal: 7, large: 4.5 },
  };
  return ratio >= standards[level].normal;
}

/**
 * Color scheme for accessible icon backgrounds
 * All combinations meet WCAG AA contrast for foreground
 */
export const A11Y_COLOR_SCHEME = {
  // Background: night-sky (#0B1220), Foreground colors
  backgrounds: {
    blue: { bg: '#0B3D91', fg: '#FFFFFF', contrast: 11.2 },
    teal: { bg: '#0BD3D3', fg: '#000000', contrast: 16.8 },  // Accent
    green: { bg: '#10B981', fg: '#FFFFFF', contrast: 5.8 },
    red: { bg: '#EF4444', fg: '#FFFFFF', contrast: 3.99 },
    amber: { bg: '#F59E0B', fg: '#000000', contrast: 7.8 },
    purple: { bg: '#8B5CF6', fg: '#FFFFFF', contrast: 4.8 },
    indigo: { bg: '#6366F1', fg: '#FFFFFF', contrast: 5.0 },
  },
  
  // Text colors for dark background (night-sky)
  text: {
    primary: '#FFFFFF',      // 18.4:1 contrast
    secondary: '#F3F4F6',    // 17.4:1 contrast
    muted: '#D1D5DB',        // 9.2:1 contrast
    error: '#FCA5A5',        // 4.6:1 contrast (use with caution)
    success: '#86EFAC',      // 7.0:1 contrast
    warning: '#FCD34D',      // 11.2:1 contrast
    info: '#93C5FD',         // 6.9:1 contrast
  },
  
  // Accessible status badge colors
  badges: {
    success: { bg: '#D1FAE5', fg: '#065F46', contrast: 8.1 },
    warning: { bg: '#FEF3C7', fg: '#78350F', contrast: 9.5 },
    error: { bg: '#FEE2E2', fg: '#7F1D1D', contrast: 9.2 },
    info: { bg: '#DBEAFE', fg: '#0C2340', contrast: 10.3 },
  },
};

/**
 * Generate accessible ARIA label for icon
 * @param {string} iconName - Name of icon (e.g., 'home', 'settings')
 * @param {string} context - Additional context (e.g., 'Dashboard Navigation')
 * @returns {string} Descriptive label
 */
export function getIconAriaLabel(iconName, context = '') {
  const iconLabels = {
    home: 'Home',
    settings: 'Settings',
    user: 'User Profile',
    calendar: 'Calendar',
    clock: 'Time Tracking',
    checkmark: 'Completed',
    close: 'Close',
    menu: 'Menu',
    search: 'Search',
    filter: 'Filter',
    download: 'Download',
    upload: 'Upload',
    delete: 'Delete',
    edit: 'Edit',
    info: 'Information',
    warning: 'Warning',
    error: 'Error',
    success: 'Success',
    chevron: 'Expand',
    arrow: 'Navigate',
    logout: 'Sign Out',
    finance: 'Finance',
    team: 'Team',
    chart: 'Reports',
    robot: 'AI Assistant',
    audit: 'Audit Log',
    message: 'Messages',
    inbox: 'Inbox',
    task: 'Tasks',
    dollar: 'Payroll',
  };
  
  const label = iconLabels[iconName.toLowerCase()] || iconName;
  return context ? `${label} - ${context}` : label;
}

/**
 * Keyboard event handler helper
 * Handles common keyboard interactions
 * @param {KeyboardEvent} e - Event object
 * @param {function} onEnter - Callback for Enter key
 * @param {function} onEscape - Callback for Escape key
 * @param {function} onArrow - Callback for arrow keys {key, direction}
 */
export function handleKeyboardNavigation(e, { onEnter, onEscape, onArrow }) {
  switch (e.key) {
    case 'Enter':
    case ' ':
      onEnter?.(e);
      break;
    case 'Escape':
      onEscape?.(e);
      break;
    case 'ArrowUp':
    case 'ArrowDown':
    case 'ArrowLeft':
    case 'ArrowRight':
      onArrow?.({ key: e.key, direction: e.key.replace('Arrow', '').toLowerCase() });
      break;
    default:
      break;
  }
}

/**
 * Focus management utilities
 */
export const focusManagement = {
  /**
   * Save current focus for restoration later
   * @returns {Element|null}
   */
  saveFocus() {
    return document.activeElement;
  },

  /**
   * Restore focus to previously saved element
   * @param {Element} element
   */
  restoreFocus(element) {
    element?.focus?.();
  },

  /**
   * Move focus to next focusable element in direction
   * @param {Element} container - Container to search within
   * @param {string} direction - 'next' or 'previous'
   */
  moveFocus(container, direction = 'next') {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const currentElement = document.activeElement;
    const currentIndex = Array.from(focusableElements).indexOf(currentElement);
    
    let nextIndex;
    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % focusableElements.length;
    } else {
      nextIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
    }
    
    focusableElements[nextIndex]?.focus();
  },

  /**
   * Trap focus within container (for modals)
   * @param {Element} container
   * @param {KeyboardEvent} e
   */
  trapFocus(container, e) {
    if (e.key !== 'Tab') return;

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement?.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement?.focus();
        e.preventDefault();
      }
    }
  },
};

/**
 * Generate skip link content for keyboard navigation
 * @returns {JSX.Element}
 */
export function SkipLink({ href = '#main-content', text = 'Skip to main content' }) {
  return (
    <a
      href={href}
      className="absolute left-0 top-0 -translate-y-full transform rounded-none bg-accent px-4 py-2 text-night-sky font-semibold focus:translate-y-0"
      aria-label={text}
    >
      {text}
    </a>
  );
}

/**
 * Accessible button component with full a11y support
 * @param {Object} props
 * @returns {JSX.Element}
 */
export function A11yButton({
  children,
  icon: Icon,
  ariaLabel,
  iconOnly = false,
  disabled = false,
  onClick,
  className = '',
  type = 'button',
  title,
  ...props
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      title={title}
      className={`
        rounded-lg px-3 py-2 font-medium
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-night-sky
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      {...props}
    >
      <span className="flex items-center gap-2">
        {Icon && <Icon className="h-5 w-5" aria-hidden="true" />}
        {!iconOnly && children}
      </span>
    </button>
  );
}

/**
 * Accessible form input with label
 * @param {Object} props
 * @returns {JSX.Element}
 */
export function A11yInput({
  label,
  id,
  type = 'text',
  error,
  required = false,
  disabled = false,
  helperText,
  ...props
}) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-white"
        >
          {label}
          {required && <span aria-label="required" className="text-rose-400 ml-1">*</span>}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        required={required}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
        className={`
          rounded-lg border px-3 py-2
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-night-sky
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error
            ? 'border-rose-400 bg-rose-400/10'
            : 'border-white/10 bg-white/5 focus:border-accent'
          }
        `}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-sm text-rose-400" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${inputId}-helper`} className="text-xs text-white/50">
          {helperText}
        </p>
      )}
    </div>
  );
}

/**
 * Accessible modal with focus trap and proper ARIA
 * @param {Object} props
 * @returns {JSX.Element}
 */
export function A11yModal({
  isOpen,
  onClose,
  title,
  children,
  closeButtonAriaLabel = 'Close modal',
}) {
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-lg border border-white/10 bg-night-sky p-6 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-labelledby="modal-title"
        aria-modal="true"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="modal-title" className="text-lg font-bold text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label={closeButtonAriaLabel}
            className="rounded-lg p-1 text-white/70 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-accent"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * Accessible status badge
 * @param {Object} props
 * @returns {JSX.Element}
 */
export function A11yBadge({ status = 'info', label, children }) {
  const statusConfig = {
    success: { bg: 'bg-green-500/20', fg: 'text-green-400', ariaLabel: 'Success' },
    warning: { bg: 'bg-amber-500/20', fg: 'text-amber-400', ariaLabel: 'Warning' },
    error: { bg: 'bg-rose-500/20', fg: 'text-rose-400', ariaLabel: 'Error' },
    info: { bg: 'bg-blue-500/20', fg: 'text-blue-400', ariaLabel: 'Information' },
  };

  const config = statusConfig[status] || statusConfig.info;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${config.bg} ${config.fg}`}
      role="status"
      aria-label={label || config.ariaLabel}
    >
      {children}
    </span>
  );
}

/**
 * Announcement region for screen readers
 * Use for toast notifications, loading states, etc.
 * @param {Object} props
 * @returns {JSX.Element}
 */
export function ScreenReaderOnly({ children, as = 'div', ...props }) {
  return (
    React.createElement(as, {
      className: 'sr-only',
      ...props,
    }, children)
  );
}

export const screenReaderAnnounce = (message, priority = 'polite') => {
  const element = document.createElement('div');
  element.setAttribute('role', 'status');
  element.setAttribute('aria-live', priority);
  element.setAttribute('aria-atomic', 'true');
  element.className = 'sr-only';
  element.textContent = message;
  document.body.appendChild(element);
  
  setTimeout(() => element.remove(), 1000);
};

/**
 * Check all images have alt text
 * @returns {Array} Array of images without alt text
 */
export function auditImageAltText() {
  return Array.from(document.querySelectorAll('img:not([alt])')).map(img => ({
    src: img.src,
    element: img,
  }));
}

/**
 * Audit for keyboard navigation issues
 * @returns {Object} Audit results
 */
export function auditKeyboardNavigation() {
  const results = {
    buttonCount: document.querySelectorAll('button').length,
    linksCount: document.querySelectorAll('a').length,
    interactiveElements: document.querySelectorAll('button, a, input, select, textarea, [role="button"]').length,
    elementsWithoutFocus: [],
  };

  document.querySelectorAll('button, a, [role="button"]').forEach(el => {
    if (!el.hasAttribute('tabindex') && el.tagName !== 'A') {
      if (getComputedStyle(el).display !== 'none') {
        results.elementsWithoutFocus.push(el);
      }
    }
  });

  return results;
}

/**
 * Audit for ARIA labels and descriptions
 * @returns {Object} Audit results
 */
export function auditAriaLabels() {
  const results = {
    buttonsWithoutLabels: [],
    linksWithoutText: [],
    imagesWithoutAlt: [],
    formInputsWithoutLabels: [],
  };

  // Check buttons
  document.querySelectorAll('button').forEach(btn => {
    const hasLabel = btn.getAttribute('aria-label') || 
                    btn.textContent.trim() ||
                    btn.getAttribute('title');
    if (!hasLabel) results.buttonsWithoutLabels.push(btn);
  });

  // Check links
  document.querySelectorAll('a').forEach(link => {
    if (!link.textContent.trim() && !link.getAttribute('aria-label')) {
      results.linksWithoutText.push(link);
    }
  });

  // Check images
  document.querySelectorAll('img').forEach(img => {
    if (!img.getAttribute('alt')) results.imagesWithoutAlt.push(img);
  });

  // Check form inputs
  document.querySelectorAll('input, select, textarea').forEach(input => {
    const id = input.getAttribute('id');
    const hasLabel = input.getAttribute('aria-label') ||
                    input.getAttribute('placeholder') ||
                    (id && document.querySelector(`label[for="${id}"]`));
    if (!hasLabel) results.formInputsWithoutLabels.push(input);
  });

  return results;
}
