import { createRoute } from '@granite-js/react-native';
import React, { useRef } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export const Route = createRoute('/info', { component: InfoPage });

export const APP_VERSION = '1.5.0';

const PRIMARY = '#1B64DA';
const BG = '#F4F7FB';

function InfoPage() {
  const navigation = Route.useNavigation();
  const tapCount = useRef(0);
  const lastTap = useRef(0);

  // 버전 텍스트 7회 연속 탭 → 개발 패널
  const onVersionTap = () => {
    const now = Date.now();
    if (now - lastTap.current > 1500) tapCount.current = 0;
    lastTap.current = now;
    tapCount.current += 1;
    if (tapCount.current >= 7) {
      tapCount.current = 0;
      navigation.navigate('/dev');
    }
  };

  return (
    <View style={s.root}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          <Text style={s.appTitle}>청기백기 순발력 랭킹전</Text>
          <Text style={s.desc}>
            "청기 올려! 백기 내리지 마!"{'\n'}
            명령에 맞게 깃발을 조작하는 순발력 게임이에요.{'\n'}
            매주 랭킹에 도전하고 코인을 모아 토스포인트로 교환하세요.
          </Text>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>코인 안내</Text>
          <Text style={s.row}>• 게임 1판 완료 시 1코인을 받을 수 있어요</Text>
          <Text style={s.row}>• 일일 최고기록·누적 챌린지·주간 랭킹 보상이 있어요</Text>
          <Text style={s.row}>• 100코인은 교환소에서 토스포인트 100원으로 교환돼요 (하루 10회)</Text>
          <Text style={s.row}>• 코인과 기록은 이 기기에 저장돼요</Text>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>출석·챌린지 안내</Text>
          <Text style={s.row}>• 매일 출석: 광고 보고 도장을 찍은 뒤 도장을 눌러 토스포인트 1원을 받아요</Text>
          <Text style={s.row}>• 7일 연속 출석 시 보너스 토스포인트 5원을 더 받아요</Text>
          <Text style={s.row}>• 누적 도전 챌린지: 광고 시청 후 최대 금액 내에서 랜덤 토스포인트를 받아요</Text>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>랭킹 안내</Text>
          <Text style={s.row}>• 주간 최고 라운드 기준으로 순위가 매겨져요 (동점 시 평균 반응속도가 빠른 순)</Text>
          <Text style={s.row}>• 매주 월요일 0시에 초기화되고, 지난주 순위에 따라 코인이 지급돼요</Text>
          <Text style={s.row}>• 1위 1,000코인 · 2~3위 500코인 · 4~5위 300코인 · 6~10위 100코인 (100코인=100원)</Text>
          <Text style={s.row}>• 보상은 랭킹 화면에서 받기 버튼으로 수령해요</Text>
          <Text style={s.row}>• 비정상적인 기록은 사전 안내 없이 제외될 수 있어요</Text>
        </View>

        <TouchableOpacity onPress={onVersionTap} activeOpacity={1}>
          <Text style={s.versionTxt}>버전 {APP_VERSION}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, gap: 8 },
  appTitle: { fontSize: 18, fontWeight: '800', color: '#191F28' },
  desc: { fontSize: 13, color: '#4E5968', lineHeight: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: PRIMARY },
  row: { fontSize: 13, color: '#4E5968', lineHeight: 19 },
  versionTxt: { textAlign: 'center', fontSize: 12, color: '#B0B8C1', paddingVertical: 10 },
});
