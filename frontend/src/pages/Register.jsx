import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import '../styles/auth.css';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/register', form);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/');
    } catch (err) {
      const validationErrors = err.response?.data?.errors;
      if (validationErrors && Array.isArray(validationErrors)) {
        setError(validationErrors.map(e => e.msg).join(', '));
      } else {
        setError(err.response?.data?.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
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
          <div style={{ position: 'relative' }}>
            <input
              className="input"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password (min 8 chars, 1 uppercase, 1 number)"
              value={form.password}
              onChange={e => setForm({...form, password: e.target.value})}
              required
              style={{ paddingRight: '40px' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(prev => !prev)}
              style={{
                position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px',
                color: 'var(--text-light)', lineHeight: 1,
              }}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
          <select className="input" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <button className="btn" type="submit" disabled={loading}>{loading ? 'Creating account...' : 'Register'}</button>
        </form>
        <p>Have account? <Link to="/login">Sign in</Link></p>
      </div>
    </div>
  );
}
