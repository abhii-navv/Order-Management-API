import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import '../styles/table.css';

export default function Dashboard() {
  const [lowStock, setLowStock] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();
  

  useEffect(() => {
    if (user.role === 'admin') {
      api.get('/reports/low-stock').then(r => setLowStock(r.data.products || []));
    }
    const ordersEndpoint = user.role === 'admin' ? '/orders' : '/orders/my';
    api.get(ordersEndpoint).then(r => setRecentOrders((r.data.orders || []).slice(0, 5)));
  }, []);

  const logout = () => { localStorage.clear(); navigate('/login'); };

  return (
    <div>
      <nav className="navbar">
        <span>📦 Inventory Manager</span>
        <div>
          <Link to="/products">Products</Link>
          <Link to="/orders">Orders</Link>
          <span> | {user.name} ({user.role}) </span>
          <button onClick={logout}>Logout</button>
        </div>
      </nav>
      <div className="container">
        <h2>Dashboard</h2>
        <div className="link-row">
          <Link to="/products" className="btn">🏷️ Products</Link>
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
                    <td style={{color:'red'}}>{p.stock_quantity}</td>
                    <td>{p.low_stock_threshold}</td>
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
