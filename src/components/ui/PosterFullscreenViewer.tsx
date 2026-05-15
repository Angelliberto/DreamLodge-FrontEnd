import { Image } from 'expo-image';
import { X } from 'lucide-react-native';
import React, { useCallback, useEffect } from 'react';
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type PosterFullscreenViewerProps = {
  visible: boolean;
  uri: string;
  onClose: () => void;
};

export function PosterFullscreenViewer({ visible, uri, onClose }: PosterFullscreenViewerProps) {
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const screen = Dimensions.get('screen');
  const W = Math.max(winW, screen.width);
  const H = Math.max(winH, screen.height);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  const pinchStartScale = useSharedValue(1);
  const panStartTx = useSharedValue(0);
  const panStartTy = useSharedValue(0);

  const resetTransforms = useCallback(() => {
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTx.value = 0;
    savedTy.value = 0;
  }, [scale, savedScale, translateX, translateY, savedTx, savedTy]);

  useEffect(() => {
    if (!visible) {
      resetTransforms();
    }
  }, [visible, resetTransforms]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (visible) {
      StatusBar.setHidden(true, 'fade');
      return () => StatusBar.setHidden(false, 'fade');
    }
    return undefined;
  }, [visible]);

  const close = useCallback(() => {
    resetTransforms();
    onClose();
  }, [onClose, resetTransforms]);

  const pinch = Gesture.Pinch()
    .onStart(() => {
      pinchStartScale.value = savedScale.value;
    })
    .onUpdate((e) => {
      scale.value = Math.min(4, Math.max(1, pinchStartScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= 1.02) {
        scale.value = withTiming(1);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedScale.value = 1;
        savedTx.value = 0;
        savedTy.value = 0;
      }
    });

  const pan = Gesture.Pan()
    .onStart(() => {
      panStartTx.value = translateX.value;
      panStartTy.value = translateY.value;
    })
    .onUpdate((e) => {
      if (scale.value > 1.02) {
        translateX.value = panStartTx.value + e.translationX;
        translateY.value = panStartTy.value + e.translationY;
      }
    })
    .onEnd((e) => {
      if (scale.value > 1.02) {
        savedTx.value = translateX.value;
        savedTy.value = translateY.value;
      } else if (e.translationY > 100 && Math.abs(e.velocityY ?? 0) > 400) {
        runOnJS(close)();
      }
    });

  const composed = Gesture.Simultaneous(pinch, pan);

  const imageAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  if (!uri) return null;

  if (Platform.OS === 'web') {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
        <View style={[styles.root, { width: W, height: H, backgroundColor: '#000' }]}>
          <View style={styles.webImageWrap} pointerEvents="box-none">
            <Image source={{ uri }} style={{ width: W, height: H }} contentFit="contain" />
          </View>
          <Pressable
            onPress={close}
            style={[styles.closeBtn, { top: Math.max(insets.top, 12), right: 16 }]}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
          >
            <X size={22} color="#fff" />
          </Pressable>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={close}
    >
      <GestureHandlerRootView style={{ flex: 1, width: W, height: H, backgroundColor: '#000' }}>
        <GestureDetector gesture={composed}>
          <Animated.View style={[styles.centerBox, { width: W, height: H }, imageAnimStyle]}>
            <Image
              source={{ uri }}
              style={{ width: W, height: H }}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
          </Animated.View>
        </GestureDetector>

        <Pressable
          onPress={close}
          style={[styles.closeBtn, { top: Math.max(insets.top, 12), right: 16 }]}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
        >
          <X size={22} color="#fff" />
        </Pressable>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webImageWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
