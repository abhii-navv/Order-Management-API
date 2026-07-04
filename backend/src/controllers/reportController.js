const pool = require('../config/db');
const { getLowStockProducts } = require('../models/Product');
const { getAuditLog } = require('../models/StockAuditLog');

// ── Low Stock Report ───────────────────────────────────────────────────────────

const lowStock = async (req, res) => {
  try {
    const products = await getLowStockProducts();
    // Group by category for richer dashboard display
    const byCategory = products.reduce((acc, p) => {
      const cat = p.category_name || 'Uncategorised';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(p);
      return acc;
    }, {});

    res.json({
      count: products.length,
      products,
      byCategory,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ── Sales Summary Report ───────────────────────────────────────────────────────

/**
 * Aggregated order stats broken down by time period, with period-over-period
 * growth rates so the dashboard can render trend arrows.
 *
 * Query params:
 *   ?period = day | week | month | year  (default: month)
 *   ?limit  = number of periods to return (default: 12)
 */
const salesSummary = async (req, res) => {
  const { period = 'month', limit = 12 } = req.query;
  const trunc = ['day', 'week', 'month', 'year'].includes(period) ? period : 'month';
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 52);

  try {
    const result = await pool.query(
      `SELECT
         DATE_TRUNC($1, o.created_at)              AS period,
         COUNT(o.id)::int                          AS total_orders,
         SUM(o.total_amount)::numeric              AS total_revenue,
         AVG(o.total_amount)::numeric              AS avg_order_value,
         COUNT(CASE WHEN o.status = 'delivered'  THEN 1 END)::int AS delivered_orders,
         COUNT(CASE WHEN o.status = 'cancelled'  THEN 1 END)::int AS cancelled_orders,
         COUNT(CASE WHEN o.status = 'pending'    THEN 1 END)::int AS pending_orders,
         COUNT(DISTINCT o.user_id)::int            AS unique_customers,
         SUM(CASE WHEN o.status != 'cancelled' THEN o.total_amount ELSE 0 END)::numeric AS confirmed_revenue
       FROM orders o
       GROUP BY 1
       ORDER BY 1 DESC
       LIMIT $2`,
      [trunc, safeLimit]
    );

    // Compute period-over-period revenue growth rate (current vs previous period)
    const rows = result.rows;
    const enriched = rows.map((row, idx) => {
      const prev = rows[idx + 1]; // rows are DESC so prev period is index+1
      const growth =
        prev && Number(prev.confirmed_revenue) > 0
          ? (
              ((Number(row.confirmed_revenue) - Number(prev.confirmed_revenue)) /
                Number(prev.confirmed_revenue)) *
              100
            ).toFixed(2)
          : null;
      return {
        ...row,
        total_revenue: Number(row.total_revenue).toFixed(2),
        confirmed_revenue: Number(row.confirmed_revenue).toFixed(2),
        avg_order_value: Number(row.avg_order_value).toFixed(2),
        revenue_growth_pct: growth !== null ? parseFloat(growth) : null,
      };
    });

    // Overall totals across all returned periods
    const totals = {
      total_orders: enriched.reduce((s, r) => s + r.total_orders, 0),
      total_revenue: enriched.reduce((s, r) => s + Number(r.total_revenue), 0).toFixed(2),
      confirmed_revenue: enriched.reduce((s, r) => s + Number(r.confirmed_revenue), 0).toFixed(2),
      delivered_orders: enriched.reduce((s, r) => s + r.delivered_orders, 0),
      cancelled_orders: enriched.reduce((s, r) => s + r.cancelled_orders, 0),
    };

    res.json({ period: trunc, limit: safeLimit, summary: enriched, totals });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ── Audit Log ─────────────────────────────────────────────────────────────────

const auditLog = async (req, res) => {
  try {
    const { product_id, page, limit } = req.query;
    const logs = await getAuditLog({ product_id, page, limit });
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ── Top Products Report ────────────────────────────────────────────────────────

/**
 * Best-selling products ranked by units sold (excluding cancelled orders).
 * Also returns each product's revenue contribution percentage of total.
 *
 * Query params:
 *   ?limit      = number of products to return (default 10, max 50)
 *   ?category_id = filter to specific category
 */
const topProducts = async (req, res) => {
  const { limit = 10, category_id } = req.query;
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);

  try {
    const categoryFilter = category_id ? `AND p.category_id = ${parseInt(category_id, 10)}` : '';

    const result = await pool.query(
      `SELECT
         p.id,
         p.name,
         p.sku,
         c.name                                        AS category_name,
         SUM(oi.quantity)::int                         AS total_sold,
         SUM(oi.quantity * oi.unit_price)::numeric     AS total_revenue,
         COUNT(DISTINCT oi.order_id)::int              AS order_count,
         AVG(oi.unit_price)::numeric                   AS avg_sell_price
       FROM order_items oi
       JOIN products  p ON oi.product_id = p.id
       JOIN orders    o ON oi.order_id   = o.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE o.status != 'cancelled'
       ${categoryFilter}
       GROUP BY p.id, p.name, p.sku, c.name
       ORDER BY total_sold DESC
       LIMIT $1`,
      [safeLimit]
    );

    const rows = result.rows;
    const grandTotal = rows.reduce((s, r) => s + Number(r.total_revenue), 0);

    const enriched = rows.map((r, idx) => ({
      rank: idx + 1,
      ...r,
      total_revenue: Number(r.total_revenue).toFixed(2),
      avg_sell_price: Number(r.avg_sell_price).toFixed(2),
      revenue_share_pct:
        grandTotal > 0
          ? parseFloat(((Number(r.total_revenue) / grandTotal) * 100).toFixed(2))
          : 0,
    }));

    res.json({ products: enriched, grandTotalRevenue: grandTotal.toFixed(2) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ── Customer Analytics Report ──────────────────────────────────────────────────

/**
 * Customer-level spending analytics — total orders, lifetime value, and avg order value.
 * Useful for identifying high-value customers.
 *
 * Query params:
 *   ?limit = number of customers to return (default 10, max 100)
 */
const customerAnalytics = async (req, res) => {
  const { limit = 10 } = req.query;
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

  try {
    const result = await pool.query(
      `SELECT
         u.id                                                  AS user_id,
         u.name                                                AS customer_name,
         u.email,
         COUNT(o.id)::int                                      AS total_orders,
         COUNT(CASE WHEN o.status = 'delivered'  THEN 1 END)::int AS completed_orders,
         COUNT(CASE WHEN o.status = 'cancelled'  THEN 1 END)::int AS cancelled_orders,
         SUM(CASE WHEN o.status != 'cancelled' THEN o.total_amount ELSE 0 END)::numeric AS lifetime_value,
         AVG(CASE WHEN o.status != 'cancelled' THEN o.total_amount END)::numeric        AS avg_order_value,
         MAX(o.created_at)                                     AS last_order_at
       FROM users u
       LEFT JOIN orders o ON u.id = o.user_id
       WHERE u.role = 'user'
       GROUP BY u.id, u.name, u.email
       ORDER BY lifetime_value DESC NULLS LAST
       LIMIT $1`,
      [safeLimit]
    );

    const customers = result.rows.map(r => ({
      ...r,
      lifetime_value: Number(r.lifetime_value || 0).toFixed(2),
      avg_order_value: r.avg_order_value ? Number(r.avg_order_value).toFixed(2) : '0.00',
    }));

    res.json({ count: customers.length, customers });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// ── Dashboard KPI Summary ──────────────────────────────────────────────────────

/**
 * Single endpoint that returns all key metrics needed to populate a dashboard
 * in one network round-trip. Runs all sub-queries in parallel.
 */
const dashboardKpis = async (req, res) => {
  try {
    const [
      ordersToday,
      revenueThisMonth,
      pendingOrders,
      lowStockCount,
      newCustomersThisMonth,
    ] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS count FROM orders
         WHERE created_at >= CURRENT_DATE`
      ),
      pool.query(
        `SELECT COALESCE(SUM(total_amount), 0)::numeric AS revenue FROM orders
         WHERE status != 'cancelled'
           AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())`
      ),
      pool.query(
        `SELECT COUNT(*)::int AS count FROM orders WHERE status = 'pending'`
      ),
      pool.query(
        `SELECT COUNT(*)::int AS count FROM products
         WHERE deleted_at IS NULL AND stock_quantity <= low_stock_threshold`
      ),
      pool.query(
        `SELECT COUNT(*)::int AS count FROM users
         WHERE role = 'user'
           AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())`
      ),
    ]);

    res.json({
      ordersToday:          ordersToday.rows[0].count,
      revenueThisMonth:     Number(revenueThisMonth.rows[0].revenue).toFixed(2),
      pendingOrders:        pendingOrders.rows[0].count,
      lowStockProducts:     lowStockCount.rows[0].count,
      newCustomersThisMonth: newCustomersThisMonth.rows[0].count,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { lowStock, salesSummary, auditLog, topProducts, customerAnalytics, dashboardKpis };
