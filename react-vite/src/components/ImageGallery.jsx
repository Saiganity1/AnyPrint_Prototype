import { useState } from "react";
import "../styles/image-gallery.css";

export default function ImageGallery({ images, productName }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const activeImage = images[selectedIndex] || "";

  const handleImageMouseMove = (e) => {
    if (zoomLevel <= 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePosition({ x, y });
  };

  const handleImageMouseLeave = () => {
    setMousePosition({ x: 50, y: 50 });
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.5, 1));
  };

  const handleKeyDown = (e) => {
    if (!isLightboxOpen) return;
    if (e.key === "ArrowLeft") {
      setSelectedIndex((prev) => (prev - 1 + images.length) % images.length);
    } else if (e.key === "ArrowRight") {
      setSelectedIndex((prev) => (prev + 1) % images.length);
    } else if (e.key === "Escape") {
      setIsLightboxOpen(false);
    }
  };

  return (
    <div className="image-gallery">
      <div 
        className="gallery-main"
        onMouseMove={handleImageMouseMove}
        onMouseLeave={handleImageMouseLeave}
        onClick={() => setIsLightboxOpen(true)}
        role="button"
        tabIndex="0"
        onKeyDown={(e) => e.key === "Enter" && setIsLightboxOpen(true)}
        aria-label="Click to open image gallery"
      >
        {activeImage ? (
          <>
            <img
              src={activeImage}
              alt={`${productName} - View ${selectedIndex + 1}`}
              className="gallery-image"
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: `${mousePosition.x}% ${mousePosition.y}%`,
              }}
              loading="lazy"
            />
            {zoomLevel > 1 && (
              <div className="zoom-indicator">
                {Math.round(zoomLevel * 100)}%
              </div>
            )}
          </>
        ) : (
          <div className="gallery-fallback">No image available</div>
        )}
      </div>

      {images.length > 1 && (
        <div className="gallery-thumbnails">
          {images.map((image, index) => (
            <button
              key={`${image}-${index}`}
              className={`thumbnail ${index === selectedIndex ? "active" : ""}`}
              onClick={() => {
                setSelectedIndex(index);
                setZoomLevel(1);
              }}
              aria-label={`View image ${index + 1} of ${images.length}`}
            >
              <img src={image} alt={`${productName} thumbnail ${index + 1}`} loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {/* Zoom Controls */}
      <div className="zoom-controls">
        <button
          className="zoom-btn"
          onClick={handleZoomOut}
          disabled={zoomLevel <= 1}
          aria-label="Zoom out"
          title="Zoom out (-))"
        >
          −
        </button>
        <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>
        <button
          className="zoom-btn"
          onClick={handleZoomIn}
          disabled={zoomLevel >= 3}
          aria-label="Zoom in"
          title="Zoom in (+)"
        >
          +
        </button>
      </div>

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div
          className="lightbox-overlay"
          onClick={() => setIsLightboxOpen(false)}
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-modal="true"
          aria-label="Image gallery lightbox"
        >
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="lightbox-close"
              onClick={() => setIsLightboxOpen(false)}
              aria-label="Close lightbox"
            >
              ✕
            </button>

            <button
              className="lightbox-prev"
              onClick={() =>
                setSelectedIndex((prev) => (prev - 1 + images.length) % images.length)
              }
              aria-label="Previous image"
              disabled={images.length <= 1}
            >
              ❮
            </button>

            <img
              src={activeImage}
              alt={`${productName} - View ${selectedIndex + 1}`}
              className="lightbox-image"
              loading="lazy"
            />

            <button
              className="lightbox-next"
              onClick={() =>
                setSelectedIndex((prev) => (prev + 1) % images.length)
              }
              aria-label="Next image"
              disabled={images.length <= 1}
            >
              ❯
            </button>

            <div className="lightbox-counter">
              {selectedIndex + 1} / {images.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
