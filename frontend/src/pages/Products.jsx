import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import '../styles/table.css';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [form, setForm] = useState({ name: '', sku: '', price: '', stock_quantity: '', low_stock_threshold: 10, category_id: '', description: '' });
  const [showForm, setShowForm] = useState(false);
  const [restockId, setRestockId] = useState(null);
  const [restockQty, setRestockQty] = useState('');
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [orderQty, setOrderQty] = useState({});   // { [productId]: quantity }
  const [orderingId, setOrderingId] = useState(null); // product id currently being ordered
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Auto-dismiss error & success after 4s / 3s
  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(''), 4000); return () => clearTimeout(t); }
  }, [error]);
  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(''), 3000); return () => clearTimeout(t); }
  }, [success]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/products', {
        params: { search, category_id: selectedCategory, sort_by: sortBy, sort_order: sortOrder, limit: 50 },
      });
      setProducts(res.data.products || []);
    } catch (err) {
      setError(err.friendlyMessage || err.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, sortBy, sortOrder]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data.categories || []);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // Toggle sort column; if same column, flip direction
  const handleSort = (col) => {
    if (sortBy === col) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <span style={{ opacity: 0.3, marginLeft: '4px' }}>↕</span>;
    return <span style={{ marginLeft: '4px', color: 'var(--primary-light)' }}>{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  // ── Create ────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, category_id: form.category_id || null };
      await api.post('/products', payload);
      setShowForm(false);
      setForm({ name: '', sku: '', price: '', stock_quantity: '', low_stock_threshold: 10, category_id: '', description: '' });
      setSuccess('✅ Product created successfully!');
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Failed to create product');
    }
  };

  // ── Delete ────────────────────────────────────────────
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This action cannot be undone.`)) return;
    try {
      await api.delete(`/products/${id}`);
      setSuccess(`🗑️ "${name}" deleted.`);
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  // ── Restock ───────────────────────────────────────────
  const handleRestock = async (e) => {
    e.preventDefault();
    const qty = Number(restockQty);
    if (!qty || qty < 1) { setError('Quantity must be at least 1.'); return; }
    try {
      await api.patch(`/products/${restockId}/restock`, { quantity: qty });
      setRestockId(null);
      setRestockQty('');
      setSuccess(`📦 Stock updated by +${qty} units.`);
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to restock');
    }
  };

  // ── Inline Edit ───────────────────────────────────────
  const startEdit = (p) => {
    setEditId(p.id);
    setEditData({
      name: p.name,
      price: p.price,
      low_stock_threshold: p.low_stock_threshold,
      category_id: p.category_id || '',
    });
  };

  const handleEdit = async (id) => {
    try {
      const payload = { ...editData, category_id: editData.category_id || null };
      await api.put(`/products/${id}`, payload);
      setEditId(null);
      setSuccess('✏️ Product updated successfully!');
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update');
    }
  };

  // ── Place Order (non-admin, direct from product row) ───
  const handlePlaceOrder = async (product) => {
    const quantity = Number(orderQty[product.id]) || 1;
    if (quantity < 1) return;
    if (quantity > product.stock_quantity) {
      setError(`Only ${product.stock_quantity} unit(s) available for "${product.name}".`);
      return;
    }
    setOrderingId(product.id);
    try {
      await api.post('/orders', { items: [{ product_id: product.id, quantity }] });
      setSuccess(`✅ Order placed for ${quantity} × "${product.name}".`);
      setOrderQty({ ...orderQty, [product.id]: '' });
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to place order');
    } finally {
      setOrderingId(null);
    }
  };

  const restockingProduct = products.find(p => p.id === restockId);
  const lowStockCount = products.filter(p => p.stock_quantity <= p.low_stock_threshold).length;

  return (
    <div>
      {/* ── Navbar ── */}
      <nav className="navbar">
        <span>📦 Inventory Manager</span>
        <div>
          <Link to="/">Dashboard</Link>
          <Link to="/products" className="active-link">Products</Link>
          <Link to="/categories">Categories</Link>
          <Link to="/orders">Orders</Link>
        </div>
      </nav>

      <div className="container">
        {/* ── Page Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <div>
            <h2 style={{ marginBottom: '2px' }}>Products</h2>
            <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>
              {loading ? 'Loading...' : `${products.length} product${products.length !== 1 ? 's' : ''} found`}
              {lowStockCount > 0 && (
                <span style={{ marginLeft: '10px', color: '#dc2626', fontWeight: 600 }}>
                  ⚠️ {lowStockCount} low stock
                </span>
              )}
            </p>
          </div>
          {user.role === 'admin' && (
            <button className="btn" onClick={() => { setShowForm(!showForm); setEditId(null); setRestockId(null); }}>
              {showForm ? '✕ Cancel' : '+ Add Product'}
            </button>
          )}
        </div>

        {/* ── Toast Messages ── */}
        {error && <p className="error" style={{ marginTop: '10px' }}>{error}</p>}
        {success && <p className="success-toast">{success}</p>}

        {/* ── Search & Filter Row ── */}
        <div className="row" style={{ gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
          <input
            className="input"
            placeholder="🔍  Search by name or SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 2, marginBottom: 0, minWidth: '180px' }}
          />
          <select
            className="input"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            style={{ flex: 1, marginBottom: 0, minWidth: '140px' }}
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            className="input"
            value={`${sortBy}:${sortOrder}`}
            onChange={e => { const [col, dir] = e.target.value.split(':'); setSortBy(col); setSortOrder(dir); }}
            style={{ flex: 1, marginBottom: 0, minWidth: '160px' }}
          >
            <option value="name:asc">Name A→Z</option>
            <option value="name:desc">Name Z→A</option>
            <option value="price:asc">Price Low→High</option>
            <option value="price:desc">Price High→Low</option>
            <option value="stock_quantity:asc">Stock Low→High</option>
            <option value="stock_quantity:desc">Stock High→Low</option>
          </select>
          {(search || selectedCategory) && (
            <button className="btn-outline" onClick={() => { setSearch(''); setSelectedCategory(''); }}>
              Clear
            </button>
          )}
        </div>

        {/* ── Add Product Form ── */}
        {showForm && (
          <form onSubmit={handleCreate} className="form-box" style={{ marginTop: '14px' }}>
            <h4>Add New Product</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <input className="input" placeholder="Product Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              <input className="input" placeholder="SKU * (letters, digits, - _)" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} required />
              <input className="input" type="number" step="0.01" min="0.01" placeholder="Price (₹) *" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required />
              <select className="input" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                <option value="">Select Category (Optional)</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input className="input" type="number" min="0" placeholder="Initial Stock Quantity" value={form.stock_quantity} onChange={e => setForm({ ...form, stock_quantity: e.target.value })} />
              <input className="input" type="number" min="0" placeholder="Low Stock Threshold (default 10)" value={form.low_stock_threshold} onChange={e => setForm({ ...form, low_stock_threshold: e.target.value })} />
            </div>
            <input className="input" placeholder="Description (optional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn" type="submit">Create Product</button>
              <button className="btn-outline" type="button" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        )}

        {/* ── Restock Form ── */}
        {restockId && (
          <form onSubmit={handleRestock} className="form-box" style={{ marginTop: '14px' }}>
            <h4>Restock: <em style={{ fontWeight: 400 }}>{restockingProduct?.name}</em></h4>
            <p style={{ color: 'var(--text-light)', fontSize: '13px', marginBottom: '10px' }}>
              Current stock: <strong>{restockingProduct?.stock_quantity}</strong>
            </p>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <input className="input" type="number" min="1" placeholder="Quantity to add" value={restockQty} onChange={e => setRestockQty(e.target.value)} required style={{ flex: 1, marginBottom: 0 }} />
              <button className="btn" type="submit">Add Stock</button>
              <button className="btn-outline" type="button" onClick={() => { setRestockId(null); setRestockQty(''); }}>Cancel</button>
            </div>
          </form>
        )}

        {/* ── Products Table ── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>⏳</div>
            <p>Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-light)', background: 'var(--bg-surface)', borderRadius: '10px', marginTop: '16px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
            <h3 style={{ marginBottom: '6px' }}>No products found</h3>
            <p style={{ fontSize: '13px' }}>
              {search || selectedCategory ? 'Try adjusting your search or filter.' : 'Get started by adding your first product.'}
            </p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('name')}>Name <SortIcon col="name" /></th>
                <th>Category</th>
                <th>SKU</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('price')}>Price <SortIcon col="price" /></th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('stock_quantity')}>Stock <SortIcon col="stock_quantity" /></th>
                <th>Threshold</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} style={{ opacity: editId && editId !== p.id ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                  {/* ── Inline Edit Mode ── */}
                  {editId === p.id ? (
                    <>
                      <td>
                        <input
                          className="input"
                          value={editData.name}
                          onChange={e => setEditData({ ...editData, name: e.target.value })}
                          style={{ marginBottom: 0, padding: '6px 8px' }}
                        />
                      </td>
                      <td>
                        <select
                          className="input"
                          value={editData.category_id}
                          onChange={e => setEditData({ ...editData, category_id: e.target.value })}
                          style={{ marginBottom: 0, padding: '6px 8px' }}
                        >
                          <option value="">— None —</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </td>
                      <td><code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', color: '#374151' }}>{p.sku}</code></td>
                      <td>
                        <input
                          className="input"
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={editData.price}
                          onChange={e => setEditData({ ...editData, price: e.target.value })}
                          style={{ marginBottom: 0, padding: '6px 8px', width: '90px' }}
                        />
                      </td>
                      <td>
                        <span className={p.stock_quantity <= p.low_stock_threshold ? 'stock-low' : 'stock-ok'}>
                          {p.stock_quantity}
                        </span>
                      </td>
                      <td>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          value={editData.low_stock_threshold}
                          onChange={e => setEditData({ ...editData, low_stock_threshold: e.target.value })}
                          style={{ marginBottom: 0, padding: '6px 8px', width: '70px' }}
                        />
                      </td>
                      <td>
                        <button className="btn-sm" onClick={() => handleEdit(p.id)} style={{ marginRight: '5px', background: '#16a34a', color: '#fff', border: 'none' }}>Save</button>
                        <button className="btn-sm" onClick={() => setEditId(null)}>Cancel</button>
                      </td>
                    </>
                  ) : (
                    /* ── Read Mode ── */
                    <>
                      <td>
                        <strong>{p.name}</strong>
                        {p.description && <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '2px' }}>{p.description}</div>}
                      </td>
                      <td>
                        {p.category_name
                          ? <span style={{ background: '#ede9fe', color: '#6d28d9', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>{p.category_name}</span>
                          : <em style={{ color: '#bbb' }}>—</em>
                        }
                      </td>
                      <td><code style={{ background: 'rgba(243,244,246,0.08)', padding: '2px 6px', borderRadius: '4px' }}>{p.sku}</code></td>
                      <td style={{ fontWeight: 500 }}>₹{Number(p.price).toFixed(2)}</td>
                      <td>
                        <span className={p.stock_quantity <= p.low_stock_threshold ? 'stock-low' : 'stock-ok'}>
                          {p.stock_quantity}
                          {p.stock_quantity <= p.low_stock_threshold && ' ⚠️'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-light)' }}>{p.low_stock_threshold}</td>
                      {user.role === 'admin' ? (
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button className="btn-sm" onClick={() => startEdit(p)} style={{ marginRight: '5px' }}>Edit</button>
                          <button className="btn-sm" onClick={() => { setRestockId(p.id); setShowForm(false); }} style={{ marginRight: '5px' }}>Restock</button>
                          <button className="btn-sm btn-danger" onClick={() => handleDelete(p.id, p.name)}>Delete</button>
                        </td>
                      ) : (
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {p.stock_quantity <= 0 ? (
                            <span style={{ color: 'var(--text-light)', fontSize: '12px' }}>Out of stock</span>
                          ) : (
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <input
                                className="input"
                                type="number"
                                min="1"
                                max={p.stock_quantity}
                                placeholder="Qty"
                                value={orderQty[p.id] ?? ''}
                                onChange={e => setOrderQty({ ...orderQty, [p.id]: e.target.value })}
                                style={{ marginBottom: 0, padding: '6px 8px', width: '60px' }}
                              />
                              <button
                                className="btn-sm"
                                disabled={orderingId === p.id}
                                onClick={() => handlePlaceOrder(p)}
                              >
                                {orderingId === p.id ? 'Ordering...' : 'Order'}
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </>
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
