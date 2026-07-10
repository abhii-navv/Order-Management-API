import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import '../styles/table.css';

export default function Dashboard() {
  const [lowStock, setLowStock]         = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [kpis, setKpis]                 = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const user     = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();

  // Auto-dismiss error after 5s
  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(''), 5000); return () => clearTimeout(t); }
  }, [error]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const ordersEndpoint = user.role === 'admin' ? '/orders' : '/orders/my';
      const [ordersRes] = await Promise.all([
        api.get(ordersEndpoint),
        user.role === 'admin'
          ? api.get('/reports/low-stock').then(r => setLowStock(r.data.products || [])).catch(() => {})
          : Promise.resolve(),
        user.role === 'admin'
          ? api.get('/reports/dashboard-kpis').then(r => setKpis(r.data)).catch(() => {})
          : Promise.resolve(),
      ]);
      setRecentOrders((ordersRes.data.orders || []).slice(0, 5));
    } catch (err) {
      setError(err.friendlyMessage || err.response?.data?.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [user.role]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const logout = () => { localStorage.clear(); navigate('/login'); };

  const kpiCards = kpis ? [
    { label: 'Orders Today',        value: kpis.ordersToday,           icon: '📦', color: '#8b5cf6' },
    { label: 'Revenue This Month',  value: `₹${Number(kpis.revenueThisMonth).toLocaleString()}`, icon: '💰', color: '#10b981' },
    { label: 'Pending Orders',      value: kpis.pendingOrders,         icon: '⏳', color: '#f59e0b' },
    { label: 'Low Stock Products',  value: kpis.lowStockProducts,      icon: '⚠️', color: '#ef4444' },
    { label: 'New Customers',       value: kpis.newCustomersThisMonth, icon: '👤', color: '#3b82f6' },
  ] : [];

  return (
    <div>
      <nav className="navbar">
        <span>📦 Inventory Manager</span>
        <div>
          <Link to="/products">Products</Link>
          <Link to="/categories">Categories</Link>
          <Link to="/orders">Orders</Link>
          {user.role === 'admin' && <Link to="/audit-logs">Audit Logs</Link>}
          <span style={{ color: 'var(--text-light)', fontSize: '13px' }}>| {user.name} ({user.role})</span>
          <button onClick={logout}>Logout</button>
        </div>
      </nav>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ marginBottom: '4px' }}>
              👋 Welcome back{user.name ? `, ${user.name}` : ''}!
            </h2>
            <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>
              Here's what's happening with your inventory today.
            </p>
          </div>
          {loading && (
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>⏳ Loading…</span>
          )}
        </div>

        {error && <p className="error">{error}</p>}

        {/* ── KPI Cards (admin only) ── */}
        {user.role === 'admin' && kpis && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
            marginBottom: '32px',
          }}>
            {kpiCards.map(card => (
              <div key={card.label} style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxShadow: 'var(--shadow)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow)'; }}
              >
                <span style={{ fontSize: '24px' }}>{card.icon}</span>
                <span style={{ fontSize: '28px', fontWeight: 800, color: card.color, lineHeight: 1 }}>
                  {card.value}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {card.label}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="link-row" style={{ display: 'flex', gap: '10px' }}>
          <Link to="/products" className="btn">🏷️ Products</Link>
          <Link to="/categories" className="btn">📁 Categories</Link>
          <Link to="/orders" className="btn">📋 Orders</Link>
          {user.role === 'admin' && <Link to="/audit-logs" className="btn">🔍 Audit Logs</Link>}
        </div>

        {user.role === 'admin' && lowStock.length > 0 && (
          <div>
            <h3>⚠️ Low Stock ({lowStock.length})</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Stock</th>
                  <th>Threshold</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map(p => (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong></td>
                    <td><code style={{ background: 'rgba(243,244,246,0.08)', padding: '2px 6px', borderRadius: '4px' }}>{p.sku}</code></td>
                    <td style={{ color: '#ef4444', fontWeight: 700 }}>{p.stock_quantity}</td>
                    <td style={{ color: 'var(--text-light)' }}>{p.low_stock_threshold}</td>
                    <td>
                      <Link to="/products" className="btn-sm">Restock →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {recentOrders.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <h3>🕑 Recent Orders</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(o => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 600 }}>#{o.id}</td>
                    <td>
                      <span style={{
                        padding: '2px 10px',
                        borderRadius: '99px',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: o.status === 'delivered' ? 'rgba(16,185,129,0.15)' :
                                    o.status === 'cancelled' ? 'rgba(239,68,68,0.15)' :
                                    o.status === 'pending'   ? 'rgba(245,158,11,0.15)' :
                                    'rgba(99,102,241,0.15)',
                        color: o.status === 'delivered' ? '#34d399' :
                               o.status === 'cancelled' ? '#f87171' :
                               o.status === 'pending'   ? '#fbbf24' :
                               '#a78bfa',
                      }}>
                        {o.status}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>₹{Number(o.total_amount).toFixed(2)}</td>
                    <td style={{ color: 'var(--text-light)' }}>{new Date(o.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && recentOrders.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-light)', marginTop: '24px' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>📋</div>
            <p>No orders yet. <Link to="/orders" style={{ color: 'var(--primary-light)' }}>Place your first order →</Link></p>
          </div>
        )}
      </div>
    </div>
  );
}
