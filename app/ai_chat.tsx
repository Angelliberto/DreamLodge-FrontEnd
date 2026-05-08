import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Bot, Menu, Sparkles, User, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Bubble,
  Composer,
  GiftedChat,
  IMessage,
  InputToolbar,
  Send as GiftedSend,
} from 'react-native-gifted-chat';
import { KeyboardAvoidingView as KeyboardControllerAvoidingView } from 'react-native-keyboard-controller';
import ReanimatedAnimated, {
  FadeIn,
  FadeOut,
  SlideInLeft,
  SlideOutLeft,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomNavigation } from '../src/components/BottomNavigation';
import { ConversationList } from '../src/components/chat/ConversationList';
import { ChatTypingDots } from '../src/components/chat/ChatTypingDots';
import { BackgroundLayout } from '../src/components/ui/BackgroundLayout';
import {
  createConversation,
  deleteConversation,
  getConversations,
  getMessages,
  loadCurrentConversation,
  mergeChatMessagesById,
  sendMessage,
  setCurrentConversation,
  subscribeAiPending,
  isAwaitingAiResponse,
  subscribeToMessages
} from '../src/services/chat/chatService';
import { ChatConversation, ChatMessage } from '../src/types/chat';

function runSoftHaptic() {
  if (Platform.OS !== 'web') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

function runSuccessHaptic() {
  if (Platform.OS !== 'web') {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}

function runErrorHaptic() {
  if (Platform.OS !== 'web') {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }
}

export default function AIChatScreen() {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [currentConversation, setCurrentConversationState] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showConversationList, setShowConversationList] = useState(false);
  const conversationIdRef = useRef<string | undefined>(undefined);
  /** Se incrementa al cambiar peticiones IA en curso (pantalla montada o no). */
  const [aiPendingUiTick, setAiPendingUiTick] = useState(0);

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const msgs = await getMessages(conversationId);
      setMessages((prev) => {
        if (conversationIdRef.current !== conversationId) return prev;
        return mergeChatMessagesById(prev, msgs);
      });
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const convs = await getConversations();
      setConversations(convs);

      if (convs.length > 0) {
        const persistedConversationId = await loadCurrentConversation();
        if (persistedConversationId) {
          const persistedConv = convs.find(c => c.id === persistedConversationId);
          if (persistedConv) {
            setCurrentConversationState(persistedConv);
            return;
          }
        }

        setCurrentConversationState((prev) => {
          if (!prev) return convs[0];
          const updated = convs.find(c => c.id === prev.id);
          return updated || convs[0];
        });
      } else {
        setCurrentConversationState(null);
        await setCurrentConversation(null);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  }, []);

  const conversationId = currentConversation?.id;
  conversationIdRef.current = conversationId;

  /** Solo la conversación abierta: otra conv puede seguir generando en segundo plano sin mostrar el footer aquí. */
  const showTypingIndicator =
    aiPendingUiTick >= 0 &&
    Boolean(conversationId && isAwaitingAiResponse(conversationId));

  useEffect(
    () => subscribeAiPending(() => setAiPendingUiTick((t) => t + 1)),
    []
  );

  /** Al volver a esta pantalla: sincronizar conversaciones y mensajes (sin recarga al salir: evita condiciones de carrera con el envío). */
  useFocusEffect(
    useCallback(() => {
      void loadConversations();
      const cid = conversationIdRef.current;
      if (cid) void loadMessages(cid);
    }, [loadConversations, loadMessages])
  );

  /** Solo reaccionar al id evita recargas al refrescar la misma conversación (objeto nuevo) y condiciones de carrera con la respuesta de la IA. */
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      void setCurrentConversation(null);
      return;
    }

    let cancelled = false;

    void setCurrentConversation(conversationId);
    setMessages([]);

    void (async () => {
      try {
        const msgs = await getMessages(conversationId);
        if (cancelled || conversationIdRef.current !== conversationId) return;
        setMessages(msgs);
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = subscribeToMessages(conversationId, (newMessage) => {
      setMessages((prev) => {
        const i = prev.findIndex((msg) => msg.id === newMessage.id);
        if (i >= 0) {
          const next = [...prev];
          next[i] = newMessage;
          return next.sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        }
        return [...prev, newMessage].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      });
    });

    return unsubscribe;
  }, [conversationId]);

  const handleNewConversation = async () => {
    try {
      const newConv = await createConversation();
      setConversations(prev => [newConv, ...prev]);
      setCurrentConversationState(newConv);
      await setCurrentConversation(newConv.id);
      setShowConversationList(false);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const handleSelectConversation = async (conversationId: string) => {
    const conv = conversations.find(c => c.id === conversationId);
    if (conv) {
      setCurrentConversationState(conv);
      await setCurrentConversation(conversationId);
      setShowConversationList(false);
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await deleteConversation(conversationId);
      const updatedConversations = conversations.filter(c => c.id !== conversationId);
      setConversations(updatedConversations);

      if (currentConversation?.id === conversationId) {
        if (updatedConversations.length > 0) {
          const mostRecent = updatedConversations[0];
          setCurrentConversationState(mostRecent);
          await setCurrentConversation(mostRecent.id);
        } else {
          setCurrentConversationState(null);
          await setCurrentConversation(null);
        }
        setMessages([]);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const handleSend = useCallback(async (textFromInput?: string) => {
    if (!currentConversation) return;
    if (isAwaitingAiResponse(currentConversation.id)) return;
    const text = String(textFromInput ?? '').trim();
    if (!text) return;

    runSoftHaptic();

    const conversationIdSending = currentConversation.id;

    try {
      const aiMsg = await sendMessage(
        conversationIdSending,
        text,
        undefined,
        currentConversation.title
      );
      const failed = Boolean(aiMsg?.text?.trim().startsWith('Error:'));
      if (failed) {
        runErrorHaptic();
      } else {
        runSuccessHaptic();
      }
      if (conversationIdRef.current === conversationIdSending) {
        await loadMessages(conversationIdSending);
      }
      await loadConversations();
    } catch (error: any) {
      const aborted =
        error?.code === 'ERR_CANCELED' ||
        error?.name === 'AbortError' ||
        error?.name === 'CanceledError';
      if (!aborted) {
        runErrorHaptic();
        console.error('Error sending message:', error);
      }
    }
  }, [currentConversation, loadConversations, loadMessages]);

  const giftedMessages: IMessage[] = useMemo(() => (
    messages
      .map((message) => ({
        _id: message.id,
        text: message.text || '',
        createdAt: message.timestamp,
        user: message.sender === 'user'
          ? { _id: 'user', name: 'Tú' }
          : { _id: 'ai', name: 'Dream Lodge IA' },
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  ), [messages]);

  const handleGiftedSend = useCallback((newMessages: IMessage[] = []) => {
    const text = String(newMessages[0]?.text || '').trim();
    if (!text) return;
    handleSend(text);
  }, [handleSend]);

  const displayConversation = useMemo(
    () =>
      conversationId
        ? conversations.find((c) => c.id === conversationId) ?? currentConversation
        : currentConversation,
    [conversationId, conversations, currentConversation],
  );

  const renderTypingFooter = useCallback(
    () =>
      showTypingIndicator ? (
        <View className="px-3 py-2">
          <View className="bg-slate-800/90 border border-slate-700/50 rounded-xl px-3 py-2.5 self-start flex-row items-center gap-3">
            <ChatTypingDots />
            <Text className="text-slate-400 text-xs">Generando respuesta...</Text>
          </View>
        </View>
      ) : null,
    [showTypingIndicator],
  );

  const chatListProps = useMemo(
    () =>
      ({
        keyboardShouldPersistTaps: 'handled',
        ...(Platform.OS === 'ios'
          ? { keyboardDismissMode: 'interactive' as const }
          : Platform.OS !== 'web'
            ? { keyboardDismissMode: 'on-drag' as const }
            : {}),
        showsVerticalScrollIndicator: false,
      }) as const,
    [],
  );

  const chatKeyboardInner = (
            <View className="flex-1">
            {conversations.length === 0 ? (
              <View className="flex-1 items-center justify-center px-4">
                <LinearGradient
                  colors={['#a855f7', '#ec4899']}
                  className="w-20 h-20 rounded-2xl items-center justify-center mb-4"
                >
                  <Sparkles size={32} color="white" />
                </LinearGradient>
                <Text className="text-white font-bold text-xl mb-2 text-center">
                  ¡Bienvenido al Chat con IA!
                </Text>
                <Text className="text-slate-400 text-center mb-6">
                  Crea una nueva conversación para comenzar a chatear sobre tus experiencias artísticas
                </Text>
                <TouchableOpacity
                  onPress={handleNewConversation}
                  className="bg-purple-600 rounded-xl px-6 py-3"
                >
                  <Text className="text-white font-semibold">Nueva Conversación</Text>
                </TouchableOpacity>
              </View>
            ) : currentConversation ? (
              <View className="flex-1 min-h-0">
              <GiftedChat
                key={currentConversation.id}
                messages={giftedMessages}
                user={{ _id: 'user', name: 'Tú' }}
                onSend={handleGiftedSend}
                isTyping={showTypingIndicator}
                isAvatarVisibleForEveryMessage={false}
                isSendButtonAlwaysVisible
                listProps={chatListProps}
                keyboardAvoidingViewProps={{ enabled: false }}
                renderAvatar={(props) => (
                  props.currentMessage?.user._id === 'ai' ? (
                    <View className="w-6 h-6 bg-purple-500/20 rounded-full items-center justify-center">
                      <Bot size={12} color="#c084fc" />
                    </View>
                  ) : (
                    <View className="w-6 h-6 bg-white/10 rounded-full items-center justify-center">
                      <User size={12} color="white" />
                    </View>
                  )
                )}
                renderBubble={(props) => (
                  <Bubble
                    {...props}
                    wrapperStyle={{
                      right: {
                        backgroundColor: '#9333ea',
                        borderBottomRightRadius: 8,
                      },
                      left: {
                        backgroundColor: 'rgba(30, 41, 59, 0.9)',
                        borderColor: 'rgba(71, 85, 105, 0.6)',
                        borderWidth: 1,
                        borderBottomLeftRadius: 8,
                      },
                    }}
                    textStyle={{
                      right: { color: '#ffffff' },
                      left: { color: '#e2e8f0' },
                    }}
                  />
                )}
                renderInputToolbar={(props) => (
                  <InputToolbar
                    {...props}
                    containerStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.85)',
                      borderTopWidth: 1,
                      borderTopColor: 'rgba(51, 65, 85, 0.6)',
                      paddingTop: 8,
                      paddingBottom: 8,
                      paddingHorizontal: 8,
                    }}
                    primaryStyle={{ alignItems: 'center' }}
                  />
                )}
                renderComposer={(props) => (
                  <Composer
                    {...props}
                    textInputProps={{
                      ...props.textInputProps,
                      editable: !showTypingIndicator,
                      placeholder: 'Escribe tu mensaje...',
                      placeholderTextColor: '#64748b',
                      style: [
                        props.textInputProps?.style,
                        {
                          color: '#ffffff',
                          backgroundColor: 'rgba(30, 41, 59, 0.9)',
                          borderColor: 'rgba(71, 85, 105, 0.7)',
                          borderWidth: 1,
                          borderRadius: 14,
                          paddingHorizontal: 12,
                          marginRight: 8,
                          maxHeight: 120,
                        },
                      ],
                    }}
                  />
                )}
                renderSend={(props) => (
                  <GiftedSend
                    {...props}
                    containerStyle={{ justifyContent: 'center', marginBottom: 2, marginRight: 4 }}
                  >
                    <LinearGradient
                      colors={['#9333ea', '#7e22ce']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ borderRadius: 12, opacity: props.text?.trim()?.length ? 1 : 0.55 }}
                    >
                      <View className="px-4 py-2.5">
                        <Text className="text-white font-semibold text-sm">Enviar</Text>
                      </View>
                    </LinearGradient>
                  </GiftedSend>
                )}
                renderFooter={renderTypingFooter}
              />
              </View>
            ) : (
              <View className="flex-1 items-center justify-center px-6">
                <Text className="text-slate-300 text-center">
                  Selecciona una conversación para continuar.
                </Text>
              </View>
            )}
            <BottomNavigation useAbsolutePosition={false} />
            </View>
  );

  return (
    <BackgroundLayout>
      <SafeAreaView className="flex-1" edges={['top']}>
        <StatusBar barStyle="light-content" />

        <View className="flex-1">
          <View className="px-4 pt-3 pb-3 border-b border-slate-800/50 bg-slate-900/50">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1">
                <Pressable
                  onPress={() => {
                    const next = !showConversationList;
                    if (next && Platform.OS !== 'web') {
                      void Haptics.selectionAsync();
                    }
                    setShowConversationList(next);
                  }}
                  className="p-2 rounded-xl active:bg-white/10"
                >
                  <Menu size={20} color="white" />
                </Pressable>
                <View className="flex-row items-center gap-2 flex-1">
                  <LinearGradient
                    colors={['#a855f7', '#ec4899']}
                    className="w-7 h-7 rounded-lg items-center justify-center"
                  >
                    <Sparkles size={14} color="white" />
                  </LinearGradient>
                  <View className="flex-1">
                    <Text className="text-white font-bold text-base">
                      {displayConversation?.title || 'Chat con IA'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {showConversationList && (
            <>
              {Platform.OS === 'web' ? (
                <Pressable
                  style={[StyleSheet.absoluteFillObject, { zIndex: 40 }]}
                  onPress={() => setShowConversationList(false)}
                >
                  <View className="absolute inset-0 bg-black/55" />
                </Pressable>
              ) : (
                <ReanimatedAnimated.View
                  entering={FadeIn.duration(200)}
                  exiting={FadeOut.duration(160)}
                  style={[StyleSheet.absoluteFillObject, { zIndex: 40 }]}
                >
                  <Pressable
                    style={StyleSheet.absoluteFillObject}
                    onPress={() => setShowConversationList(false)}
                  >
                    <BlurView
                      tint="dark"
                      intensity={34}
                      style={StyleSheet.absoluteFillObject}
                    />
                  </Pressable>
                </ReanimatedAnimated.View>
              )}
              <ReanimatedAnimated.View
                entering={SlideInLeft.duration(280)}
                exiting={SlideOutLeft.duration(200)}
                style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 320, zIndex: 50 }}
                className="bg-slate-900 border-r border-slate-800"
              >
                <SafeAreaView className="flex-1" edges={['top']}>
                  <View className="flex-row items-center justify-between p-4 border-b border-slate-800">
                    <Text className="text-white font-bold text-lg">Conversaciones</Text>
                    <Pressable
                      onPress={() => {
                        if (Platform.OS !== 'web') {
                          void Haptics.selectionAsync();
                        }
                        setShowConversationList(false);
                      }}
                      hitSlop={12}
                      className="p-1 rounded-lg active:bg-white/10"
                    >
                      <X size={24} color="white" />
                    </Pressable>
                  </View>
                  <ConversationList
                    conversations={conversations}
                    currentConversationId={currentConversation?.id || null}
                    onSelectConversation={handleSelectConversation}
                    onNewConversation={handleNewConversation}
                    onDeleteConversation={handleDeleteConversation}
                  />
                </SafeAreaView>
              </ReanimatedAnimated.View>
            </>
          )}

          {Platform.OS === 'web' ? (
            <KeyboardAvoidingView
              className="flex-1"
              behavior="padding"
              keyboardVerticalOffset={0}
            >
              {chatKeyboardInner}
            </KeyboardAvoidingView>
          ) : (
            <KeyboardControllerAvoidingView
              behavior="translate-with-padding"
              style={{ flex: 1 }}
              keyboardVerticalOffset={0}
            >
              {chatKeyboardInner}
            </KeyboardControllerAvoidingView>
          )}
        </View>
      </SafeAreaView>
    </BackgroundLayout>
  );
}
