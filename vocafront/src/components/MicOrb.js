import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const SIZE = 132;

export default function MicOrb({ active, busy, disabled, onPressIn, onPressOut }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active && !busy) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, busy, pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const haloOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.6],
  });

  const tint = active ? '#ff5577' : busy ? '#5b8bff' : '#7dd3fc';

  return (
    <Pressable
      onPressIn={disabled ? undefined : onPressIn}
      onPressOut={disabled ? undefined : onPressOut}
      hitSlop={24}
      style={styles.touch}
    >
      <Animated.View
        style={[
          styles.halo,
          { backgroundColor: tint, opacity: haloOpacity, transform: [{ scale }] },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          {
            borderColor: tint,
            transform: [{ scale: active ? scale : 1 }],
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <View style={styles.inner}>
          <Text style={[styles.icon, { color: tint }]}>🎙</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touch: {
    width: SIZE + 60,
    height: SIZE + 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: SIZE + 40,
    height: SIZE + 40,
    borderRadius: (SIZE + 40) / 2,
  },
  orb: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 3,
    backgroundColor: '#111522',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: SIZE - 24,
    height: SIZE - 24,
    borderRadius: (SIZE - 24) / 2,
    backgroundColor: '#0b0d12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 56,
  },
});
