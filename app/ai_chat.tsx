import { LinearGradient } from 'expo-linear-gradient';
import { Bot, Menu, Send, Sparkles, User, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNavigation } from '../src/components/BottomNavigation';
import { ContextTab } from '../src/components/chat/ContextTab';
import { ConversationList } from '../src/components/chat/ConversationList';
import { BackgroundLayout } from '../src/components/ui/BackgroundLayout';
import {
  addContextItemsToConversation,
  createConversation,
  deleteConversation,
  getConversations,
  getMessages,
  loadCurrentConversation,
  removeContextItemFromConversation,
  sendMessage,
  setCurrentConversation,
  subscribeToConnectionStatus,
  subscribeToMessages
} from '../src/services/chat/chatService';
import { ChatConnectionStatus, ChatConversation, ChatMessage } from '../src/types/chat';
import { CulturalItem } from '../src/types/CulturalItem';

export default function AIChatScreen() {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [currentConversation, setCurrentConversationState] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatusState] = useState<ChatConnectionStatus>('disconnected');
  const [showContextTab, setShowContextTab] = useState(false);
  const [showConversationList, setShowConversationList] = useState(false);
  const [selectedContextItems, setSelectedContextItems] = useState<CulturalItem[]>([]);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const messagesEndRef = useRef<View>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const insets = useSafeAreaInsets();
  
  // Bottom navigation height (icon 24px + text ~12px + padding ~16px + safe area)
  const BOTTOM_NAV_HEIGHT = 70 + insets.bottom;

  // Load conversations and restore current conversation on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Load messages and context items when conversation changes
  useEffect(() => {
    const updateConversation = async () => {
    if (currentConversation) {
      loadMessages(currentConversation.id);
        await setCurrentConversation(currentConversation.id);
        // Load context items from the conversation
        setSelectedContextItems(currentConversation.contextItems || []);
    } else {
      setMessages([]);
        await setCurrentConversation(null);
        setSelectedContextItems([]);
    }
    };
    updateConversation();
  }, [currentConversation?.id]);

  // Subscribe to real-time message updates
  useEffect(() => {
    if (!currentConversation) return;

    const unsubscribe = subscribeToMessages(currentConversation.id, (newMessage) => {
      setMessages(prev => {
        // Avoid duplicates
        if (prev.some(msg => msg.id === newMessage.id)) {
          return prev;
        }
        return [...prev, newMessage];
      });
      scrollToBottom();
    });

    return unsubscribe;
  }, [currentConversation?.id]);

  // Subscribe to connection status
  useEffect(() => {
    const unsubscribe = subscribeToConnectionStatus((status) => {
      setConnectionStatusState(status);
    });

    return unsubscribe;
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle keyboard show/hide
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    
    const keyboardWillShow = Keyboard.addListener(showEvent, (e) => {
      // Use the keyboard height to position input above it
      setKeyboardHeight(e.endCoordinates.height);
    });
    
    const keyboardWillHide = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const loadConversations = async () => {
    try {
      const convs = await getConversations();
      setConversations(convs);
      
      // If there are conversations, try to restore the last one
      if (convs.length > 0) {
        // First, try to load the persisted current conversation
        const persistedConversationId = await loadCurrentConversation();
        if (persistedConversationId) {
          const persistedConv = convs.find(c => c.id === persistedConversationId);
          if (persistedConv) {
            setCurrentConversationState(persistedConv);
            // Load context items from the persisted conversation
            setSelectedContextItems(persistedConv.contextItems || []);
            return;
          }
        }
        
        // If no persisted conversation or it doesn't exist, use the most recent one
        if (!currentConversation) {
          const mostRecent = convs[0]; // Conversations are sorted by most recent
          setCurrentConversationState(mostRecent);
          // Load context items from the most recent conversation
          setSelectedContextItems(mostRecent.contextItems || []);
        } else {
          // Update current conversation if it still exists
        const updated = convs.find(c => c.id === currentConversation.id);
        if (updated) {
          setCurrentConversationState(updated);
            // Update context items from the updated conversation
            setSelectedContextItems(updated.contextItems || []);
          } else {
            // Current conversation was deleted, use most recent
            const mostRecent = convs[0];
            setCurrentConversationState(mostRecent);
            setSelectedContextItems(mostRecent.contextItems || []);
          }
        }
      } else {
        // No conversations, clear current conversation
        setCurrentConversationState(null);
        await setCurrentConversation(null);
        setSelectedContextItems([]);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const msgs = await getMessages(conversationId);
      setMessages(msgs);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleNewConversation = async () => {
    try {
      const newConv = await createConversation();
      setConversations(prev => [newConv, ...prev]);
      setCurrentConversationState(newConv);
      await setCurrentConversation(newConv.id);
      setSelectedContextItems([]);
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
      setSelectedContextItems(conv.contextItems || []);
      setShowConversationList(false);
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await deleteConversation(conversationId);
      const updatedConversations = conversations.filter(c => c.id !== conversationId);
      setConversations(updatedConversations);
      
      if (currentConversation?.id === conversationId) {
        // If we deleted the current conversation, switch to the most recent one or clear
        if (updatedConversations.length > 0) {
          const mostRecent = updatedConversations[0];
          setCurrentConversationState(mostRecent);
          await setCurrentConversation(mostRecent.id);
        } else {
        setCurrentConversationState(null);
          await setCurrentConversation(null);
        }
        setMessages([]);
        setSelectedContextItems([]);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !currentConversation || isLoading) return;

    const text = inputText.trim();
    setInputText('');
    setIsLoading(true);

    try {
      // Use context items from the conversation (which should match selectedContextItems)
      const contextItemsToUse = currentConversation.contextItems || selectedContextItems;

      // Send message (this will add both user and AI messages)
      await sendMessage(
        currentConversation.id,
        text,
        contextItemsToUse.length > 0 ? contextItemsToUse : undefined
      );

      // Reload messages to get the latest
      await loadMessages(currentConversation.id);
      
      // Reload conversations to update message count
      await loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      setConnectionStatusState('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContextItemSelect = async (item: CulturalItem) => {
    if (!currentConversation) return;
    
    // Check if item is already in the list
    if (selectedContextItems.some(i => i.id === item.id)) {
      return;
      }
    
    const updatedItems = [...selectedContextItems, item];
    setSelectedContextItems(updatedItems);
    
    // Persist to conversation
    await addContextItemsToConversation(currentConversation.id, [item]);
    
    // Reload conversations to update state
    await loadConversations();
  };

  const handleContextItemRemove = async (itemId: string) => {
    if (!currentConversation) return;
    
    const updatedItems = selectedContextItems.filter(item => item.id !== itemId);
    setSelectedContextItems(updatedItems);
    
    // Persist removal to conversation
    await removeContextItemFromConversation(currentConversation.id, itemId);
    
    // Reload conversations to update state
    await loadConversations();
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.setNativeProps({});
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const getConnectionStatusColor = (): string => {
    switch (connectionStatus) {
      case 'connected':
        return '#10b981'; // green
      case 'connecting':
        return '#f59e0b'; // amber
      case 'error':
        return '#ef4444'; // red
      default:
        return '#64748b'; // slate
    }
  };

  return (
    <BackgroundLayout>
      <SafeAreaView className="flex-1" edges={['top']}>
        <StatusBar barStyle="light-content" />
        
        {/* Main Chat Area */}
        <KeyboardAvoidingView 
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View className="flex-1">
            {/* Header */}
            <View className="px-4 pt-3 pb-3 border-b border-slate-800/50 bg-slate-900/50">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3 flex-1">
                    <TouchableOpacity
                      onPress={() => setShowConversationList(!showConversationList)}
                      className="p-2"
                    >
                      <Menu size={20} color="white" />
                    </TouchableOpacity>
                    <View className="flex-row items-center gap-2 flex-1">
                      <LinearGradient
                        colors={['#a855f7', '#ec4899']}
                        className="w-7 h-7 rounded-lg items-center justify-center"
                      >
                        <Sparkles size={14} color="white" />
                      </LinearGradient>
                      <View className="flex-1">
                        <Text className="text-white font-bold text-base">
                          {currentConversation?.title || 'Chat con IA'}
                        </Text>
                        <View className="flex-row items-center gap-2">
                          <View
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: getConnectionStatusColor() }}
                          />
                          <Text className="text-slate-400 text-xs">
                            {connectionStatus === 'connected' && 'Conectado'}
                            {connectionStatus === 'connecting' && 'Conectando...'}
                            {connectionStatus === 'disconnected' && 'Desconectado'}
                            {connectionStatus === 'error' && 'Error de conexión'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowContextTab(!showContextTab)}
                    className={`p-2 rounded-lg ${
                      showContextTab ? 'bg-purple-600/20' : 'bg-slate-800/50'
                    }`}
                  >
                    <Text className="text-purple-400 text-xs font-semibold">
                      {selectedContextItems.length > 0 ? `${selectedContextItems.length} ` : ''}Contexto
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Conversation List Sidebar - Overlay */}
              {showConversationList && (
                <>
                  <TouchableOpacity
                    className="absolute inset-0 bg-black/50 z-40"
                    onPress={() => setShowConversationList(false)}
                    activeOpacity={1}
                  />
                  <View className="absolute left-0 top-0 bottom-0 w-80 bg-slate-900 border-r border-slate-800 z-50">
                    <SafeAreaView className="flex-1" edges={['top']}>
                      <View className="flex-row items-center justify-between p-4 border-b border-slate-800">
                        <Text className="text-white font-bold text-lg">Conversaciones</Text>
                        <TouchableOpacity onPress={() => setShowConversationList(false)}>
                          <X size={24} color="white" />
                        </TouchableOpacity>
                      </View>
                      <ConversationList
                        conversations={conversations}
                        currentConversationId={currentConversation?.id || null}
                        onSelectConversation={handleSelectConversation}
                        onNewConversation={handleNewConversation}
                        onDeleteConversation={handleDeleteConversation}
                      />
                    </SafeAreaView>
                  </View>
                </>
              )}

              {/* Context Tab Sidebar - Overlay */}
              {showContextTab && (
                <>
                  <TouchableOpacity
                    className="absolute inset-0 bg-black/50 z-40"
                    onPress={() => setShowContextTab(false)}
                    activeOpacity={1}
                  />
                  <View className="absolute right-0 top-0 bottom-0 w-80 bg-slate-900 border-l border-slate-800 z-50">
                    <SafeAreaView className="flex-1" edges={['top']}>
                      <View className="flex-row items-center justify-between p-4 border-b border-slate-800">
                        <Text className="text-white font-semibold text-lg">Contexto de Conversación</Text>
                        <TouchableOpacity onPress={() => setShowContextTab(false)}>
                          <X size={24} color="white" />
                        </TouchableOpacity>
                      </View>
                      <ContextTab
                        selectedItems={selectedContextItems}
                        onItemSelect={handleContextItemSelect}
                        onItemRemove={handleContextItemRemove}
                      />
                    </SafeAreaView>
                  </View>
                </>
              )}

              {/* Messages Area - Scrollable */}
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
              ) : (
                <ScrollView
                  ref={scrollViewRef}
                  className="flex-1"
                  contentContainerStyle={{ 
                    padding: 16, 
                    paddingBottom: 20
                  }}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                >
                  {messages.map((message) => (
                    <View
                      key={message.id}
                      className={`mb-4 flex-row ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {message.sender === 'ai' && (
                        <View className="mr-2 mt-1" style={{ flexShrink: 0 }}>
                          <View className="w-5 h-5 bg-purple-500/20 rounded-full items-center justify-center">
                            <Bot size={12} color="#c084fc" />
                          </View>
                        </View>
                      )}
                      <View
                        className={`rounded-2xl px-4 py-3 ${
                          message.sender === 'user'
                            ? 'bg-purple-600 rounded-br-sm'
                            : 'bg-slate-800/80 border border-slate-700/50 rounded-bl-sm'
                        }`}
                        style={{ maxWidth: '75%' }}
                      >
                            <Text 
                              className={`text-sm leading-5 ${
                                message.sender === 'user' ? 'text-white' : 'text-slate-100'
                              }`}
                            >
                          {message.text || ''}
                            </Text>
                        <Text className={`text-xs mt-1.5 ${
                          message.sender === 'user' ? 'text-purple-200' : 'text-slate-400'
                        }`}>
                          {formatTime(message.timestamp)}
                        </Text>
                      </View>
                      {message.sender === 'user' && (
                        <View className="ml-2 mt-1" style={{ flexShrink: 0 }}>
                          <View className="w-5 h-5 bg-white/10 rounded-full items-center justify-center">
                            <User size={12} color="white" />
                          </View>
                        </View>
                      )}
                    </View>
                  ))}

                  {isLoading && (
                    <View className="mb-4 items-start">
                      <View className="bg-slate-800/80 border border-slate-700/50 rounded-2xl rounded-bl-sm px-4 py-3">
                        <View className="flex-row items-center gap-2">
                          <View className="w-5 h-5 bg-purple-500/20 rounded-full items-center justify-center">
                            <Bot size={12} color="#c084fc" />
                          </View>
                          <ActivityIndicator size="small" color="#c084fc" />
                          <Text className="text-slate-300 text-sm">Escribiendo...</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  <View ref={messagesEndRef} />
                </ScrollView>
              )}

            {/* Input Area - Natural bottom position */}
            {currentConversation && (
              <View 
                className="px-4 pt-2 pb-2 border-t border-slate-800/50 bg-slate-900/50"
                style={{
                  paddingBottom: keyboardHeight === 0 ? BOTTOM_NAV_HEIGHT - insets.bottom : insets.bottom + 8
                }}
              >
                    {/* Selected Context Items Preview */}
                    {selectedContextItems.length > 0 && (
                      <View className="mb-2 flex-row items-center gap-2">
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <View className="flex-row gap-2">
                            {selectedContextItems.map((item) => (
                              <View
                                key={item.id}
                                className="bg-purple-600/20 border border-purple-500/30 rounded-lg px-2 py-1 flex-row items-center gap-1"
                              >
                                <Text className="text-purple-300 text-xs" numberOfLines={1}>
                                  {item.title}
                                </Text>
                                <TouchableOpacity onPress={() => handleContextItemRemove(item.id)}>
                                  <X size={12} color="#c084fc" />
                                </TouchableOpacity>
                              </View>
                            ))}
                          </View>
                        </ScrollView>
                      </View>
                    )}

                    <View className="flex-row items-end gap-2">
                      <View className="flex-1 bg-slate-800/80 border border-slate-700/50 rounded-xl px-4 py-3 max-h-24 min-h-12">
                        <TextInput
                          value={inputText}
                          onChangeText={setInputText}
                          placeholder="Escribe tu mensaje..."
                          placeholderTextColor="#64748b"
                          className="text-white text-sm"
                          style={{ 
                            textAlignVertical: 'center',
                            paddingVertical: 0,
                            minHeight: 24
                          }}
                          multiline
                          onSubmitEditing={handleSend}
                          returnKeyType="send"
                          blurOnSubmit={false}
                          editable={!isLoading}
                        />
                      </View>
                      <TouchableOpacity
                        onPress={handleSend}
                        disabled={!inputText.trim() || isLoading}
                        className={`rounded-xl items-center justify-center ${
                          inputText.trim() && !isLoading
                            ? 'bg-purple-600'
                            : 'bg-slate-700/50'
                        }`}
                        style={{ 
                          width: 48, 
                          height: 48,
                          minHeight: 48
                        }}
                      >
                        <Send size={18} color={inputText.trim() && !isLoading ? 'white' : '#64748b'} />
                      </TouchableOpacity>
                    </View>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
        {keyboardHeight === 0 && <BottomNavigation />}
      </SafeAreaView>
    </BackgroundLayout>
  );
}
