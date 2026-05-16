// src/services/chat/chatService.ts

import axios from 'axios';
import { fetch as expoFetch } from 'expo/fetch';
import { getBackendEndpoint } from '../../config/api';
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

/** Peticiones IA en curso por conversación (soporta solapamiento con refcount). Persiste entre desmontajes de pantalla. */
const pendingAiByConversation = new Map<string, number>();
const aiPendingListeners = new Set<() => void>();

function notifyAiPendingListeners() {
  aiPendingListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* noop */
    }
  });
}

/** Unifica mensajes del storage con los que ya hay en React (evita que una carga tardía borre el mensaje del usuario). */
export function mergeChatMessagesById(
  previous: ChatMessage[],
  fromStorage: ChatMessage[]
): ChatMessage[] {
  const map = new Map<string, ChatMessage>();
  for (const m of fromStorage) {
    map.set(m.id, m);
  }
  for (const m of previous) {
    if (!map.has(m.id)) {
      map.set(m.id, m);
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

export function isAwaitingAiResponse(conversationId: string): boolean {
  return (pendingAiByConversation.get(String(conversationId)) ?? 0) > 0;
}

/** Suscripción para repintar la UI del chat cuando cambia el estado “IA generando” (sigues en otra pantalla y vuelves). */
export function subscribeAiPending(callback: () => void): () => void {
  aiPendingListeners.add(callback);
  return () => aiPendingListeners.delete(callback);
}

function markAiRequestStart(conversationId: string) {
  const k = String(conversationId);
  pendingAiByConversation.set(k, (pendingAiByConversation.get(k) ?? 0) + 1);
  notifyAiPendingListeners();
}

function markAiRequestEnd(conversationId: string) {
  const k = String(conversationId);
  const n = (pendingAiByConversation.get(k) ?? 1) - 1;
  if (n <= 0) {
    pendingAiByConversation.delete(k);
  } else {
    pendingAiByConversation.set(k, n);
  }
  notifyAiPendingListeners();
}

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
 * Actualiza texto de un mensaje existente y notifica a la UI.
 */
export async function updateMessage(
  conversationId: string,
  messageId: string,
  text: string
): Promise<void> {
  const messages = await getMessages(conversationId);
  const idx = messages.findIndex((m) => m.id === messageId);
  if (idx === -1) return;

  const updated: ChatMessage = {
    ...messages[idx],
    text,
  };
  messages[idx] = updated;
  await storage.setItem(
    `${MESSAGES_STORAGE_PREFIX}${conversationId}`,
    JSON.stringify(messages)
  );
  notifyMessageListeners(conversationId, updated);
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

/** Solo UI (sin escribir a disco): permite streaming fluido antes del guardado final. */
export function relayChatMessageUi(conversationId: string, message: ChatMessage): void {
  notifyMessageListeners(conversationId, message);
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

export type SendAiChatParams = {
  signal?: AbortSignal;
  currentTitle?: string;
  /** Tras guardar el mensaje del usuario; útil para quitar burbuja optimista sin duplicar. */
  onUserMessagePersisted?: () => void;
  /** Fases del backend: persistence | preparing | generating */
  onStreamStatus?: (phase: string) => void;
};

type NdjsonEv = {
  type?: string;
  text?: string;
  message?: string;
  phase?: string;
  data?: Record<string, unknown>;
};

async function applyNdjsonLine(
  line: string,
  out: { doneData?: { data?: Record<string, unknown> } },
  onChunkText: (cumulative: string) => void | Promise<void>,
  onStreamStatus?: (phase: string) => void
): Promise<void> {
  const t = line.trim();
  if (!t) return;
  let ev: NdjsonEv;
  try {
    ev = JSON.parse(t) as NdjsonEv;
  } catch {
    return;
  }
  if (ev.type === 'chunk' && typeof ev.text === 'string') {
    await onChunkText(ev.text);
  } else if (ev.type === 'status' && typeof ev.phase === 'string') {
    onStreamStatus?.(ev.phase);
  } else if (ev.type === 'error') {
    throw new Error(
      typeof ev.message === 'string' ? ev.message : 'Error en la respuesta del servidor'
    );
  } else if (ev.type === 'done') {
    out.doneData = { data: ev.data };
  }
}

/** Consume NDJSON línea a línea (respuesta del stream del chat). */
async function consumeNdjsonText(
  fullText: string,
  onChunkText: (cumulative: string) => void | Promise<void>,
  onStreamStatus?: (phase: string) => void
): Promise<{ doneData?: { data?: Record<string, unknown> } }> {
  const out: { doneData?: { data?: Record<string, unknown> } } = {};
  const lines = fullText.split(/\r?\n/);
  for (const line of lines) {
    await applyNdjsonLine(line, out, onChunkText, onStreamStatus);
  }
  return out;
}

/**
 * POST al endpoint NDJSON del chat.
 * Usa `expo/fetch`: en React Native el `fetch` global suele no exponer `response.body.getReader()`,
 * y el stream del backend falla sin esto.
 */
async function fetchChatStreamNdjson(
  url: string,
  token: string,
  body: object,
  onChunkText: (cumulative: string) => void | Promise<void>,
  signal?: AbortSignal,
  onStreamStatus?: (phase: string) => void
): Promise<{ doneData?: { data?: Record<string, unknown> } }> {
  const response = await expoFetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    let detail = `${response.status}`;
    try {
      const j = await response.json();
      const m = (j as { message?: string; data?: { message?: string } })?.message ??
        (j as { data?: { message?: string } })?.data?.message;
      detail = typeof m === 'string' ? m : detail;
    } catch {
      try {
        detail = await response.text();
      } catch {
        /* noop */
      }
    }
    throw new Error(detail || `HTTP ${response.status}`);
  }

  const out: { doneData?: { data?: Record<string, unknown> } } = {};
  const streamBody = response.body;
  const reader = streamBody?.getReader?.();

  if (!reader) {
    const fullText = await response.text();
    return consumeNdjsonText(fullText, onChunkText, onStreamStatus);
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      await applyNdjsonLine(line, out, onChunkText, onStreamStatus);
    }
  }

  const tail = buffer.trim();
  if (tail) {
    await applyNdjsonLine(tail, out, onChunkText, onStreamStatus);
  }

  return out;
}

/**
 * Envía al agente IA: intenta streaming (como Gemini/ChatGPT); si falla, POST clásico.
 */
export async function sendMessage(
  conversationId: string,
  text: string,
  params?: SendAiChatParams
): Promise<ChatMessage> {
  console.log('📤 Enviando mensaje al agente IA...');
  const { signal, currentTitle, onUserMessagePersisted, onStreamStatus } = params ?? {};

  const conversationsForContext = await getConversations();
  const convForContext = conversationsForContext.find(c => c.id === conversationId);
  const contextItemsForChat = convForContext?.contextItems ?? [];
  const contextItemIds = contextItemsForChat.map((item) => item.id);

  await addMessage(conversationId, text, 'user', contextItemIds);
  try {
    onUserMessagePersisted?.();
  } catch {
    /* noop */
  }

  markAiRequestStart(conversationId);

  const placeholderAi = await addMessage(conversationId, '\u200b', 'ai');

  const applySuggestedTitle = async (suggestedTitle: unknown) => {
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
  };

  try {
    const token = await storage.getItem('userToken');

    if (!token) {
      setConnectionStatus('error');
      throw new Error('No autenticado');
    }

    const payload = {
      message: text,
      conversationId,
      currentTitle,
      contextItems: contextItemsForChat,
    };

    let lastAiText = '';

    let doneData: Record<string, unknown> | undefined;
    try {
      const streamUrl = getBackendEndpoint('/chat/message/stream');
      const done = await fetchChatStreamNdjson(
        streamUrl,
        token,
        payload,
        async (cumulative) => {
          lastAiText = cumulative;
          relayChatMessageUi(conversationId, {
            ...placeholderAi,
            text: cumulative,
          });
        },
        signal,
        onStreamStatus
      );
      doneData = done.doneData?.data as Record<string, unknown> | undefined;
    } catch (streamErr: unknown) {
      const msg = streamErr instanceof Error ? streamErr.message : String(streamErr);
      console.warn('Stream del chat falló en red/parseo; usando POST /chat/message —', msg);
      const response = await axios.post(
        getBackendEndpoint('/chat/message'),
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 120000,
          signal,
        }
      );

      setConnectionStatus('connected');

      const rawAiResponse = response.data?.data?.response;
      const aiResponseText =
        typeof rawAiResponse === 'string' ? rawAiResponse.trim() : '';
      if (!aiResponseText) {
        throw new Error('El agente IA devolvió una respuesta vacía.');
      }

      await updateMessage(conversationId, placeholderAi.id, aiResponseText);
      await applySuggestedTitle(response.data?.data?.suggestedTitle);

      const messagesAfterFallback = await getMessages(conversationId);
      const finalMsgFb = messagesAfterFallback.find((m) => m.id === placeholderAi.id);
      if (finalMsgFb) {
        return finalMsgFb;
      }
      return {
        id: placeholderAi.id,
        text: aiResponseText,
        sender: 'ai' as const,
        timestamp: placeholderAi.timestamp,
        conversationId,
      };
    }

    setConnectionStatus('connected');

    const finalResponse =
      typeof doneData?.response === 'string'
        ? (doneData.response as string).trim()
        : lastAiText.trim();

    if (!finalResponse) {
      throw new Error('El agente IA devolvió una respuesta vacía.');
    }

    if (finalResponse !== lastAiText.trim()) {
      relayChatMessageUi(conversationId, {
        ...placeholderAi,
        text: finalResponse,
      });
    }

    await updateMessage(conversationId, placeholderAi.id, finalResponse);
    await applySuggestedTitle(doneData?.suggestedTitle);

    const messagesAfter = await getMessages(conversationId);
    const finalMsg = messagesAfter.find((m) => m.id === placeholderAi.id);
    if (finalMsg) {
      return finalMsg;
    }
    return {
      id: placeholderAi.id,
      text: finalResponse,
      sender: 'ai' as const,
      timestamp: placeholderAi.timestamp,
      conversationId,
    };
  } catch (error: any) {
    const isAborted =
      error?.code === 'ERR_CANCELED' ||
      error?.name === 'AbortError' ||
      error?.name === 'CanceledError';

    if (isAborted) {
      console.log('📤 Envío cancelado');
      setConnectionStatus('connected');
      throw error;
    }

    console.error('❌ Error sending message to AI agent:', error);

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      setConnectionStatus('error');
    } else if (error.request && !error.response) {
      setConnectionStatus('error');
    } else {
      setConnectionStatus('connected');
    }

    let errorMessage = 'Error al conectar con el agente IA';
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      errorMessage = 'La solicitud tardó demasiado. Por favor, intenta de nuevo.';
    } else if (error.response?.data) {
      const msg = error.response.data?.message;
      if (typeof msg === 'string') {
        errorMessage = msg;
      } else if (msg && typeof msg === 'object' && typeof msg.message === 'string') {
        errorMessage = msg.message;
      } else {
        errorMessage = error.response.data?.details || `Error del servidor: ${error.response.status}`;
      }
    } else if (error.request) {
      errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión.';
    } else {
      errorMessage = error.message || 'Error desconocido';
    }

    await updateMessage(
      conversationId,
      placeholderAi.id,
      `Error: ${errorMessage}`
    );
    const msgsFinal = await getMessages(conversationId);
    const errBubble = msgsFinal.find(m => m.id === placeholderAi.id);
    return (
      errBubble ?? {
        id: placeholderAi.id,
        text: `Error: ${errorMessage}`,
        sender: 'ai' as const,
        timestamp: placeholderAi.timestamp,
        conversationId,
      }
    );
  } finally {
    markAiRequestEnd(conversationId);
  }
}
