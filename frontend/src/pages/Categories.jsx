import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import '../styles/table.css';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({ name: '', description: '' });
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Auto-dismiss error & success
  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(''), 4000); return () => clearTimeout(t); }
  }, [error]);
  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(''), 3000); return () => clearTimeout(t); }
  }, [success]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data.categories || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load categories');
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Category name is required.'); return; }
    try {
      await api.post('/categories', { name: name.trim(), description: description.trim() });
      setName('');
      setDescription('');
      setShowForm(false);
      setSuccess('✅ Category created successfully!');
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create category');
    }
  };

  const startEdit = (c) => {
    setEditId(c.id);
    setEditData({ name: c.name, description: c.description || '' });
  };

  const handleEdit = async (id) => {
    if (!editData.name.trim()) { setError('Category name cannot be blank.'); return; }
    try {
      await api.put(`/categories/${id}`, { name: editData.name.trim(), description: editData.description.trim() });
      setEditId(null);
      setSuccess('✏️ Category updated!');
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update category');
    }
  };

  const handleDelete = async (id, categoryName) => {
    if (!confirm(`Delete "${categoryName}"? Products in this category will have their category cleared.`)) return;
    try {
      await api.delete(`/categories/${id}`);
      setSuccess(`🗑️ "${categoryName}" deleted.`);
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete category');
    }
  };

  return (
    <div>
      <nav className="navbar">
        <span>📦 Inventory Manager</span>
        <div>
          <Link to="/">Dashboard</Link>
          <Link to="/products">Products</Link>
          <Link to="/categories" className="active-link">Categories</Link>
          <Link to="/orders">Orders</Link>
        </div>
      </nav>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <div>
            <h2 style={{ marginBottom: '2px' }}>Categories</h2>
            <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>
              {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'} &mdash; Manage product groupings.
            </p>
          </div>
          {user.role === 'admin' && (
            <button className="btn" onClick={() => { setShowForm(!showForm); setEditId(null); }}>
              {showForm ? '✕ Cancel' : '+ Add Category'}
            </button>
          )}
        </div>

        {error && <p className="error" style={{ marginTop: '10px' }}>{error}</p>}
        {success && <p className="success-toast">{success}</p>}

        {showForm && (
          <form onSubmit={handleCreate} className="form-box" style={{ marginTop: '14px' }}>
            <h4>Add New Category</h4>
            <input className="input" placeholder="Category Name *" value={name}
              onChange={e => setName(e.target.value)} required />
            <input className="input" placeholder="Description (optional)" value={description}
              onChange={e => setDescription(e.target.value)} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn" type="submit">Create Category</button>
              <button className="btn-outline" type="button" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        )}

        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              {user.role === 'admin' && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 && (
              <tr><td colSpan={user.role === 'admin' ? 3 : 2} className="empty-row">No categories found.</td></tr>
            )}
            {categories.map(c => (
              <tr key={c.id} style={{ opacity: editId && editId !== c.id ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                {editId === c.id ? (
                  <>
                    <td>
                      <input className="input" value={editData.name}
                        onChange={e => setEditData({ ...editData, name: e.target.value })}
                        style={{ marginBottom: 0, padding: '6px 8px' }} />
                    </td>
                    <td>
                      <input className="input" value={editData.description} placeholder="Description"
                        onChange={e => setEditData({ ...editData, description: e.target.value })}
                        style={{ marginBottom: 0, padding: '6px 8px' }} />
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn-sm" onClick={() => handleEdit(c.id)}
                        style={{ background: '#16a34a', color: '#fff', border: 'none', marginRight: '5px' }}>Save</button>
                      <button className="btn-sm" onClick={() => setEditId(null)}>Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td><strong>{c.name}</strong></td>
                    <td>{c.description || <em style={{ color: '#999' }}>No description</em>}</td>
                    {user.role === 'admin' && (
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn-sm" onClick={() => startEdit(c)} style={{ marginRight: '5px' }}>Edit</button>
                        <button className="btn-sm btn-danger" onClick={() => handleDelete(c.id, c.name)}>Delete</button>
                      </td>
                    )}
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
