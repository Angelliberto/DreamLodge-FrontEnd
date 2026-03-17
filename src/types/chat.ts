// src/types/chat.ts

import { CulturalItem } from './CulturalItem';

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  conversationId: string;
  contextItems?: string[]; // IDs of cultural items added to context
}

export interface ChatConversation {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  contextItems: CulturalItem[]; // Items added to context for this conversation
}

export interface ChatContext {
  favorites: CulturalItem[];
  pending: CulturalItem[];
  selectedItems: CulturalItem[]; // Items selected for current conversation
}

export type ChatConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
