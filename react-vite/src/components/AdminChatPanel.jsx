import { useEffect, useState, useRef } from 'react';
import { getConversations, getMessages, sendMessage, deleteMessage } from '../lib/chat';
import { getStoredUser } from '../lib/auth';
import { getSocket, initSocket } from '../lib/socket';

export default function AdminChatPanel() {
  const admin = getStoredUser();
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadConversations();
    // initialize socket
    try {
      initSocket();
      const s = getSocket();
      s.on('new_message', (msg) => {
        // If the new message belongs to currently selected conversation, reload messages
        if (selected && msg.conversation_id === selected.conversation_id) {
          loadMessages(selected.conversation_id);
        }
        // otherwise refresh conversations list to update unread counts
        loadConversations();
      });
    } catch (e) {
      // ignore socket errors in environments without socket.io client
    }
  }, []);

  useEffect(() => {
    if (selected) loadMessages(selected.conversation_id);
  }, [selected]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadConversations() {
    try {
      setError('');
      const convos = await getConversations();
      setConversations(convos);
    } catch (err) {
      setError(err.message || 'Failed to load conversations');
    }
  }

  async function loadMessages(conversationId) {
    try {
      setLoading(true);
      setError('');
      const msgs = await getMessages(conversationId);
      setMessages(msgs);
      // join socket room for real-time updates
      try {
        const s = getSocket();
        s.emit('join', conversationId);
      } catch (e) {}
    } catch (err) {
      setError(err.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!inputValue.trim() || !selected) return;

    try {
      setSending(true);
      // recipient is the other user in the conversation
      const recipientId = selected.other_user.id;
      await sendMessage(recipientId, inputValue.trim());
      setInputValue('');
      await loadMessages(selected.conversation_id);
      await loadConversations();
    } catch (err) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(messageId) {
    try {
      await deleteMessage(messageId);
      if (selected) await loadMessages(selected.conversation_id);
      await loadConversations();
    } catch (err) {
      setError(err.message || 'Failed to delete message');
    }
  }

  return (
    <section className="panel" style={{ display: 'flex', gap: '1rem' }}>
      <div style={{ width: 280 }}>
        <div className="row-between">
          <h3>Customer Chats</h3>
          <button className="btn" onClick={loadConversations}>Refresh</button>
        </div>
        {error && <p className="error-text">{error}</p>}
        <div style={{ marginTop: '0.5rem' }}>
          {conversations.length === 0 ? (
            <p className="meta">No conversations</p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.conversation_id}
                className={`checkout-item ${selected?.conversation_id === c.conversation_id ? 'selected' : ''}`}
                onClick={() => setSelected(c)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <strong>{c.other_user.name}</strong>
                  <p className="meta">{c.other_user.email}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <small>{new Date(c.last_message_at).toLocaleString()}</small>
                  {c.unread_count > 0 && <div className="chat-badge">{c.unread_count}</div>}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Conversation</h3>
          <div>
            <button className="btn" onClick={() => selected && loadMessages(selected.conversation_id)}>Reload</button>
          </div>
        </div>

        <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', padding: '0.5rem', border: '1px solid var(--muted)', borderRadius: 6 }}>
          {loading ? (
            <p className="meta">Loading messages...</p>
          ) : !selected ? (
            <p className="meta">Select a conversation to view messages.</p>
          ) : messages.length === 0 ? (
            <p className="meta">No messages yet.</p>
          ) : (
            messages.map((m) => (
              <div key={m._id} className={`chat-message ${m.sender_id._id === admin.id ? 'sent' : 'received'}`} style={{ marginBottom: 8 }}>
                <div className="message-bubble">
                  <p className="message-content">{m.content}</p>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <small className="message-time">{new Date(m.createdAt).toLocaleString()}</small>
                    {m.sender_id._id === admin.id && (
                      <button className="btn small" onClick={() => handleDelete(m._id)}>Delete</button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input-form" onSubmit={handleSend} style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder={selected ? `Message ${selected.other_user.name}` : 'Select a conversation'}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={!selected || sending}
            className="chat-input"
            style={{ flex: 1 }}
          />
          <button className="btn" type="submit" disabled={!inputValue.trim() || !selected || sending}>
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </section>
  );
}
