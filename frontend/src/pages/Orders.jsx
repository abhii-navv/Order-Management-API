import { useEffect, useState } from 'react';
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
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchOrders = async () => {
    const res = await api.get(user.role === 'admin' ? '/orders' : '/orders/my');
    setOrders(res.data.orders || []);
  };

  useEffect(() => {
    fetchOrders();
    api.get('/products?limit=100').then(r => setProducts(r.data.products || []));
  }, []);

  const handlePlace = async (e) => {
    e.preventDefault();
    try {
      await api.post('/orders', { items: items.filter(i => i.product_id) });
      setShowForm(false); setItems([{ product_id:'', quantity:1 }]); fetchOrders();
    } catch (err) { setError(err.response?.data?.message || 'Failed'); }
  };

  const updateStatus = async (id, status) => {
    try { await api.patch(`/orders/${id}/status`, { status }); fetchOrders(); }
    catch (err) { setError(err.response?.data?.message || 'Failed'); }
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
        <h2>Orders</h2>
        {error && <p className="error">{error}</p>}
        <button className="btn" onClick={() => setShowForm(!showForm)}>+ Place Order</button>

        {showForm && (
          <form onSubmit={handlePlace} className="form-box">
            <h4>New Order</h4>
            {items.map((item, i) => (
              <div key={i} className="row">
                <select className="input" value={item.product_id} onChange={e => { const n=[...items]; n[i].product_id=e.target.value; setItems(n); }}>
                  <option value="">Select product</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (stock: {p.stock_quantity})</option>)}
                </select>
                <input className="input" type="number" min="1" value={item.quantity} onChange={e => { const n=[...items]; n[i].quantity=Number(e.target.value); setItems(n); }} style={{width:'80px'}} />
                {items.length > 1 && <button type="button" onClick={() => setItems(items.filter((_,j)=>j!==i))}>✕</button>}
              </div>
            ))}
            <button type="button" className="btn-outline" onClick={() => setItems([...items,{product_id:'',quantity:1}])}>+ Item</button>
            <button className="btn" type="submit">Place Order</button>
            <button className="btn-outline" type="button" onClick={() => setShowForm(false)}>Cancel</button>
          </form>
        )}

        <table className="table">
          <thead><tr><th>#</th>{user.role==='admin'&&<th>Customer</th>}<th>Status</th><th>Total</th><th>Date</th>{user.role==='admin'&&<th>Actions</th>}</tr></thead>
          <tbody>
            {orders.length === 0 && (
              <tr><td colSpan={user.role==='admin' ? 6 : 4} className="empty-row">No orders yet.</td></tr>
            )}
            {orders.map(o => (
              <tr key={o.id}>
                <td>{o.id}</td>
                {user.role==='admin'&&<td>{o.customer_name}</td>}
                <td><span className={`badge badge-${o.status}`}>{o.status}</span></td>
                <td>₹{Number(o.total_amount).toFixed(2)}</td>
                <td>{new Date(o.created_at).toLocaleDateString()}</td>
                {user.role==='admin'&&<td>
                  {NEXT[o.status] && <button className="btn-sm" onClick={() => updateStatus(o.id, NEXT[o.status])}>→ {NEXT[o.status]}</button>}
                  {['pending','confirmed'].includes(o.status) && <button className="btn-sm btn-danger" onClick={() => updateStatus(o.id,'cancelled')}>Cancel</button>}
                </td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
