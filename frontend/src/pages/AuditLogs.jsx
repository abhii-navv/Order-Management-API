import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import '../styles/table.css';


const PAGE_SIZE = 20;

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Auto-dismiss error after 4s
  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(''), 4000); return () => clearTimeout(t); }
  }, [error]);


  const fetchLogs = async (currentPage = 1) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/reports/audit-log', {
        params: { page: currentPage, limit: PAGE_SIZE },
      });
      setLogs(res.data.logs || []);
      setTotal(res.data.total ?? 0);
      setTotalPages(res.data.totalPages ?? 1);
    } catch (err) {
      setError(err.friendlyMessage || err.response?.data?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(page);
  }, [page]);

  const goTo = (p) => setPage(Math.max(1, Math.min(p, totalPages)));

  return (
    <div>
      <nav className="navbar">
        <span>📦 Inventory Manager</span>
        <div>
          <Link to="/">Dashboard</Link>
          <Link to="/products">Products</Link>
          <Link to="/categories">Categories</Link>
          <Link to="/orders">Orders</Link>
          <Link to="/audit-logs" className="active-link">Audit Logs</Link>
        </div>
      </nav>
      <div className="container">
        <h2>Stock Audit Logs</h2>
        {error && <p className="error">{error}</p>}
        <p style={{ color: 'var(--text-light)', marginBottom: '20px' }}>
          A history of all stock additions, adjustments, and order reductions.
        </p>

        <table className="table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Product</th>
              <th>Changed By</th>
              <th>Before</th>
              <th>After</th>
              <th>Change</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan="7" className="empty-row">Loading…</td></tr>
            )}
            {!loading && logs.length === 0 && (
              <tr><td colSpan="7" className="empty-row">No audit logs found.</td></tr>
            )}
            {!loading && logs.map(log => {
              const diff = log.quantity_after - log.quantity_before;
              const isPositive = diff > 0;
              return (
                <tr key={log.id}>
                  <td>{new Date(log.changed_at).toLocaleString()}</td>
                  <td><strong>{log.product_name || `Product #${log.product_id}`}</strong></td>
                  <td>{log.changed_by_name || 'System'}</td>
                  <td>{log.quantity_before}</td>
                  <td>{log.quantity_after}</td>
                  <td style={{ color: isPositive ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                    {isPositive ? `+${diff}` : diff}
                  </td>
                  <td>
                    <span style={{
                      textTransform: 'capitalize',
                      fontSize: '0.82em',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background: 'rgba(139,92,246,0.12)',
                      color: '#a78bfa',
                      fontWeight: 600,
                    }}>
                      {(log.reason || 'unknown').replaceAll('_', ' ')}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ── Pagination controls ── */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '20px',
          color: 'var(--text-light)',
          fontSize: '13px',
        }}>
          <span>
            Showing {logs.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{(page - 1) * PAGE_SIZE + logs.length} of {total} entries
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn"
              onClick={() => goTo(page - 1)}
              disabled={page <= 1 || loading}
              style={{ opacity: page <= 1 ? 0.4 : 1 }}
            >
              ← Prev
            </button>
            <span style={{ padding: '8px 12px', fontWeight: 600 }}>
              Page {page} / {totalPages}
            </span>
            <button
              className="btn"
              onClick={() => goTo(page + 1)}
              disabled={page >= totalPages || loading}
              style={{ opacity: page >= totalPages ? 0.4 : 1 }}
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
