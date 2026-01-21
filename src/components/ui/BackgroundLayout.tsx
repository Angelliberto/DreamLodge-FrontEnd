import React from 'react';
import { View, StyleSheet, StatusBar, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export const BackgroundLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* 1. Fondo base Negro Profundo (Slate 950) */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#020617' }]} />

      {/* 2. Orbe Superior Izquierdo (Púrpura) */}
      <View style={[styles.orbPosition, { top: -150, left: -100 }]}>
        <LinearGradient
          colors={['rgba(147, 51, 234, 0.4)', 'transparent']}
          style={styles.orb}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
        />
      </View>

      {/* 3. Orbe Centro Derecho (Rosa Fucsia) */}
      <View style={[styles.orbPosition, { top: height * 0.2, right: -150 }]}>
        <LinearGradient
          colors={['rgba(236, 72, 153, 0.3)', 'transparent']}
          style={styles.orb}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 0, y: 1 }}
        />
      </View>

      {/* 4. Orbe Inferior (Azul) */}
      <View style={[styles.orbPosition, { bottom: -100, left: -50 }]}>
        <LinearGradient
          colors={['rgba(59, 130, 246, 0.3)', 'transparent']}
          style={styles.orb}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 0 }}
        />
      </View>

      {/* Contenido principal */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  orbPosition: {
    position: 'absolute',
    width: 600,
    height: 600,
  },
  orb: {
    width: '100%',
    height: '100%',
    borderRadius: 300,
    opacity: 0.6,
  },
  content: {
    flex: 1,
    zIndex: 10,
  }
});