import { useEffect, useRef, useState } from 'react';
import { sendMessage, getMessages, getAdminChat } from '../lib/chat';
import { initSocket, getSocket } from '../lib/socket';

export default function ChatWindow({ onClose, currentUser, initialProduct = null }) {
  const [messages, setMessages] = useState([]);
  const [adminInfo, setAdminInfo] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [prefilled, setPrefilled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    async function loadChat() {
      try {
        setLoading(true);
        setError('');
        const { conversation_id, admin } = await getAdminChat();
        setConversationId(conversation_id);
        setAdminInfo(admin);
          console.log('Admin info loaded:', admin);

        // Try to fetch existing messages, but don't fail if conversation doesn't exist yet
        try {
          const msgs = await getMessages(conversation_id);
          setMessages(msgs);
        } catch (err) {
          // No existing conversation yet - that's OK, user hasn't sent a message
          if (!err.message?.includes('Conversation not found')) {
            throw err;
          }
          setMessages([]);
        }

        // Initialize Socket.IO for real-time updates
        try {
          initSocket();
          const s = getSocket();
          s.emit('join', conversation_id);
          
          s.on('new_message', (msg) => {
            if (msg.conversation_id === conversation_id) {
              setMessages((prev) => [...prev, msg]);
              // notify other widgets (unread badge)
              window.dispatchEvent(new Event('anyprint:chat-updated'));
            }
          });

          s.on('connect', () => {
            console.log('Chat socket connected');
          });

          s.on('disconnect', () => {
            console.log('Chat socket disconnected');
          });

          s.on('error', (err) => {
            console.error('Socket error:', err);
          });
        } catch (e) {
          console.warn('Socket.IO initialization failed:', e);
        }

        // If the page was opened with an initial product, prefill the input box
        if (initialProduct && !prefilled) {
          const name = initialProduct.name || '';
          const id = initialProduct.id || '';
          setInputValue(`Hi, I have a question about "${name}" (id: ${id}). `);
          setPrefilled(true);
        }
      } catch (err) {
        setError(err.message || 'Failed to load chat');
      } finally {
        setLoading(false);
      }
    }

    if (currentUser) {
      loadChat();
    }
  }, [currentUser, initialProduct, prefilled]);

  async function handleSendMessage(e) {
    e.preventDefault();

    if (!inputValue.trim() || !adminInfo || sending) return;

    try {
      setSending(true);
      setError('');
      
        console.log('===== Sending Message =====');
        console.log('adminInfo:', adminInfo);
        console.log('adminInfo.id:', adminInfo?.id);
        console.log('inputValue:', inputValue.substring(0, 50));
      const message = await sendMessage(adminInfo.id, inputValue);
      console.log('Message sent successfully:', message);
      setInputValue('');

      // Add the new message to the UI immediately (real-time via socket will also update)
      if (message) {
        setMessages((prev) => [...prev, message]);
      }

      // Make sure socket.io is listening for new messages if not already
      try {
        const s = getSocket();
        if (!s.connected) {
          initSocket();
        }
      } catch (e) {
        console.warn('Socket reconnect failed:', e);
      }
    } catch (err) {
      console.error('Send message error:', err);
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="chat-window">
        <div className="chat-header">
          <h3>Chat with Admin</h3>
          <button className="chat-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="chat-loading">Loading chat...</div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div>
          <h3>Chat with Admin</h3>
          {adminInfo && <p className="chat-admin-name">{adminInfo.name}</p>}
        </div>
        <button className="chat-close" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="chat-messages">
        {error && <div className="chat-error">{error}</div>}

        {!error && messages.length === 0 ? (
          <div className="chat-empty">
            <p>Start a conversation with our support team!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg._id}
              className={`chat-message ${
                msg.sender_id._id === currentUser.id ? 'sent' : 'received'
              }`}
            >
              <div className="message-bubble">
                <p className="message-content">{msg.content}</p>
                <span className="message-time">
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type a message..."
          disabled={sending}
          className="chat-input"
        />
        <button type="submit" disabled={!inputValue.trim() || sending} className="chat-send-btn">
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
