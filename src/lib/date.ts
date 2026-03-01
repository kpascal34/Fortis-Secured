export function toISO(date: Date | string | number): string {
  const parsed = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid date provided to toISO');
  }

  return parsed.toISOString();
}

export function fromISO(iso: string): Date {
  if (!iso || typeof iso !== 'string') {
    throw new Error('Invalid ISO string provided to fromISO');
  }

  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid ISO string provided to fromISO');
  }

  return parsed;
}

export function formatForDisplay(iso: string): string {
  const date = fromISO(iso);

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
