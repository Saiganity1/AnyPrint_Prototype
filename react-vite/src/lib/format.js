export function formatPrice(value) {
  const amount = Number(value || 0);
  return `PHP ${amount.toFixed(2)}`;
}

export function escapeCsv(value) {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}
