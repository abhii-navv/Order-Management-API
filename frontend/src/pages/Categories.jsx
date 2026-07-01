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
  const user = JSON.parse(localStorage.getItem('user') || '{}');

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
    try {
      await api.post('/categories', { name, description });
      setName('');
      setDescription('');
      setShowForm(false);
      fetchCategories();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create category');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this category? Products in this category will have their category cleared.')) return;
    try {
      await api.delete(`/categories/${id}`);
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
        <h2>Categories</h2>
        {error && <p className="error">{error}</p>}
        
        <div className="row">
          <p>Manage product groupings and departments.</p>
          {user.role === 'admin' && (
            <button className="btn" onClick={() => setShowForm(!showForm)}>+ Add Category</button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="form-box">
            <h4>Add New Category</h4>
            <input className="input" placeholder="Category Name *" value={name} onChange={e => setName(e.target.value)} required />
            <input className="input" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
            <button className="btn" type="submit">Create Category</button>
            <button className="btn-outline" type="button" onClick={() => setShowForm(false)}>Cancel</button>
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
              <tr key={c.id}>
                <td><strong>{c.name}</strong></td>
                <td>{c.description || <em style={{ color: '#999' }}>No description</em>}</td>
                {user.role === 'admin' && (
                  <td>
                    <button className="btn-sm btn-danger" onClick={() => handleDelete(c.id)}>Delete</button>
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
