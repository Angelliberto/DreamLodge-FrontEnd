// src/services/chat/chatService.ts

import { CulturalItem } from '../../types/CulturalItem';
import { ChatConversation, ChatMessage, ChatConnectionStatus } from '../../types/chat';
import { storage } from '../../utils/storage';

const CONVERSATIONS_STORAGE_KEY = 'chat_conversations';
const MESSAGES_STORAGE_PREFIX = 'chat_messages_';
const CURRENT_CONVERSATION_KEY = 'chat_current_conversation';

// In-memory state for real-time updates
let currentConversationId: string | null = null;
let messageListeners: Map<string, Set<(message: ChatMessage) => void>> = new Map();
let connectionStatus: ChatConnectionStatus = 'disconnected';
let connectionStatusListeners: Set<(status: ChatConnectionStatus) => void> = new Set();

/**
 * Get all conversations
 */
export async function getConversations(): Promise<ChatConversation[]> {
  try {
    const data = await storage.getItem(CONVERSATIONS_STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data).map((conv: any) => ({
      ...conv,
      createdAt: new Date(conv.createdAt),
      updatedAt: new Date(conv.updatedAt),
    }));
  } catch (error) {
    console.error('Error loading conversations:', error);
    return [];
  }
}

/**
 * Get messages for a conversation
 */
export async function getMessages(conversationId: string): Promise<ChatMessage[]> {
  try {
    const data = await storage.getItem(`${MESSAGES_STORAGE_PREFIX}${conversationId}`);
    if (!data) return [];
    return JSON.parse(data).map((msg: any) => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
    }));
  } catch (error) {
    console.error('Error loading messages:', error);
    return [];
  }
}

/**
 * Create a new conversation
 */
export async function createConversation(title?: string): Promise<ChatConversation> {
  const conversations = await getConversations();
  const now = new Date();
  
  const newConversation: ChatConversation = {
    id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: title || `Conversación ${conversations.length + 1}`,
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
    contextItems: [],
  };

  conversations.unshift(newConversation); // Add to beginning
  await storage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(conversations));
  
  return newConversation;
}

/**
 * Update conversation
 */
export async function updateConversation(
  conversationId: string,
  updates: Partial<ChatConversation>
): Promise<void> {
  const conversations = await getConversations();
  const index = conversations.findIndex(c => c.id === conversationId);
  
  if (index === -1) return;
  
  conversations[index] = {
    ...conversations[index],
    ...updates,
    updatedAt: new Date(),
  };
  
  await storage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(conversations));
}

/**
 * Delete a conversation
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  const conversations = await getConversations();
  const filtered = conversations.filter(c => c.id !== conversationId);
  await storage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(filtered));
  
  // Also delete messages
  await storage.removeItem(`${MESSAGES_STORAGE_PREFIX}${conversationId}`);
}

/**
 * Add a message to a conversation
 */
export async function addMessage(
  conversationId: string,
  text: string,
  sender: 'user' | 'ai',
  contextItems?: string[]
): Promise<ChatMessage> {
  const messages = await getMessages(conversationId);
  const newMessage: ChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    text,
    sender,
    timestamp: new Date(),
    conversationId,
    contextItems,
  };

  messages.push(newMessage);
  await storage.setItem(
    `${MESSAGES_STORAGE_PREFIX}${conversationId}`,
    JSON.stringify(messages)
  );

  // Update conversation
  const conversation = (await getConversations()).find(c => c.id === conversationId);
  if (conversation) {
    await updateConversation(conversationId, {
      messageCount: messages.length,
      updatedAt: new Date(),
    });
  }

  // Notify listeners
  notifyMessageListeners(conversationId, newMessage);

  return newMessage;
}

/**
 * Add context items to a conversation
 */
export async function addContextItemsToConversation(
  conversationId: string,
  items: CulturalItem[]
): Promise<void> {
  const conversation = (await getConversations()).find(c => c.id === conversationId);
  if (!conversation) return;

  // Merge with existing context items, avoiding duplicates
  const existingIds = new Set(conversation.contextItems.map(item => item.id));
  const newItems = items.filter(item => !existingIds.has(item.id));
  
  await updateConversation(conversationId, {
    contextItems: [...conversation.contextItems, ...newItems],
  });
}

/**
 * Remove context item from conversation
 */
export async function removeContextItemFromConversation(
  conversationId: string,
  itemId: string
): Promise<void> {
  const conversation = (await getConversations()).find(c => c.id === conversationId);
  if (!conversation) return;

  await updateConversation(conversationId, {
    contextItems: conversation.contextItems.filter(item => item.id !== itemId),
  });
}

/**
 * Set current conversation (for real-time updates and persistence)
 */
export async function setCurrentConversation(conversationId: string | null): Promise<void> {
  currentConversationId = conversationId;
  if (conversationId) {
    await storage.setItem(CURRENT_CONVERSATION_KEY, conversationId);
  } else {
    await storage.removeItem(CURRENT_CONVERSATION_KEY);
  }
}

/**
 * Get current conversation ID from memory
 */
export function getCurrentConversation(): string | null {
  return currentConversationId;
}

/**
 * Load persisted current conversation ID
 */
export async function loadCurrentConversation(): Promise<string | null> {
  try {
    const conversationId = await storage.getItem(CURRENT_CONVERSATION_KEY);
    if (conversationId) {
      currentConversationId = conversationId;
      return conversationId;
    }
    return null;
  } catch (error) {
    console.error('Error loading current conversation:', error);
    return null;
  }
}

/**
 * Clear current conversation (e.g., on logout)
 */
export async function clearCurrentConversation(): Promise<void> {
  currentConversationId = null;
  await storage.removeItem(CURRENT_CONVERSATION_KEY);
}

/**
 * Subscribe to new messages for a conversation
 */
export function subscribeToMessages(
  conversationId: string,
  callback: (message: ChatMessage) => void
): () => void {
  if (!messageListeners.has(conversationId)) {
    messageListeners.set(conversationId, new Set());
  }
  messageListeners.get(conversationId)!.add(callback);

  // Return unsubscribe function
  return () => {
    const listeners = messageListeners.get(conversationId);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        messageListeners.delete(conversationId);
      }
    }
  };
}

/**
 * Notify all listeners for a conversation about a new message
 */
function notifyMessageListeners(conversationId: string, message: ChatMessage): void {
  const listeners = messageListeners.get(conversationId);
  if (listeners) {
    listeners.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('Error in message listener:', error);
      }
    });
  }
}

/**
 * Subscribe to connection status changes
 */
export function subscribeToConnectionStatus(
  callback: (status: ChatConnectionStatus) => void
): () => void {
  connectionStatusListeners.add(callback);
  // Immediately call with current status
  callback(connectionStatus);

  return () => {
    connectionStatusListeners.delete(callback);
  };
}

/**
 * Set connection status
 */
export function setConnectionStatus(status: ChatConnectionStatus): void {
  connectionStatus = status;
  connectionStatusListeners.forEach(callback => {
    try {
      callback(status);
    } catch (error) {
      console.error('Error in connection status listener:', error);
    }
  });
}

/**
 * Get current connection status
 */
export function getConnectionStatus(): ChatConnectionStatus {
  return connectionStatus;
}

/**
 * Send a message (simulates real-time AI response)
 * TODO: Replace with actual MCP server connection
 */
export async function sendMessage(
  conversationId: string,
  text: string,
  contextItems?: CulturalItem[]
): Promise<ChatMessage> {
  // Add user message
  const userMessage = await addMessage(conversationId, text, 'user', 
    contextItems?.map(item => item.id)
  );

  // Set connecting status
  setConnectionStatus('connecting');

  // Simulate AI response (will be replaced with MCP server call)
  // For now, simulate a delay and return a placeholder response
  return new Promise((resolve) => {
    setTimeout(async () => {
      setConnectionStatus('connected');
      
      // TODO: Replace this with actual MCP server API call
      const aiResponseText = `He recibido tu mensaje: "${text}". ${contextItems && contextItems.length > 0 ? `Veo que has añadido ${contextItems.length} elemento(s) al contexto. ` : ''}Esta es una respuesta simulada. La conexión con el servidor MCP se implementará próximamente.`;
      
      const aiMessage = await addMessage(conversationId, aiResponseText, 'ai');
      resolve(aiMessage);
    }, 1000);
  });
}
