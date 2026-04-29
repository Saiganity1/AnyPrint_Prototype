import { useEffect, useState } from 'react';
import { getUnreadCount } from '../lib/chat';
import ChatWindow from './ChatWindow';

export default function ChatWidget({ currentUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!currentUser) return;

    async function loadUnreadCount() {
      try {
        const count = await getUnreadCount();
        setUnreadCount(count);
      } catch (err) {
        console.error('Failed to load unread count:', err);
      }
    }

    loadUnreadCount();

    // Poll for new messages every 10 seconds
    const interval = setInterval(loadUnreadCount, 10000);

    // Listen for cart updates (same event pattern for extensibility)
    const handleChatUpdate = () => {
      loadUnreadCount();
    };

    window.addEventListener('anyprint:chat-updated', handleChatUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('anyprint:chat-updated', handleChatUpdate);
    };
  }, [currentUser]);

  if (!currentUser) return null;

  return (
    <>
      <button
        className="chat-widget-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open chat"
        title="Chat with Admin"
      >
        <span className="chat-icon">💬</span>
        {unreadCount > 0 && <span className="chat-badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="chat-widget-container">
          <ChatWindow
            currentUser={currentUser}
            onClose={() => setIsOpen(false)}
          />
        </div>
      )}
    </>
  );
}
