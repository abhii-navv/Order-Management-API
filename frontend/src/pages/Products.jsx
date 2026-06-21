import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import '../styles/table.css';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name:'', sku:'', price:'', stock_quantity:'', low_stock_threshold:10 });
  const [showForm, setShowForm] = useState(false);
  const [restockId, setRestockId] = useState(null);
  const [restockQty, setRestockQty] = useState('');
  const [error, setError] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetch = async () => {
    const res = await api.get(`/products?search=${search}&limit=50`);
    setProducts(res.data.products || []);
  };

  useEffect(() => { fetch(); }, [search]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try { await api.post('/products', form); setShowForm(false); fetch(); }
    catch (err) { setError(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete?')) return;
    await api.delete(`/products/${id}`); fetch();
  };

  const handleRestock = async (e) => {
    e.preventDefault();
    try { await api.patch(`/products/${restockId}/restock`, { quantity: Number(restockQty) }); setRestockId(null); fetch(); }
    catch (err) { setError(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div>
      <nav className="navbar">
        <span>📦 Inventory Manager</span>
        <div><Link to="/">Dashboard</Link> <Link to="/orders">Orders</Link></div>
      </nav>
      <div className="container">
        <h2>Products</h2>
        {error && <p className="error">{error}</p>}
        <div className="row">
          <input className="input" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          {user.role === 'admin' && <button className="btn" onClick={() => setShowForm(!showForm)}>+ Add Product</button>}
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="form-box">
            <input className="input" placeholder="Name *" value={form.name} onChange={e => setForm({...form,name:e.target.value})} required />
            <input className="input" placeholder="SKU *" value={form.sku} onChange={e => setForm({...form,sku:e.target.value})} required />
            <input className="input" type="number" placeholder="Price *" value={form.price} onChange={e => setForm({...form,price:e.target.value})} required />
            <input className="input" type="number" placeholder="Stock" value={form.stock_quantity} onChange={e => setForm({...form,stock_quantity:e.target.value})} />
            <input className="input" type="number" placeholder="Low stock threshold" value={form.low_stock_threshold} onChange={e => setForm({...form,low_stock_threshold:e.target.value})} />
            <button className="btn" type="submit">Create</button>
            <button className="btn-outline" type="button" onClick={() => setShowForm(false)}>Cancel</button>
          </form>
        )}

        {restockId && (
          <form onSubmit={handleRestock} className="form-box">
            <input className="input" type="number" min="1" placeholder="Quantity" value={restockQty} onChange={e => setRestockQty(e.target.value)} required />
            <button className="btn" type="submit">Restock</button>
            <button className="btn-outline" type="button" onClick={() => setRestockId(null)}>Cancel</button>
          </form>
        )}

<table className="table">
          <thead><tr><th>Name</th><th>SKU</th><th>Price</th><th>Stock</th><th>Threshold</th>{user.role==='admin'&&<th>Actions</th>}</tr></thead>
          <tbody>
            {products.length === 0 && (
              <tr><td colSpan={user.role==='admin' ? 6 : 5} className="empty-row">No products found.</td></tr>
            )}
            {products.map(p => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.sku}</td>
                <td>₹{Number(p.price).toFixed(2)}</td>
                <td><span className={p.stock_quantity <= p.low_stock_threshold ? 'stock-low' : 'stock-ok'}>{p.stock_quantity}</span></td>
                <td>{p.low_stock_threshold}</td>
                {user.role==='admin' && <td>
                  <button className="btn-sm" onClick={() => setRestockId(p.id)}>Restock</button>
                  <button className="btn-sm btn-danger" onClick={() => handleDelete(p.id)}>Delete</button>
                </td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
