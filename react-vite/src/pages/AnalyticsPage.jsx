import { useEffect, useMemo, useState } from "react";
import { apiRequest, normalizeApiError, readJsonSafe } from "../lib/api";
import { formatPrice, escapeCsv } from "../lib/format";

function toIsoDate(date) {
  return date.toISOString().split("T")[0];
}

function defaultRange() {
  const today = new Date();
  const start = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from: toIsoDate(start), to: toIsoDate(today) };
}

export default function AnalyticsPage() {
  const range = useMemo(() => defaultRange(), []);
  const [dateFrom, setDateFrom] = useState(range.from);
  const [dateTo, setDateTo] = useState(range.to);
  const [status, setStatus] = useState("Loading analytics report...");
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError("");
      setStatus("Loading analytics report...");

      try {
        const query = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
        const response = await apiRequest(`admin/analytics/?${query.toString()}`);
        const body = await readJsonSafe(response);

        if (!response.ok) {
          throw new Error(normalizeApiError(body, "Could not load analytics report."));
        }

        if (!cancelled) {
          setData(body);
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

  const metrics = data?.metrics || {
    total_revenue: 0,
    total_orders: 0,
    completed_orders: 0,
    average_order_value: 0,
  };

  function resetRange() {
    const fallback = defaultRange();
    setDateFrom(fallback.from);
    setDateTo(fallback.to);
  }

  function exportCsv() {
    if (!data) return;

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
      ]
        .map(escapeCsv)
        .join(","),
    );

    lines.push("");
    lines.push("Payment Breakdown");
    lines.push("Payment Method,Order Count,Total Amount");
    (data.payment_breakdown || []).forEach((item) => {
      lines.push([item.payment_method, item.count, item.total].map(escapeCsv).join(","));
    });

    lines.push("");
    lines.push("Top Products");
    lines.push("Product Name,Quantity Sold,Revenue");
    (data.top_products || []).forEach((item) => {
      lines.push([item.product__name, item.quantity_sold, item.revenue].map(escapeCsv).join(","));
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

  const topPayment = data?.payment_breakdown?.[0]?.payment_method || "N/A";
  const topProduct = data?.top_products?.[0]?.product__name || "N/A";

  return (
    <section>
      <div className="row-between">
        <h2>Sales Analytics</h2>
        <div className="inline-form wrap">
          <label htmlFor="dateFrom" className="sr-only">
            From date
          </label>
          <input
            id="dateFrom"
            type="date"
            title="From date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
          />
          <label htmlFor="dateTo" className="sr-only">
            To date
          </label>
          <input
            id="dateTo"
            type="date"
            title="To date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
          />
          <button className="btn secondary" type="button" onClick={resetRange}>
            Reset
          </button>
          <button className="btn" type="button" onClick={exportCsv} disabled={!data}>
            Export CSV
          </button>
          <button className="btn" type="button" onClick={() => window.print()} disabled={!data}>
            Print
          </button>
        </div>
      </div>

      <p className="status-text">{status}</p>
      {error ? <p className="error-text">{error}</p> : null}

      <section className="panel">
        <h3>Report Summary</h3>
        <ul>
          <li>
            Date range: <strong>{dateFrom}</strong> to <strong>{dateTo}</strong>
          </li>
          <li>
            Revenue: <strong>{formatPrice(metrics.total_revenue)}</strong> from{" "}
            <strong>{metrics.total_orders}</strong> orders
          </li>
          <li>
            Completion rate: <strong>{completionRate}%</strong>
          </li>
          <li>
            Top payment method: <strong>{topPayment}</strong>
          </li>
          <li>
            Top product: <strong>{topProduct}</strong>
          </li>
        </ul>
      </section>

      <section className="metrics-grid">
        <article className="metric-card">
          <span>Total Revenue</span>
          <strong>{formatPrice(metrics.total_revenue)}</strong>
        </article>
        <article className="metric-card">
          <span>Total Orders</span>
          <strong>{metrics.total_orders || 0}</strong>
        </article>
        <article className="metric-card">
          <span>Completed Orders</span>
          <strong>{metrics.completed_orders || 0}</strong>
        </article>
        <article className="metric-card">
          <span>Average Order Value</span>
          <strong>{formatPrice(metrics.average_order_value)}</strong>
        </article>
      </section>

      <section className="panel">
        <h3>Top Products</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty Sold</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {(data?.top_products || []).map((item) => (
                <tr key={item.product_id}>
                  <td>{item.product__name}</td>
                  <td>{item.quantity_sold}</td>
                  <td>{formatPrice(item.revenue)}</td>
                </tr>
              ))}
              {!(data?.top_products || []).length ? (
                <tr>
                  <td colSpan={3}>No product sales in this period.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
