import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import '../styles/table.css';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchLogs = async () => {
    try {
      const res = await api.get('/reports/audit-log');
      setLogs(res.data.logs || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load audit logs');
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

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
        <p>A history of all stock additions, adjustments, and order reductions.</p>

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
            {logs.length === 0 && (
              <tr><td colSpan="7" className="empty-row">No audit logs found.</td></tr>
            )}
            {logs.map(log => {
              const diff = log.quantity_after - log.quantity_before;
              const isPositive = diff > 0;
              return (
                <tr key={log.id}>
                  <td>{new Date(log.changed_at).toLocaleString()}</td>
                  <td><strong>{log.product_name || `Product #${log.product_id}`}</strong></td>
                  <td>{log.user_name || 'System'}</td>
                  <td>{log.quantity_before}</td>
                  <td>{log.quantity_after}</td>
                  <td style={{ color: isPositive ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                    {isPositive ? `+${diff}` : diff}
                  </td>
                  <td>
                    <span className="reason-label" style={{
                      textTransform: 'capitalize',
                      fontSize: '0.85em',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: '#f3f4f6',
                      color: '#374151'
                    }}>
                      {log.reason.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
