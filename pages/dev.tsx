import { createRoute } from '@granite-js/react-native';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useGame } from '../stores/GameContext';
import { fetchLeaderboard, getStoredUserKey, getUuid, SERVER_URL, serverEnabled } from '../src/server';
import { LOGIN_ENABLED } from '../src/login';

export const Route = createRoute('/dev', { component: DevPage });

// 개발 패널 — 출시 전 임의 제거 금지 (사용자 명시 지시 시에만 정리)
const BG = '#191F28';

function DevPage() {
  const {
    coins,
    freeLeft,
    adLeft,
    coinLeft,
    totalPlays,
    todayBest,
    scoreBonusAvailable,
    hasPass,
    passUntil,
    nickname,
    isLoggedIn,
    devAddCoins,
    devResetDaily,
    devAddTotalPlays,
    devTogglePass,
    devResetAll,
  } = useGame();

  const [uuid, setUuid] = useState('');
  const [userKey, setUserKey] = useState<string | null>(null);

  useEffect(() => {
    getUuid().then(setUuid);
    getStoredUserKey().then(setUserKey);
  }, []);

  const testServer = async () => {
    if (!serverEnabled()) {
      Alert.alert('서버 비활성', 'SERVER_URL이 비어 있어요. src/server.ts에서 설정하세요.');
      return;
    }
    const res = await fetchLeaderboard();
    Alert.alert('서버 응답', res ? JSON.stringify(res).slice(0, 400) : '응답 없음 (실패)');
  };

  return (
    <View style={s.root}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <Text style={s.title}>DEV PANEL</Text>

        <View style={s.card}>
          <Text style={s.row}>코인: {coins}</Text>
          <Text style={s.row}>판수: 무료 {freeLeft} / 광고 {adLeft} / 코인 {coinLeft}</Text>
          <Text style={s.row}>누적 판수: {totalPlays}</Text>
          <Text style={s.row}>오늘 최고: {todayBest} (보너스 대기 {scoreBonusAvailable})</Text>
          <Text style={s.row}>닉네임: {nickname || '(없음)'}</Text>
          <Text style={s.row}>패스: {hasPass ? `ON ~${new Date(passUntil).toLocaleDateString()}` : 'OFF'}</Text>
          <Text style={s.row}>
            토스로그인: {isLoggedIn ? '✅ 로그인됨' : '❌ 미로그인'} (기능 {LOGIN_ENABLED ? 'ON' : 'OFF'})
          </Text>
          <Text style={s.rowSmall}>userKey: {userKey ?? '(없음)'}</Text>
          <Text style={s.rowSmall}>식별자: {userKey ? `u:${userKey}` : uuid}</Text>
          <Text style={s.rowSmall}>server: {SERVER_URL || '(미설정)'}</Text>
        </View>

        <DevBtn label="+100 코인" onPress={() => devAddCoins(100)} />
        <DevBtn label="+1000 코인" onPress={() => devAddCoins(1000)} />
        <DevBtn label="일일 데이터 리셋 (판수/최고점/보너스)" onPress={devResetDaily} />
        <DevBtn label="누적 판수 +50" onPress={() => devAddTotalPlays(50)} />
        <DevBtn label="패스 토글 (30일)" onPress={devTogglePass} />
        <DevBtn label="랭킹 서버 테스트" onPress={testServer} />
        <DevBtn
          label="전체 데이터 초기화"
          danger
          onPress={() =>
            Alert.alert('전체 초기화', '모든 데이터를 삭제할까요?', [
              { text: '취소', style: 'cancel' },
              { text: '삭제', style: 'destructive', onPress: () => devResetAll() },
            ])
          }
        />
      </ScrollView>
    </View>
  );
}

function DevBtn({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity style={[s.btn, danger && s.btnDanger]} onPress={onPress} activeOpacity={0.8}>
      <Text style={s.btnTxt}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 8, paddingBottom: 32 },
  title: { color: '#4ADE80', fontSize: 16, fontWeight: '900', marginBottom: 4 },
  card: { backgroundColor: '#27313F', borderRadius: 12, padding: 14, gap: 4, marginBottom: 8 },
  row: { color: '#E5E8EB', fontSize: 13 },
  rowSmall: { color: '#8B95A1', fontSize: 10 },
  btn: { backgroundColor: '#333D4B', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnDanger: { backgroundColor: '#7F1D1D' },
  btnTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
