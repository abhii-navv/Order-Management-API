/**
 * statusBadge.js
 * Shared utility for rendering consistent status badge styles across
 * the Orders and Dashboard pages. Centralises the colour logic so
 * future status values only need to be updated in one place.
 */

/** Map of order status → { background, color } */
const STATUS_STYLES = {
  delivered: { background: 'rgba(16,185,129,0.15)', color: '#34d399' },
  cancelled:  { background: 'rgba(239,68,68,0.15)',  color: '#f87171' },
  pending:    { background: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
  processing: { background: 'rgba(99,102,241,0.15)', color: '#a78bfa' },
  shipped:    { background: 'rgba(59,130,246,0.15)', color: '#60a5fa' },
};

const DEFAULT_STYLE = { background: 'rgba(99,102,241,0.15)', color: '#a78bfa' };

/**
 * Returns an inline-style object for a given order status.
 * @param {string} status - The order status string (e.g. 'pending', 'delivered').
 * @returns {{ background: string, color: string, padding: string, borderRadius: string, fontSize: string, fontWeight: number, textTransform: string }}
 */
export function getStatusStyle(status = '') {
  const key = status.toLowerCase();
  const { background, color } = STATUS_STYLES[key] ?? DEFAULT_STYLE;
  return {
    padding: '2px 10px',
    borderRadius: '99px',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    background,
    color,
  };
}
