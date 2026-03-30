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
// El estado de conexión siempre es 'connected' si el usuario tiene sesión activa
// No hay una conexión persistente real, solo indicamos que el servicio está disponible
let connectionStatus: ChatConnectionStatus = 'connected';
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
    }))
    .sort((a: ChatConversation, b: ChatConversation) => b.updatedAt.getTime() - a.updatedAt.getTime());
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
    title: title || 'Nueva conversación',
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
  
  const updatedConversation = {
    ...conversations[index],
    ...updates,
    updatedAt: new Date(),
  };

  // Move updated conversation to top so latest activity is visible immediately
  conversations.splice(index, 1);
  conversations.unshift(updatedConversation);
  
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
 * Add cultural context items to a conversation (merge, no duplicates).
 */
export async function addContextItemsToConversation(
  conversationId: string,
  items: CulturalItem[]
): Promise<void> {
  const conversation = (await getConversations()).find(c => c.id === conversationId);
  if (!conversation) return;

  const existingIds = new Set(conversation.contextItems.map(item => item.id));
  const newItems = items.filter(item => !existingIds.has(item.id));

  await updateConversation(conversationId, {
    contextItems: [...conversation.contextItems, ...newItems],
  });
}

/**
 * Remove one context item from a conversation by id.
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
 * Send a message to the AI agent.
 * If signal is provided and the request is aborted (e.g. user left the chat), no error message is added to the conversation.
 */
export async function sendMessage(
  conversationId: string,
  text: string,
  signal?: AbortSignal,
  currentTitle?: string
): Promise<ChatMessage> {
  console.log('📤 Enviando mensaje al agente IA...');

  const conversationsForContext = await getConversations();
  const convForContext = conversationsForContext.find(c => c.id === conversationId);
  const contextItemIds =
    convForContext?.contextItems?.map((item) => item.id) ?? [];

  await addMessage(conversationId, text, 'user', contextItemIds);

  // El estado siempre es 'connected' - no cambiamos a 'connecting' porque no hay conexión persistente
  // Solo mostramos 'error' si hay un problema real

  try {
    const { storage } = await import('../../utils/storage');
    const token = await storage.getItem('userToken');

    if (!token) {
      setConnectionStatus('error');
      throw new Error('No autenticado');
    }

    const { getBackendEndpoint } = await import('../../config/api');
    const axios = (await import('axios')).default;

    const response = await axios.post(
      getBackendEndpoint('/chat/message'),
      {
        message: text,
        conversationId,
        currentTitle,
        contextItems: contextItemIds,
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 90000, // 90 segundos para dar más tiempo
        signal
      }
    );

    // Mantener estado connected
    setConnectionStatus('connected');

    const aiResponseText = response.data?.data?.response || 'No pude generar una respuesta en este momento. ¿Quieres intentar de nuevo?';
    const suggestedTitle = response.data?.data?.suggestedTitle;

    const aiMessage = await addMessage(conversationId, aiResponseText, 'ai');

    if (typeof suggestedTitle === 'string' && suggestedTitle.trim().length > 0) {
      const conversations = await getConversations();
      const currentConversation = conversations.find(c => c.id === conversationId);
      const shouldUpdateTitle =
        !!currentConversation &&
        currentConversation.title.trim() !== suggestedTitle.trim();

      if (shouldUpdateTitle) {
        await updateConversation(conversationId, { title: suggestedTitle.trim() });
      }
    }

    return aiMessage;
  } catch (error: any) {
    const isAborted = error.code === 'ERR_CANCELED' || error.name === 'AbortError';

    if (isAborted) {
      console.log('📤 Envío cancelado (usuario salió o cambió de conversación)');
      // Mantener connected si fue cancelado por el usuario
      setConnectionStatus('connected');
      throw error;
    }

    console.error('❌ Error sending message to AI agent:', error);

    // Solo marcar como error si es un error de conexión real
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      setConnectionStatus('error');
    } else if (error.request && !error.response) {
      // Error de red
      setConnectionStatus('error');
    } else {
      // Error del servidor pero la conexión funciona
      setConnectionStatus('connected');
    }

    let errorMessage = 'Error al conectar con el agente IA';
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      errorMessage = 'La solicitud tardó demasiado. Por favor, intenta de nuevo.';
    } else if (error.response?.data) {
      const msg = error.response.data?.message;
      errorMessage = typeof msg === 'string' ? msg : error.response.data?.details || `Error del servidor: ${error.response.status}`;
    } else if (error.request) {
      errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión.';
    } else {
      errorMessage = error.message || 'Error desconocido';
    }

    const aiMessage = await addMessage(conversationId, `Error: ${errorMessage}`, 'ai');
    return aiMessage;
  }
}
