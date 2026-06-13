import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { FlagState } from '../data/commands';

const BLUE = '#1B64DA';

// 청기/백기 시각화 — 깃대 2개와 깃발 위치(올림/내림)
export function Flags({ state, height = 120 }: { state: FlagState; height?: number }) {
  return (
    <View style={[s.row, { height }]}>
      <Pole up={state.blue} color={BLUE} height={height} />
      <Pole up={state.white} color="#FFFFFF" height={height} bordered />
    </View>
  );
}

function Pole({ up, color, height, bordered }: { up: boolean; color: string; height: number; bordered?: boolean }) {
  const flagTop = up ? 0 : height * 0.45;
  return (
    <View style={[s.poleWrap, { height }]}>
      <View style={[s.pole, { height }]} />
      <View
        style={[
          s.flag,
          { backgroundColor: color, top: flagTop },
          bordered && s.flagBorder,
        ]}
      />
      <View style={s.poleBase} />
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 56,
  },
  poleWrap: {
    width: 64,
    alignItems: 'flex-start',
  },
  pole: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 5,
    borderRadius: 3,
    backgroundColor: '#B0B8C1',
  },
  flag: {
    position: 'absolute',
    left: 5,
    width: 52,
    height: 36,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  flagBorder: {
    borderWidth: 1.5,
    borderColor: '#D1D6DB',
  },
  poleBase: {
    position: 'absolute',
    left: -6,
    bottom: -4,
    width: 17,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8B95A1',
  },
});
