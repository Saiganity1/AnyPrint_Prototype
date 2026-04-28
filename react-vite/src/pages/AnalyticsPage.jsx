import { useEffect, useMemo, useState } from "react";
import { apiRequest, normalizeApiError, readJsonSafe } from "../lib/api";
import { formatPrice, escapeCsv } from "../lib/format";
import { normalizeOrders } from "../lib/normalize";

function toIsoDate(date) {
  return date.toISOString().split("T")[0];
}

function defaultRange() {
  const today = new Date();
  const start = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from: toIsoDate(start), to: toIsoDate(today) };
}

function inRange(order, from, to) {
  const created = new Date(order.created_at || order.createdAt || Date.now());
  if (Number.isNaN(created.getTime())) return true;
  return toIsoDate(created) >= from && toIsoDate(created) <= to;
}

export default function AnalyticsPage() {
  const range = useMemo(() => defaultRange(), []);
  const [dateFrom, setDateFrom] = useState(range.from);
  const [dateTo, setDateTo] = useState(range.to);
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState("Loading analytics report...");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError("");
      setStatus("Loading analytics report...");

      try {
        const response = await apiRequest("orders/");
        const body = await readJsonSafe(response);
        if (!response.ok) {
          throw new Error(normalizeApiError(body, "Could not load analytics report."));
        }
        if (!cancelled) {
          setOrders(normalizeOrders(body));
          setStatus(`Report ready for ${dateFrom} to ${dateTo}.`);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || "Could not load analytics report.");
          setStatus("Could not load analytics report.");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo]);

  const reportOrders = useMemo(
    () => orders.filter((order) => inRange(order, dateFrom, dateTo)),
    [orders, dateFrom, dateTo],
  );

  const metrics = {
    total_revenue: reportOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
    total_orders: reportOrders.length,
    completed_orders: reportOrders.filter((order) => String(order.status || "").toLowerCase() === "completed").length,
  };
  metrics.average_order_value = metrics.total_orders ? metrics.total_revenue / metrics.total_orders : 0;

  const topProducts = useMemo(() => {
    const totals = new Map();
    reportOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const name = item.product_name || item.productId?.name || "Product";
        const existing = totals.get(name) || { product_name: name, quantity_sold: 0, revenue: 0 };
        existing.quantity_sold += Number(item.quantity || 0);
        existing.revenue += Number(item.subtotal || 0);
        totals.set(name, existing);
      });
    });
    return [...totals.values()].sort((a, b) => b.quantity_sold - a.quantity_sold);
  }, [reportOrders]);

  function resetRange() {
    const fallback = defaultRange();
    setDateFrom(fallback.from);
    setDateTo(fallback.to);
  }

  function exportCsv() {
    const lines = [];
    lines.push("AnyPrint Sales Report");
    lines.push(`Date Range,${escapeCsv(dateFrom)} to ${escapeCsv(dateTo)}`);
    lines.push("");
    lines.push("Metrics");
    lines.push("Total Revenue,Total Orders,Completed Orders,Average Order Value");
    lines.push(
      [
        metrics.total_revenue,
        metrics.total_orders,
        metrics.completed_orders,
        metrics.average_order_value,
      ].map(escapeCsv).join(","),
    );
    lines.push("");
    lines.push("Top Products");
    lines.push("Product Name,Quantity Sold,Revenue");
    topProducts.forEach((item) => {
      lines.push([item.product_name, item.quantity_sold, item.revenue].map(escapeCsv).join(","));
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `anyprint-sales-report-${dateFrom}-to-${dateTo}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const completionRate = Number(metrics.total_orders)
    ? ((Number(metrics.completed_orders || 0) / Number(metrics.total_orders || 1)) * 100).toFixed(1)
    : "0.0";

  const topProduct = topProducts[0]?.product_name || "N/A";

  return (
    <section>
      <div className="row-between">
        <h2>Sales Analytics</h2>
        <div className="inline-form wrap">
          <input id="dateFrom" type="date" title="From date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          <input id="dateTo" type="date" title="To date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          <button className="btn secondary" type="button" onClick={resetRange}>Reset</button>
          <button className="btn" type="button" onClick={exportCsv}>Export CSV</button>
          <button className="btn" type="button" onClick={() => window.print()}>Print</button>
        </div>
      </div>

      <p className="status-text">{status}</p>
      {error ? <p className="error-text">{error}</p> : null}

      <section className="panel">
        <h3>Report Summary</h3>
        <ul>
          <li>Date range: <strong>{dateFrom}</strong> to <strong>{dateTo}</strong></li>
          <li>Revenue: <strong>{formatPrice(metrics.total_revenue)}</strong> from <strong>{metrics.total_orders}</strong> orders</li>
          <li>Completion rate: <strong>{completionRate}%</strong></li>
          <li>Top product: <strong>{topProduct}</strong></li>
        </ul>
      </section>

      <section className="metrics-grid">
        <article className="metric-card"><span>Total Revenue</span><strong>{formatPrice(metrics.total_revenue)}</strong></article>
        <article className="metric-card"><span>Total Orders</span><strong>{metrics.total_orders || 0}</strong></article>
        <article className="metric-card"><span>Completed Orders</span><strong>{metrics.completed_orders || 0}</strong></article>
        <article className="metric-card"><span>Average Order Value</span><strong>{formatPrice(metrics.average_order_value)}</strong></article>
      </section>

      <section className="panel">
        <h3>Top Products</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Product</th><th>Qty Sold</th><th>Revenue</th></tr>
            </thead>
            <tbody>
              {topProducts.map((item) => (
                <tr key={item.product_name}>
                  <td>{item.product_name}</td>
                  <td>{item.quantity_sold}</td>
                  <td>{formatPrice(item.revenue)}</td>
                </tr>
              ))}
              {!topProducts.length ? <tr><td colSpan={3}>No product sales in this period.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
