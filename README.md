# 📦 Inventory & Order Management API

A full-stack Inventory and Order Management system built with Node.js, Express, PostgreSQL, and React.

> 🚧 Currently in development

## Tech Stack
- **Backend** — Node.js, Express.js, PostgreSQL, JWT
- **Frontend** — React 18, Vite, Axios

## Features
- JWT authentication + role-based access (user/admin)
- Product & category management with soft deletes
- Order placement with database transactions
- Stock audit logging & low-stock alerts
- Comprehensive Analytics & Reports Dashboard
- PDF invoice generation

---

## Getting Started

### Prerequisites
- Node.js ≥ 18
- PostgreSQL ≥ 14

### 1. Clone the repository
```bash
git clone https://github.com/abhii-navv/Order-Management-API.git
cd Order-Management-API
```

### 2. Configure environment variables
```bash
cp backend/.env.example backend/.env
# Edit backend/.env and fill in your DB credentials & JWT secret
```

### 3. Install dependencies
```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 4. Start the development servers
```bash
# Backend (from /backend)
npm run dev        # starts on http://localhost:5000

# Frontend (from /frontend)
npm run dev        # starts on http://localhost:5173
```

---

## API Endpoints

All routes are prefixed with `/api/v1`.

### Auth — `/auth`
| Method | Path                | Auth | Description               |
|--------|---------------------|------|---------------------------|
| POST   | `/auth/register`    | ✗    | Register a new account    |
| POST   | `/auth/login`       | ✗    | Obtain a JWT token        |
| POST   | `/auth/logout`      | ✓    | Revoke the current token  |
| GET    | `/auth/me`          | ✓    | Get current user profile  |
| PUT    | `/auth/password`    | ✓    | Change account password   |

### Products — `/products`
| Method | Path                      | Auth  | Description                     |
|--------|---------------------------|-------|---------------------------------|
| GET    | `/products`               | ✓     | List products (filterable)      |
| GET    | `/products/:id`           | ✓     | Get a single product            |
| POST   | `/products`               | Admin | Create a product                |
| PUT    | `/products/:id`           | Admin | Update a product                |
| DELETE | `/products/:id`           | Admin | Soft-delete a product           |
| POST   | `/products/:id/restock`   | Admin | Add stock & write audit log     |

### Categories — `/categories`
| Method | Path                | Auth  | Description          |
|--------|---------------------|-------|----------------------|
| GET    | `/categories`       | ✓     | List all categories  |
| POST   | `/categories`       | Admin | Create a category    |
| PUT    | `/categories/:id`   | Admin | Update a category    |
| DELETE | `/categories/:id`   | Admin | Delete a category    |

### Orders — `/orders`
| Method | Path                     | Auth  | Description                         |
|--------|--------------------------|-------|-------------------------------------|
| GET    | `/orders`                | Admin | List all orders                     |
| GET    | `/orders/my`             | ✓     | List current user's orders          |
| GET    | `/orders/:id`            | ✓     | Get order details + invoice PDF     |
| POST   | `/orders`                | ✓     | Place a new order                   |
| PATCH  | `/orders/:id/status`     | Admin | Update order status                 |

### Reports — `/reports` *(Admin only)*
| Method | Path                        | Description                        |
|--------|-----------------------------|------------------------------------|
| GET    | `/reports/dashboard-kpis`   | High-level KPI summary             |
| GET    | `/reports/low-stock`        | Products below their threshold     |
| GET    | `/reports/sales`            | Revenue & orders over time         |
| GET    | `/reports/top-products`     | Best-selling products              |

---

## Author
Abhi — [@abhii-navv](https://github.com/abhii-navv)
