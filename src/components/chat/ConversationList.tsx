// src/components/chat/ConversationList.tsx

import { MessageSquare, Plus, Trash2 } from 'lucide-react-native';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { ChatConversation } from '../../types/chat';

interface ConversationListProps {
  conversations: ChatConversation[];
  currentConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
}

export function ConversationList({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}: ConversationListProps) {
  const formatDate = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return 'Hoy';
    } else if (days === 1) {
      return 'Ayer';
    } else if (days < 7) {
      return `Hace ${days} días`;
    } else {
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    }
  };

  return (
    <View className="flex-1 bg-slate-900 border-r border-slate-800">
      {/* Header */}
      <View className="p-4 border-b border-slate-800">
        <TouchableOpacity
          onPress={onNewConversation}
          className="bg-purple-600 rounded-xl p-3 flex-row items-center justify-center gap-2"
        >
          <Plus size={18} color="white" />
          <Text className="text-white font-semibold">Nueva Conversación</Text>
        </TouchableOpacity>
      </View>

      {/* Conversations List */}
      <ScrollView className="flex-1">
        {conversations.length === 0 ? (
          <View className="items-center justify-center py-20 px-4">
            <MessageSquare size={48} color="#64748b" />
            <Text className="text-slate-400 text-center mt-4">
              No hay conversaciones aún.{'\n'}
              Crea una nueva para comenzar
            </Text>
          </View>
        ) : (
          <View className="p-2">
            {conversations.map((conversation) => {
              const isActive = conversation.id === currentConversationId;
              return (
                <TouchableOpacity
                  key={conversation.id}
                  onPress={() => onSelectConversation(conversation.id)}
                  className={`mb-2 p-3 rounded-xl ${
                    isActive
                      ? 'bg-purple-600/20 border border-purple-500/50'
                      : 'bg-slate-800/50 border border-slate-700/50'
                  }`}
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 mr-2">
                      <Text
                        className={`font-semibold mb-1 ${
                          isActive ? 'text-purple-300' : 'text-white'
                        }`}
                        numberOfLines={1}
                      >
                        {conversation.title}
                      </Text>
                      <View className="flex-row items-center gap-2">
                        <Text className="text-slate-400 text-xs">
                          {conversation.messageCount} mensajes
                        </Text>
                      </View>
                      <Text className="text-slate-500 text-xs mt-1">
                        {formatDate(conversation.updatedAt)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(conversation.id);
                      }}
                      className="p-1"
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
