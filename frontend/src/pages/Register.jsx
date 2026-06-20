import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/register', form);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="center-page">
      <div className="card">
        <h2>📦 Inventory Manager</h2>
        <h3>Create Account</h3>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <input className="input" placeholder="Full Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          <input className="input" type="email" placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
          <input className="input" type="password" placeholder="Password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
          <select className="input" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <button className="btn" type="submit">Register</button>
        </form>
        <p>Have account? <Link to="/login">Sign in</Link></p>
      </div>
    </div>
  );
}
