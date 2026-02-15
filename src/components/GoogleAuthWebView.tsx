import { X } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';

interface GoogleAuthWebViewProps {
  visible: boolean;
  authUrl: string;
  onClose: () => void;
  onSuccess: (token: string, userData: string) => void;
}

export function GoogleAuthWebView({ visible, authUrl, onClose, onSuccess }: GoogleAuthWebViewProps) {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);

  const extractTokenAndUser = (url: string) => {
    console.log('🔍 WebView: Extracting token and user from URL:', url);
    
    let token: string | null = null;
    let userData: string | null = null;
    
    // Manual parsing for custom scheme URLs
    // Format: dreamlodgefrontend://auth?token=XXX&user=YYY
    const tokenMatch = url.match(/[?&]token=([^&]+)/);
    if (tokenMatch) {
      token = decodeURIComponent(tokenMatch[1]);
      console.log('✅ WebView: Token extracted');
    }
    
    const userMatch = url.match(/[?&]user=([^&]+)/);
    if (userMatch) {
      userData = decodeURIComponent(userMatch[1]);
      console.log('✅ WebView: User data extracted');
    }
    
    return { token, userData };
  };

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    const { url } = navState;
    console.log('🔗 WebView navigation to:', url);

    // Check if the URL is our deep link
    if (url && url.includes('dreamlodgefrontend://auth')) {
      console.log('✅ WebView: Detected deep link pattern');
      
      try {
        const { token, userData } = extractTokenAndUser(url);

        if (token && userData) {
          console.log('✅ WebView: Token and user data found, calling onSuccess');
          onSuccess(token, userData);
          onClose();
        } else {
          console.error('❌ WebView: Missing token or user data in deep link');
          console.error('Token:', token ? 'Present' : 'Missing');
          console.error('User data:', userData ? 'Present' : 'Missing');
        }
      } catch (error) {
        console.error('❌ WebView: Error parsing deep link:', error);
      }
    }
  };

  const handleShouldStartLoadWithRequest = (request: { url: string }) => {
    const { url } = request;
    console.log('🔗 WebView should start load:', url);

    // If it's our deep link, intercept it
    if (url && url.includes('dreamlodgefrontend://auth')) {
      console.log('✅ WebView: Intercepting deep link in shouldStartLoadWithRequest');
      
      try {
        const { token, userData } = extractTokenAndUser(url);
        
        if (token && userData) {
          console.log('✅ WebView: Token and user data found, calling onSuccess');
          onSuccess(token, userData);
          onClose();
        } else {
          console.error('❌ WebView: Missing token or user data');
        }
      } catch (error) {
        console.error('❌ WebView: Error parsing deep link:', error);
      }
      
      return false; // Prevent WebView from loading the deep link
    }

    return true; // Allow other URLs to load
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header with close button */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Sign in with Google</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* WebView */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#c084fc" />
          </View>
        )}
        <WebView
          ref={webViewRef}
          source={{ uri: authUrl }}
          style={styles.webview}
          onNavigationStateChange={handleNavigationStateChange}
          onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('❌ WebView error:', nativeEvent);
            setLoading(false);
          }}
          // Enable JavaScript
          javaScriptEnabled={true}
          // Enable DOM storage for cookies
          domStorageEnabled={true}
          // Enable third-party cookies (needed for Google OAuth)
          thirdPartyCookiesEnabled={true}
          // Shared cookies
          sharedCookiesEnabled={true}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  closeButton: {
    padding: 8,
  },
  webview: {
    flex: 1,
    backgroundColor: '#020617',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#020617',
    zIndex: 1,
  },
});
