import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import '../styles/table.css';

export default function Dashboard() {
  const [lowStock, setLowStock]       = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [kpis, setKpis]               = useState(null);
  const user     = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();

  useEffect(() => {
    if (user.role === 'admin') {
      api.get('/reports/low-stock').then(r => setLowStock(r.data.products || []));
      api.get('/reports/dashboard-kpis').then(r => setKpis(r.data)).catch(() => {});
    }
    const ordersEndpoint = user.role === 'admin' ? '/orders' : '/orders/my';
    api.get(ordersEndpoint).then(r => setRecentOrders((r.data.orders || []).slice(0, 5)));
  }, []);

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
          <span> | {user.name} ({user.role}) </span>
          <button onClick={logout}>Logout</button>
        </div>
      </nav>
      <div className="container">
        <h2>Dashboard</h2>

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
              }}>
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
        </div>

        {user.role === 'admin' && lowStock.length > 0 && (
          <div>
            <h3>⚠️ Low Stock ({lowStock.length})</h3>
            <table className="table">
              <thead><tr><th>Product</th><th>SKU</th><th>Stock</th><th>Threshold</th></tr></thead>
              <tbody>
                {lowStock.map(p => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.sku}</td>
                    <td style={{color:'#ef4444'}}>{p.stock_quantity}</td>
                    <td>{p.low_stock_threshold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {recentOrders.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h3>🕑 Recent Orders</h3>
            <table className="table">
              <thead><tr><th>#</th><th>Status</th><th>Total</th><th>Date</th></tr></thead>
              <tbody>
                {recentOrders.map(o => (
                  <tr key={o.id}>
                    <td>{o.id}</td>
                    <td>{o.status}</td>
                    <td>₹{Number(o.total_amount).toFixed(2)}</td>
                    <td>{new Date(o.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
