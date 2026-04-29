import { apiRequest, readJsonSafe } from './api';

export async function sendMessage(recipientId, content) {
  const response = await apiRequest('chat/send', {
    method: 'POST',
    body: JSON.stringify({
      recipient_id: recipientId,
      content,
    }),
  });

  const body = await readJsonSafe(response);
  if (!response.ok) {
    throw new Error(body.error || 'Failed to send message');
  }
  return body.message;
}

export async function getConversations() {
  const response = await apiRequest('chat/conversations');
  const body = await readJsonSafe(response);
  if (!response.ok) {
    throw new Error(body.error || 'Failed to fetch conversations');
  }
  return body.conversations || [];
}

export async function getMessages(conversationId, limit = 50, offset = 0) {
  const query = new URLSearchParams({ limit, offset }).toString();
  const response = await apiRequest(`chat/conversations/${conversationId}?${query}`);
  const body = await readJsonSafe(response);
  if (!response.ok) {
    throw new Error(body.error || 'Failed to fetch messages');
  }
  return body.messages || [];
}

export async function getAdminChat() {
  const response = await apiRequest('chat/admin');
  const body = await readJsonSafe(response);
  if (!response.ok) {
    throw new Error(body.error || 'Failed to get admin chat');
  }
  return body;
}

export async function getUnreadCount() {
  const response = await apiRequest('chat/unread');
  const body = await readJsonSafe(response);
  if (!response.ok) {
    throw new Error(body.error || 'Failed to fetch unread count');
  }
  return body.unread_count || 0;
}

export async function deleteMessage(messageId) {
  const response = await apiRequest(`chat/${messageId}`, {
    method: 'DELETE',
  });

  const body = await readJsonSafe(response);
  if (!response.ok) {
    throw new Error(body.error || 'Failed to delete message');
  }
  return body;
}
