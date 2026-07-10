import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import '../styles/table.css';
import '../styles/badges.css';

const NEXT = { pending:'confirmed', confirmed:'packed', packed:'shipped', shipped:'delivered' };

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([{ product_id:'', quantity:1 }]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Auto-dismiss error & success
  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(''), 4000); return () => clearTimeout(t); }
  }, [error]);
  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(''), 3000); return () => clearTimeout(t); }
  }, [success]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(user.role === 'admin' ? '/orders' : '/orders/my');
      setOrders(res.data.orders || []);
    } catch (err) {
      setError(err.friendlyMessage || err.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [user.role]);

  useEffect(() => {
    fetchOrders();
    api.get('/products?limit=100').then(r => setProducts(r.data.products || [])).catch(() => {});
  }, [fetchOrders]);

  const handlePlace = async (e) => {
    e.preventDefault();
    const validItems = items.filter(i => i.product_id && i.quantity > 0);
    if (validItems.length === 0) { setError('Please select at least one product.'); return; }
    try {
      await api.post('/orders', { items: validItems });
      setShowForm(false);
      setItems([{ product_id:'', quantity:1 }]);
      setSuccess('✅ Order placed successfully!');
      fetchOrders();
    } catch (err) {
      setError(err.friendlyMessage || err.response?.data?.message || 'Failed to place order');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/orders/${id}/status`, { status });
      setSuccess(`✅ Order #${id} moved to "${status}".`);
      fetchOrders();
    } catch (err) {
      setError(err.friendlyMessage || err.response?.data?.message || 'Failed to update status');
    }
  };

  return (
    <div>
      <nav className="navbar">
        <span>📦 Inventory Manager</span>
        <div>
          <Link to="/">Dashboard</Link>
          <Link to="/products">Products</Link>
          <Link to="/categories">Categories</Link>
          <Link to="/orders" className="active-link">Orders</Link>
        </div>
      </nav>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <div>
            <h2 style={{ marginBottom: '2px' }}>Orders</h2>
            <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>
              {loading ? 'Loading...' : `${orders.length} order${orders.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button className="btn" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Cancel' : '+ Place Order'}
          </button>
        </div>

        {error && <p className="error" style={{ marginTop: '10px' }}>{error}</p>}
        {success && <p className="success-toast">{success}</p>}

        {showForm && (
          <form onSubmit={handlePlace} className="form-box" style={{ marginTop: '14px' }}>
            <h4>New Order</h4>
            {items.map((item, i) => (
              <div key={i} className="row">
                <select className="input" value={item.product_id} style={{ flex: 3, marginBottom: 0 }}
                  onChange={e => { const n=[...items]; n[i].product_id=e.target.value; setItems(n); }}>
                  <option value="">Select product</option>
                  {products.filter(p => p.stock_quantity > 0).map(p =>
                    <option key={p.id} value={p.id}>{p.name} — stock: {p.stock_quantity}</option>
                  )}
                </select>
                <input className="input" type="number" min="1" value={item.quantity}
                  onChange={e => { const n=[...items]; n[i].quantity=Number(e.target.value); setItems(n); }}
                  style={{ width:'80px', flex: 1, marginBottom: 0 }} />
                {items.length > 1 && (
                  <button type="button" className="btn-sm btn-danger"
                    onClick={() => setItems(items.filter((_,j) => j!==i))}>✕</button>
                )}
              </div>
            ))}
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button type="button" className="btn-outline"
                onClick={() => setItems([...items,{product_id:'',quantity:1}])}>+ Add Item</button>
              <button className="btn" type="submit">Place Order</button>
              <button className="btn-outline" type="button" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>⏳</div>
            <p>Loading orders...</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                {user.role==='admin' && <th>Customer</th>}
                <th>Status</th>
                <th>Total</th>
                <th>Date</th>
                {user.role==='admin' && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr><td colSpan={user.role==='admin' ? 6 : 4} className="empty-row">No orders yet.</td></tr>
              )}
              {orders.map(o => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 600 }}>#{o.id}</td>
                  {user.role==='admin' && <td>{o.customer_name || <em style={{ color: '#999' }}>—</em>}</td>}
                  <td><span className={`badge badge-${o.status}`}>{o.status}</span></td>
                  <td style={{ fontWeight: 500 }}>₹{Number(o.total_amount).toFixed(2)}</td>
                  <td style={{ color: 'var(--text-light)' }}>{new Date(o.created_at).toLocaleDateString()}</td>
                  {user.role==='admin' && (
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {NEXT[o.status] && (
                        <button className="btn-sm" onClick={() => updateStatus(o.id, NEXT[o.status])}>
                          → {NEXT[o.status]}
                        </button>
                      )}
                      {['pending','confirmed'].includes(o.status) && (
                        <button className="btn-sm btn-danger" onClick={() => updateStatus(o.id,'cancelled')}>
                          Cancel
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
