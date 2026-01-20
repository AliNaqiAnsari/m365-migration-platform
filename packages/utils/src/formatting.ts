// ============================================================================
// Formatting Utilities
// ============================================================================

import { format, formatDistanceToNow, formatDuration, intervalToDuration } from 'date-fns';

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  if (bytes < 0) return 'Invalid size';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = sizes[Math.min(i, sizes.length - 1)];

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${size}`;
}

/**
 * Parse bytes from human readable string
 */
export function parseBytes(str: string): number {
  const units: Record<string, number> = {
    b: 1,
    bytes: 1,
    kb: 1024,
    mb: 1024 ** 2,
    gb: 1024 ** 3,
    tb: 1024 ** 4,
    pb: 1024 ** 5,
  };

  const match = str.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(bytes?|[kmgtp]b?)$/i);
  if (!match) return 0;

  const [, value, unit] = match;
  return parseFloat(value!) * (units[unit!.toLowerCase()] || 1);
}

/**
 * Format number with commas
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format date to readable string
 */
export function formatDate(date: Date | string, formatStr = 'PPP'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, formatStr);
}

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Format duration in seconds to human readable
 */
export function formatDurationSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;

  const duration = intervalToDuration({ start: 0, end: seconds * 1000 });
  return formatDuration(duration, {
    format: ['days', 'hours', 'minutes', 'seconds'],
    zero: false,
  });
}

/**
 * Format speed (bytes per second)
 */
export function formatSpeed(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`;
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return `${str.slice(0, length - 3)}...`;
}

/**
 * Slugify string
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate random string
 */
export function generateId(length = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
