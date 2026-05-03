/**
 * Newsletter signup component
 */

import { useState } from 'react';

export default function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(''); // 'loading', 'success', 'error'
  const [message, setMessage] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('loading');
    try {
      // This would normally call your backend newsletter endpoint
      // For now, just store locally
      const newsletters = JSON.parse(localStorage.getItem('anyprint:newsletters') || '[]');
      if (!newsletters.includes(email)) {
        newsletters.push(email);
        localStorage.setItem('anyprint:newsletters', JSON.stringify(newsletters));
      }

      setStatus('success');
      setMessage('Thanks for subscribing! 🎉');
      setEmail('');
      setTimeout(() => setStatus(''), 3000);
    } catch {
      setStatus('error');
      setMessage('Failed to subscribe. Please try again.');
    }
  }

  return (
    <div className="newsletter-signup">
      <h3>Get Updates on New Designs</h3>
      <p>Subscribe to our newsletter for exclusive offers and new arrivals.</p>
      <form onSubmit={handleSubmit} className="newsletter-form">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          disabled={status === 'loading'}
          aria-label="Email for newsletter"
        />
        <button type="submit" className="btn" disabled={status === 'loading'}>
          {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
        </button>
      </form>
      {message && <p className={`newsletter-message ${status}`}>{message}</p>}
    </div>
  );
}
