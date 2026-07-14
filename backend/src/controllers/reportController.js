import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import '../styles/table.css';

export default function Reports() {
  const [salesSummary, setSalesSummary] = useState(null);
  const [topProducts, setTopProducts] = useState(null);
  const [customerAnalytics, setCustomerAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchReports = async () => {
    if (user.role !== 'admin') return;
    setLoading(true);
    try {
      const [salesRes, topRes, custRes] = await Promise.all([
        api.get('/reports/sales-summary'),
        api.get('/reports/top-products'),
        api.get('/reports/customer-analytics')
      ]);
      setSalesSummary(salesRes.data);
      setTopProducts(topRes.data);
      setCustomerAnalytics(custRes.data);
      setError('');
    } catch (err) {
      setError(err.friendlyMessage || err.response?.data?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [user.role]);

  if (user.role !== 'admin') {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#f87171' }}>Access denied. Admins only.</div>;
  }

  return (
    <div>
      <nav className="navbar">
        <span>📦 Inventory Manager</span>
        <div>
          <Link to="/">Dashboard</Link>
          <Link to="/products">Products</Link>
          <Link to="/categories">Categories</Link>
          <Link to="/orders">Orders</Link>
          <Link to="/reports" className="active-link">Reports</Link>
          <Link to="/audit-logs">Audit Logs</Link>
        </div>
      </nav>

      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>📊 Analytics & Reports</h2>
          <button className="btn btn-outline" onClick={fetchReports} disabled={loading}>
            {loading ? 'Refreshing...' : '🔄 Refresh Data'}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>⏳</div>
            <p>Loading reports...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Sales Summary */}
            {salesSummary && (
              <div>
                <h3>📈 Sales Summary (Last 12 {salesSummary.period}s)</h3>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Total Orders</th>
                      <th>Total Revenue</th>
                      <th>Avg Order Value</th>
                      <th>Delivered</th>
                      <th>Cancelled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesSummary.summary.map(s => (
                      <tr key={s.period}>
                        <td>{new Date(s.period).toLocaleDateString()}</td>
                        <td>{s.total_orders}</td>
                        <td style={{ fontWeight: 500 }}>₹{s.total_revenue}</td>
                        <td style={{ color: 'var(--text-light)' }}>₹{s.avg_order_value}</td>
                        <td style={{ color: '#34d399' }}>{s.delivered_orders}</td>
                        <td style={{ color: '#f87171' }}>{s.cancelled_orders}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Top Products */}
            {topProducts && (
              <div>
                <h3>🔥 Top Products by Units Sold</h3>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Total Sold</th>
                      <th>Total Revenue</th>
                      <th>Revenue Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.products.map(p => (
                      <tr key={p.id}>
                        <td><span style={{ fontWeight: 800, color: 'var(--primary-light)' }}>#{p.rank}</span></td>
                        <td><strong>{p.name}</strong> <code style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>{p.sku}</code></td>
                        <td>{p.category_name || '—'}</td>
                        <td style={{ fontWeight: 700 }}>{p.total_sold} units</td>
                        <td style={{ fontWeight: 500 }}>₹{p.total_revenue}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '12px' }}>{p.revenue_share_pct}%</span>
                            <div style={{ width: '60px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${p.revenue_share_pct}%`, height: '100%', background: 'var(--primary)' }}></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Customer Analytics */}
            {customerAnalytics && (
              <div>
                <h3>👥 Top Customers by Lifetime Value</h3>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Customer Name</th>
                      <th>Email</th>
                      <th>Total Orders</th>
                      <th>Completed</th>
                      <th>Lifetime Value</th>
                      <th>Avg Order Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerAnalytics.customers.map(c => (
                      <tr key={c.user_id}>
                        <td><strong>{c.customer_name}</strong></td>
                        <td style={{ color: 'var(--text-light)' }}>{c.email}</td>
                        <td>{c.total_orders}</td>
                        <td style={{ color: '#34d399' }}>{c.completed_orders}</td>
                        <td style={{ fontWeight: 700, color: 'var(--primary-light)' }}>₹{c.lifetime_value}</td>
                        <td style={{ color: 'var(--text-light)' }}>₹{c.avg_order_value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
