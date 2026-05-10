import { LinearGradient } from 'expo-linear-gradient';
import { Bot, User } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Keyboard, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ChatMessage } from '../../types/chat';
import { ChatTypingDots } from './ChatTypingDots';

function aiMessageHasRenderableText(text: unknown): boolean {
  return String(text ?? '').replace(/\u200b/g, '').trim().length > 0;
}

function formatTime(d: Date): string {
  try {
    return new Date(d).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

type Props = {
  messages: ChatMessage[];
  conversationId?: string | null;
  onSend: (text: string) => void;
  /** Bloquear envío mientras llega respuesta IA */
  isAwaitingAi: boolean;
};

export function ChatThread({ messages, conversationId, onSend, isAwaitingAi }: Props) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');
  const inputMinHeight = 44;
  const flatRef = useRef<FlatList<ChatMessage>>(null);

  /** Con `inverted`, el orden típico es más reciente primero (sale abajo como en Gemini/ChatGPT). */
  const data = useMemo(() => {
    const rows = conversationId ? messages.filter((m) => m.conversationId === conversationId) : [];
    const visible = rows.filter(
      (m) => m.sender === 'user' || aiMessageHasRenderableText(m.text)
    );
    return [...visible].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [messages, conversationId]);

  const anchorKey = useMemo(
    () =>
      `${data.length}|${data[0]?.id ?? ''}|${(data[0]?.text ?? '').length}|${String(isAwaitingAi)}`,
    [data, isAwaitingAi]
  );

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      flatRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
    return () => cancelAnimationFrame(id);
  }, [anchorKey]);

  const sendDraft = useCallback(() => {
    const t = draft.trim();
    if (!t || isAwaitingAi) return;
    setDraft('');
    Keyboard.dismiss();
    onSend(t);
  }, [draft, isAwaitingAi, onSend]);

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isUser = item.sender === 'user';
      return (
        <View
          key={item.id}
          className={`mb-3 flex-row ${isUser ? 'justify-end' : 'justify-start'}`}
          style={{ alignItems: 'flex-end', gap: 8 }}
        >
          {!isUser && (
            <View className="w-8 h-8 bg-purple-500/20 rounded-full items-center justify-center mb-1">
              <Bot size={16} color="#c084fc" />
            </View>
          )}
          <View style={{ maxWidth: '82%' }}>
            <View
              className={`rounded-2xl px-3.5 py-2.5 ${
                isUser ? 'rounded-br-md' : 'rounded-bl-md border border-slate-600/60'
              }`}
              style={
                isUser
                  ? { backgroundColor: '#9333ea' }
                  : { backgroundColor: 'rgba(30, 41, 59, 0.95)' }
              }
            >
              <Text
                className={`text-[15px] leading-[22px] ${
                  isUser ? 'text-white' : 'text-slate-100'
                }`}
                selectable
              >
                {String(item.text ?? '').replace(/\u200b/g, '')}
              </Text>
            </View>
            <Text className={`text-[10px] text-slate-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
              {formatTime(item.timestamp)}
            </Text>
          </View>
          {isUser && (
            <View className="w-8 h-8 bg-white/10 rounded-full items-center justify-center mb-1">
              <User size={16} color="white" />
            </View>
          )}
        </View>
      );
    },
    []
  );

  return (
    <View className="flex-1 bg-transparent min-h-0">
      {/*
        No envolver FlatList en Pressable: roba el pan del scroll vertical.
        Cerrar teclado al empezar a deslizar o con keyboardDismissMode.
      */}
      <FlatList
        ref={flatRef}
        style={{ flex: 1 }}
        data={data}
        inverted
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        showsVerticalScrollIndicator
        scrollEventThrottle={16}
        onScrollBeginDrag={() => Keyboard.dismiss()}
        nestedScrollEnabled
        removeClippedSubviews={Platform.OS !== 'web'}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 12,
          paddingTop: 12,
          paddingBottom: 12,
        }}
      />

      {isAwaitingAi && (
        <View className="px-3 pb-1 flex-row justify-start">
          <View className="bg-slate-800/90 border border-slate-700/50 rounded-xl px-3 py-2.5 flex-row items-center gap-3 max-w-[90%]">
            <ChatTypingDots />
            <Text className="text-slate-400 text-xs">Generando respuesta…</Text>
          </View>
        </View>
      )}

      <View
        className="border-t border-slate-700/50 bg-[rgba(15,23,42,0.92)] px-2 pt-2"
        style={{ paddingBottom: Math.max(insets.bottom, 10) }}
      >
        <View className="flex-row items-end gap-2 px-2">
          <TextInput
            placeholder="Escribe tu mensaje..."
            placeholderTextColor="#64748b"
            className="flex-1 rounded-2xl border border-slate-600 px-4 py-3 text-white bg-slate-800/90 text-[15px]"
            style={{ minHeight: inputMinHeight, maxHeight: 120 }}
            multiline
            maxLength={8000}
            value={draft}
            editable={!isAwaitingAi}
            onChangeText={setDraft}
            onSubmitEditing={() => {
              if (Platform.OS !== 'web') sendDraft();
            }}
            blurOnSubmit={false}
          />
          <Pressable
            onPress={sendDraft}
            disabled={isAwaitingAi || !draft.trim()}
            className="mb-1 active:opacity-80"
            hitSlop={8}
          >
            <LinearGradient
              colors={['#9333ea', '#7e22ce']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 14, opacity: draft.trim() && !isAwaitingAi ? 1 : 0.55 }}
            >
              <Text className="text-white font-semibold text-sm px-4 py-3">Enviar</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
