/**
 * Inventory status indicator component
 */

export default function InventoryStatus({ stock, threshold = 5 }) {
  if (stock === null || stock === undefined) {
    return null;
  }

  if (stock === 0) {
    return <div className="inventory-status out-of-stock">Out of Stock</div>;
  }

  if (stock < threshold) {
    return (
      <div className="inventory-status low-stock">
        Only {stock} left in stock
      </div>
    );
  }

  return (
    <div className="inventory-status in-stock">
      ✓ In Stock
    </div>
  );
}
