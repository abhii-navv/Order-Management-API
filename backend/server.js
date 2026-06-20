require('dotenv').config();
const express = require('express');
const cors = require('cors');
const createTables = require('./src/config/createTables');

const authRoutes      = require('./src/routes/authRoutes');
const categoryRoutes  = require('./src/routes/categoryRoutes');
const productRoutes   = require('./src/routes/productRoutes');
const orderRoutes     = require('./src/routes/orderRoutes');
const reportRoutes    = require('./src/routes/reportRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/v1/auth',       authRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/products',   productRoutes);
app.use('/api/v1/orders',     orderRoutes);
app.use('/api/v1/reports',    reportRoutes);

app.get('/', (req, res) => {
  res.json({ message: '📦 Inventory & Order Management API is running' });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

const start = async () => {
  await createTables();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
};

start();
