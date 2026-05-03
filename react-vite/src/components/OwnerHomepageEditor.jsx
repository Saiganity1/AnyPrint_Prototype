import { useEffect, useState, useRef } from "react";
import { getStoredUser } from "../lib/auth";

const STORAGE_KEY = "anyprint:homepage:featured";

function readStorage() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeStorage(payload) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload || {}));
}

export default function OwnerHomepageEditor({ onChange }) {
  const user = getStoredUser();
  const isOwner = user && String(user.role || "").toUpperCase() === "OWNER";
  const [state, setState] = useState(() => {
    const saved = readStorage();
    return {
      trending: saved.trending || [],
      bestSelling: saved.bestSelling || [],
    };
  });
  const mountedRef = useRef(false);

  useEffect(() => {
    // Persist to storage every time state changes.
    writeStorage(state);
    // Only notify parent after the first render to avoid initial reload loops.
    if (mountedRef.current) {
      if (typeof onChange === "function") onChange(state);
    } else {
      mountedRef.current = true;
    }
  }, [state, onChange]);

  if (!isOwner) return null;

  function handleFileChange(e, cb) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => cb(reader.result);
    reader.readAsDataURL(file);
  }

  function addItem(section, item) {
    setState((s) => ({ ...s, [section]: [...(s[section] || []), item] }));
  }

  function removeItem(section, id) {
    setState((s) => ({ ...s, [section]: s[section].filter((i) => i.id !== id) }));
  }

  return (
    <div className="owner-editor">
      <h4>Owner Editor</h4>
      <div className="editor-section">
        <h5>Trending Products</h5>
        <div className="editor-controls">
          <ProductForm onSubmit={(data) => addItem("trending", data)} onFile={handleFileChange} />
        </div>
        <div className="featured-list">
          {(state.trending || []).map((it) => (
            <div className="featured-item" key={it.id}>
              <img src={it.image || ""} alt={it.name} />
              <div className="meta">
                <strong>{it.name}</strong>
                <div>{it.price ? `₱${it.price}` : ""}</div>
              </div>
              <button onClick={() => removeItem("trending", it.id)}>Remove</button>
            </div>
          ))}
        </div>
      </div>

      <div className="editor-section">
        <h5>Best Selling</h5>
        <div className="editor-controls">
          <ProductForm onSubmit={(data) => addItem("bestSelling", data)} onFile={handleFileChange} />
        </div>
        <div className="featured-list">
          {(state.bestSelling || []).map((it) => (
            <div className="featured-item" key={it.id}>
              <img src={it.image || ""} alt={it.name} />
              <div className="meta">
                <strong>{it.name}</strong>
                <div>{it.price ? `₱${it.price}` : ""}</div>
              </div>
              <button onClick={() => removeItem("bestSelling", it.id)}>Remove</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductForm({ onSubmit, onFile }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [image, setImage] = useState(null);

  function submit(e) {
    e.preventDefault();
    if (!name) return;
    const item = {
      id: `${Date.now()}`,
      name,
      price: price || "",
      category,
      image,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    };
    onSubmit(item);
    setName("");
    setPrice("");
    setCategory("");
    setImage(null);
  }

  function handleFile(e) {
    handleFileLocal(e, (dataUrl) => {
      setImage(dataUrl);
      if (typeof onFile === "function") onFile(e, (d) => {}); // keep compatibility
    });
  }

  function handleFileLocal(e, cb) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => cb(reader.result);
    reader.readAsDataURL(file);
  }

  return (
    <form className="product-form" onSubmit={submit}>
      <input placeholder="Product name" value={name} onChange={(e) => setName(e.target.value)} required />
      <input placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} />
      <input placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
      <input type="file" accept="image/*" onChange={(e) => handleFile(e)} />
      {image ? <img src={image} alt="preview" className="preview" /> : null}
      <button type="submit" className="btn small">Add</button>
    </form>
  );
}
