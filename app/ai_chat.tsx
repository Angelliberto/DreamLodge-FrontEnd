import { LinearGradient } from 'expo-linear-gradient';
import { Bot, Send, Sparkles, User } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomNavigation } from '../src/components/BottomNavigation';
import { BackgroundLayout } from '../src/components/ui/BackgroundLayout';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
}

export default function AIChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: '¡Hola! Soy tu asistente de Dream Lodge. Puedo ayudarte a analizar tus experiencias artísticas, reflexionar sobre obras que has visto, o simplemente conversar sobre arte. ¿En qué puedo ayudarte hoy?',
      sender: 'ai',
      timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    // TODO: Implement actual AI chat API call
    // Simulate AI response for now
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Para darte recomendaciones personalizadas, me ayudaría saber qué tipo de emociones o temas te interesan explorar. ¿Hay algo específico que busques en una obra artística?',
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <BackgroundLayout>
      <SafeAreaView className="flex-1" edges={['top']}>
        <StatusBar barStyle="light-content" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* Header */}
          <View className="px-4 pt-3 pb-3 border-b border-slate-800/50">
            <View className="flex-row items-center gap-2 mb-1">
              <LinearGradient
                colors={['#a855f7', '#ec4899']}
                className="w-7 h-7 rounded-lg items-center justify-center"
              >
                <Sparkles size={14} color="white" />
              </LinearGradient>
              <Text className="text-white font-bold text-base">Chat con IA</Text>
            </View>
            <Text className="text-slate-400 text-xs ml-9">
              Conversa sobre tus experiencias artísticas y recibe análisis personalizados
            </Text>
          </View>

          {/* Messages */}
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((message) => (
              <View
                key={message.id}
                className={`mb-4 ${message.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <View
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.sender === 'user'
                      ? 'bg-purple-600 rounded-br-sm'
                      : 'bg-slate-800/80 border border-slate-700/50 rounded-bl-sm'
                  }`}
                >
                  <View className="flex-row items-start gap-2">
                    {message.sender === 'ai' && (
                      <View className="mt-0.5">
                        <View className="w-5 h-5 bg-purple-500/20 rounded-full items-center justify-center">
                          <Bot size={12} color="#c084fc" />
                        </View>
                      </View>
                    )}
                    <View className="flex-1">
                      <Text className={`text-sm leading-5 ${
                        message.sender === 'user' ? 'text-white' : 'text-slate-100'
                      }`}>
                        {message.text}
                      </Text>
                    </View>
                    {message.sender === 'user' && (
                      <View className="mt-0.5">
                        <View className="w-5 h-5 bg-white/10 rounded-full items-center justify-center">
                          <User size={12} color="white" />
                        </View>
                      </View>
                    )}
                  </View>
                  <Text className={`text-xs mt-1.5 ${
                    message.sender === 'user' ? 'text-purple-200' : 'text-slate-400'
                  }`}>
                    {message.timestamp}
                  </Text>
                </View>
              </View>
            ))}

            {isLoading && (
              <View className="mb-4 items-start">
                <View className="bg-slate-800/80 border border-slate-700/50 rounded-2xl rounded-bl-sm px-4 py-3">
                  <View className="flex-row items-center gap-2">
                    <View className="w-5 h-5 bg-purple-500/20 rounded-full items-center justify-center">
                      <Bot size={12} color="#c084fc" />
                    </View>
                    <Text className="text-slate-300 text-sm">Escribiendo...</Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Input Area */}
          <View className="px-4 pt-2 pb-4 border-t border-slate-800/50 bg-slate-900/50">
            <SafeAreaView edges={['bottom']}>
              <View className="flex-row items-end gap-2">
                <View className="flex-1 bg-slate-800/80 border border-slate-700/50 rounded-xl px-4 py-3 max-h-24">
                  <TextInput
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Escribe tu mensaje..."
                    placeholderTextColor="#64748b"
                    className="text-white text-sm"
                    multiline
                    onSubmitEditing={handleSend}
                    returnKeyType="send"
                    blurOnSubmit={false}
                  />
                </View>
                <TouchableOpacity
                  onPress={handleSend}
                  disabled={!inputText.trim() || isLoading}
                  className={`w-12 h-12 rounded-xl items-center justify-center ${
                    inputText.trim() && !isLoading
                      ? 'bg-purple-600'
                      : 'bg-slate-700/50'
                  }`}
                >
                  <Send size={18} color={inputText.trim() && !isLoading ? 'white' : '#64748b'} />
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
        </KeyboardAvoidingView>
        <BottomNavigation />
      </SafeAreaView>
    </BackgroundLayout>
  );
}
