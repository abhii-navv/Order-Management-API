import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import '../styles/table.css';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [form, setForm] = useState({ name:'', sku:'', price:'', stock_quantity:'', low_stock_threshold:10, category_id:'' });
  const [showForm, setShowForm] = useState(false);
  const [restockId, setRestockId] = useState(null);
  const [restockQty, setRestockQty] = useState('');
  const [error, setError] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchProducts = async () => {
    const res = await api.get(`/products?search=${search}&category_id=${selectedCategory}&limit=50`);
    setProducts(res.data.products || []);
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data.categories || []);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, selectedCategory]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try { 
      const payload = { ...form, category_id: form.category_id || null };
      await api.post('/products', payload); 
      setShowForm(false); 
      setForm({ name:'', sku:'', price:'', stock_quantity:'', low_stock_threshold:10, category_id:'' });
      fetchProducts(); 
    }
    catch (err) { setError(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.delete(`/products/${id}`); 
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleRestock = async (e) => {
    e.preventDefault();
    try { 
      await api.patch(`/products/${restockId}/restock`, { quantity: Number(restockQty) }); 
      setRestockId(null); 
      setRestockQty('');
      fetchProducts(); 
    }
    catch (err) { setError(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div>
      <nav className="navbar">
        <span>📦 Inventory Manager</span>
        <div>
          <Link to="/">Dashboard</Link> 
          <Link to="/products" className="active-link">Products</Link> 
          <Link to="/orders">Orders</Link>
        </div>
      </nav>
      <div className="container">
        <h2>Products</h2>
        {error && <p className="error">{error}</p>}
        <div className="row" style={{ gap: '10px' }}>
          <input className="input" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 2 }} />
          <select className="input" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} style={{ flex: 1 }}>
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {user.role === 'admin' && <button className="btn" onClick={() => setShowForm(!showForm)}>+ Add Product</button>}
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="form-box">
            <h4>Add New Product</h4>
            <input className="input" placeholder="Product Name *" value={form.name} onChange={e => setForm({...form,name:e.target.value})} required />
            <select className="input" value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})}>
              <option value="">Select Category (Optional)</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input className="input" placeholder="SKU *" value={form.sku} onChange={e => setForm({...form,sku:e.target.value})} required />
            <input className="input" type="number" step="0.01" placeholder="Price (₹) *" value={form.price} onChange={e => setForm({...form,price:e.target.value})} required />
            <input className="input" type="number" placeholder="Initial Stock Quantity" value={form.stock_quantity} onChange={e => setForm({...form,stock_quantity:e.target.value})} />
            <input className="input" type="number" placeholder="Low Stock Threshold" value={form.low_stock_threshold} onChange={e => setForm({...form,low_stock_threshold:e.target.value})} />
            <button className="btn" type="submit">Create Product</button>
            <button className="btn-outline" type="button" onClick={() => setShowForm(false)}>Cancel</button>
          </form>
        )}

        {restockId && (
          <form onSubmit={handleRestock} className="form-box">
            <h4>Restock Product</h4>
            <input className="input" type="number" min="1" placeholder="Quantity to add" value={restockQty} onChange={e => setRestockQty(e.target.value)} required />
            <button className="btn" type="submit">Restock</button>
            <button className="btn-outline" type="button" onClick={() => setRestockId(null)}>Cancel</button>
          </form>
        )}

        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>SKU</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Threshold</th>
              {user.role === 'admin' && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr><td colSpan={user.role === 'admin' ? 7 : 6} className="empty-row">No products found.</td></tr>
            )}
            {products.map(p => (
              <tr key={p.id}>
                <td><strong>{p.name}</strong></td>
                <td>{p.category_name || <em style={{ color: '#999' }}>None</em>}</td>
                <td><code>{p.sku}</code></td>
                <td>₹{Number(p.price).toFixed(2)}</td>
                <td>
                  <span className={p.stock_quantity <= p.low_stock_threshold ? 'stock-low' : 'stock-ok'}>
                    {p.stock_quantity}
                  </span>
                </td>
                <td>{p.low_stock_threshold}</td>
                {user.role === 'admin' && (
                  <td>
                    <button className="btn-sm" onClick={() => setRestockId(p.id)} style={{ marginRight: '5px' }}>Restock</button>
                    <button className="btn-sm btn-danger" onClick={() => handleDelete(p.id)}>Delete</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
