import { useEffect, useState, useRef } from 'react';
import { getConversations, getMessages, sendMessage, deleteMessage } from '../lib/chat';
import { getStoredUser } from '../lib/auth';
import { getSocket, initSocket, joinSocketRoom, leaveSocketRoom } from '../lib/socket';

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
  const selectedRef = useRef(null);
  const adminIdRef = useRef(admin?.id);

  useEffect(() => {
    loadConversations();
    // initialize socket
    try {
      initSocket();
      const s = getSocket();
      const handleNewMessage = (msg) => {
        const activeSelected = selectedRef.current;
        console.log('[AdminChatPanel] new_message event received:', { msg, activeSelected });

        if (activeSelected && msg.conversation_id === activeSelected.conversation_id) {
          console.log('[AdminChatPanel] Message matches active conversation, updating state');
          setMessages((prev) => {
            if (prev.some((existing) => existing._id === msg._id)) {
              console.log('[AdminChatPanel] Duplicate message, skipping');
              return prev;
            }
            console.log('[AdminChatPanel] Appending message to state, new count:', prev.length + 1);
            return [...prev, msg];
          });
        } else {
          console.log('[AdminChatPanel] Message is from different conversation, skipping state update');
        }

        loadConversations();
      };

      console.log('[AdminChatPanel] Registering new_message listener');
      s.off('new_message', handleNewMessage);
      s.on('new_message', handleNewMessage);
      console.log('[AdminChatPanel] new_message listener registered');
    } catch (e) {
      // ignore socket errors in environments without socket.io client
    }
  }, []);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    adminIdRef.current = admin?.id;
  }, [admin]);

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
        joinSocketRoom(conversationId);
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
      setError('');
      // recipient is the other user in the conversation
      const recipientId = String(selected.other_user?.id || selected.other_user?._id || '').trim();
      if (!recipientId) {
        throw new Error('Could not resolve recipient for this conversation');
      }

      await sendMessage(recipientId, inputValue.trim());
      setInputValue('');
    } catch (err) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    return () => {
      if (selectedRef.current?.conversation_id) {
        leaveSocketRoom(selectedRef.current.conversation_id);
      }
    };
  }, []);

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
    <section className="chat-window admin-chat-window">
      <div className="chat-header">
        <div>
          <h3>Customer Support Inbox</h3>
          <p className="chat-admin-name">Reply to customers in real time</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className="btn" onClick={loadConversations}>Refresh</button>
        </div>
      </div>

      <div className="admin-chat-layout">
        <aside className="admin-chat-sidebar">
          <div className="admin-chat-sidebar-header">
            <h4>Customer Chats</h4>
            <span className="chat-badge">{conversations.length}</span>
          </div>

          {error && <p className="error-text">{error}</p>}

          <div className="admin-chat-conversation-list">
            {conversations.length === 0 ? (
              <p className="meta">No conversations</p>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.conversation_id}
                  className={`admin-chat-conversation ${selected?.conversation_id === c.conversation_id ? 'selected' : ''}`}
                  onClick={() => setSelected(c)}
                >
                  <div className="admin-chat-conversation-main">
                    <strong>{c.other_user.name}</strong>
                    <p className="meta">{c.other_user.email}</p>
                  </div>
                  <div className="admin-chat-conversation-meta">
                    <small>{new Date(c.last_message_at).toLocaleString()}</small>
                    {c.unread_count > 0 && <div className="chat-badge">{c.unread_count}</div>}
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <div className="admin-chat-thread">
          <div className="admin-chat-thread-header">
            <div>
              <h4>Conversation</h4>
              <p className="chat-admin-name">
                {selected ? `Replying to ${selected.other_user.name}` : 'Select a customer conversation'}
              </p>
            </div>
            <button className="btn" onClick={() => selected && loadMessages(selected.conversation_id)}>Reload</button>
          </div>

          <div className="chat-messages admin-chat-messages">
            {loading ? (
              <p className="meta">Loading messages...</p>
            ) : !selected ? (
              <p className="meta">Select a conversation to view messages.</p>
            ) : messages.length === 0 ? (
              <p className="meta">No messages yet.</p>
            ) : (
              messages.map((m) => {
                const isSentByAdmin = String(m.sender_id?._id || m.sender_id) === String(adminIdRef.current);
                return (
                  <div key={m._id} className={`chat-message ${isSentByAdmin ? 'sent' : 'received'}`}>
                    <div className="message-bubble">
                      <p className="message-content">{m.content}</p>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <small className="message-time">{new Date(m.createdAt).toLocaleString()}</small>
                        {isSentByAdmin && (
                          <button className="btn small" onClick={() => handleDelete(m._id)}>Delete</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-input-form admin-chat-input-form" onSubmit={handleSend}>
            <input
              type="text"
              placeholder={selected ? `Message ${selected.other_user.name}` : 'Select a conversation'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={!selected || sending}
              className="chat-input"
            />
            <button className="btn" type="submit" disabled={!inputValue.trim() || !selected || sending}>
              {sending ? 'Sending...' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
