import { InlineAd, share } from '@apps-in-toss/framework';
import { createRoute } from '@granite-js/react-native';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Flags } from '../components/Flags';
import { BANNER_HOME, IMAGE_AD } from '../data/ads';
import { CHALLENGES, INITIAL_FLAGS } from '../data/commands';
import { PASS_ENABLED, useGame } from '../stores/GameContext';
import { usePlayGate } from '../src/usePlayGate';

const SHARE_MESSAGE =
  '청기백기 순발력 랭킹전 ⚡ 명령대로 깃발 올리고 내리며 순발력 겨뤄요! 주간 랭킹에 도전하고 코인도 모아보세요\nintoss://flagup';

export const Route = createRoute('/', { component: HomePage });

const PRIMARY = '#1B64DA';
const PRIMARY_LIGHT = '#E8F1FF';
const BG = '#F4F7FB';

function HomePage() {
  const navigation = Route.useNavigation();
  const {
    coins,
    todayBest,
    totalPlays,
    challengesClaimed,
    hasPass,
    passUntil,
    coinNoticeShown,
    markCoinNoticeShown,
    attendedToday,
  } = useGame();

  const onShare = () => {
    share({ message: SHARE_MESSAGE }).catch(() => {});
  };

  const gate = usePlayGate(() => navigation.navigate('/game'));
  const [noticeVisible, setNoticeVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!coinNoticeShown) setNoticeVisible(true);
    }, 800);
    return () => clearTimeout(t);
  }, [coinNoticeShown]);

  const nextChallenge = CHALLENGES.find((c) => !challengesClaimed.includes(c.plays));
  const claimableChallenge = CHALLENGES.some(
    (c) => totalPlays >= c.plays && !challengesClaimed.includes(c.plays),
  );
  const passDaysLeft = hasPass ? Math.ceil((passUntil - Date.now()) / (24 * 60 * 60 * 1000)) : 0;

  return (
    <View style={s.root}>
      <View style={s.bannerWrap}>
        <InlineAd adGroupId={BANNER_HOME} variant="expanded" impressFallbackOnMount />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* 코인 지갑 */}
        <TouchableOpacity style={s.walletCard} onPress={() => navigation.navigate('/exchange')} activeOpacity={0.85}>
          <View style={s.walletLeft}>
            <Text style={s.walletCoin}>🪙 {coins}</Text>
            <Text style={s.walletCaption}>내 코인</Text>
          </View>
          <View style={s.walletCta}>
            <Text style={s.walletCtaTxt}>토스포인트로 교환 ›</Text>
          </View>
        </TouchableOpacity>

        {/* 히어로 */}
        <View style={s.heroCard}>
          <Text style={s.heroTitle}>청기백기 순발력 랭킹전</Text>
          <Text style={s.heroSub}>명령에 맞게 깃발을 올리고 내려요{'\n'}틀리거나 늦으면 탈락!</Text>
          <View style={s.heroFlags}>
            <Flags state={{ ...INITIAL_FLAGS, blue: true }} height={104} />
          </View>
          {todayBest > 0 && <Text style={s.bestTxt}>오늘 최고기록 {todayBest}라운드</Text>}

          <TouchableOpacity
            style={[s.startBtn, (gate.nextSource === null || gate.processing) && s.startBtnDisabled]}
            onPress={gate.onPressStart}
            disabled={gate.nextSource === null || gate.processing}
            activeOpacity={0.85}
          >
            <Text style={s.startBtnTxt}>{gate.label}</Text>
          </TouchableOpacity>

          <View style={s.playsRow}>
            <PlayPill label="무료" left={gate.freeLeft} total={5} active={gate.nextSource === 'free'} />
            <PlayPill label="광고" left={gate.adLeft} total={10} active={gate.nextSource === 'ad'} />
            <PlayPill label="코인" left={gate.coinLeft} total={10} active={gate.nextSource === 'coin'} />
          </View>
        </View>

        {/* 출석 체크 */}
        <TouchableOpacity style={s.menuCard} onPress={() => navigation.navigate('/attendance')} activeOpacity={0.85}>
          <View style={s.menuLeft}>
            <Text style={s.menuEmoji}>📅</Text>
            <View style={s.menuTexts}>
              <Text style={s.menuTitle}>매일 출석 체크</Text>
              <Text style={s.menuSub}>
                {attendedToday ? '오늘 출석 완료! 내일 또 만나요' : '출석하고 1원 받기 (7일 연속 +5원)'}
              </Text>
            </View>
          </View>
          {attendedToday ? <Text style={s.menuArrow}>›</Text> : <View style={s.dot} />}
        </TouchableOpacity>

        {/* 랭킹 */}
        <TouchableOpacity style={s.menuCard} onPress={() => navigation.navigate('/ranking')} activeOpacity={0.85}>
          <View style={s.menuLeft}>
            <Text style={s.menuEmoji}>🏆</Text>
            <View style={s.menuTexts}>
              <Text style={s.menuTitle}>주간 랭킹</Text>
              <Text style={s.menuSub}>이번 주 상위 10명에게 코인 보상!</Text>
            </View>
          </View>
          <Text style={s.menuArrow}>›</Text>
        </TouchableOpacity>

        {/* 챌린지 */}
        <TouchableOpacity style={s.menuCard} onPress={() => navigation.navigate('/challenge')} activeOpacity={0.85}>
          <View style={s.menuLeft}>
            <Text style={s.menuEmoji}>🚩</Text>
            <View style={s.menuTexts}>
              <Text style={s.menuTitle}>누적 도전 챌린지</Text>
              <Text style={s.menuSub}>
                {claimableChallenge
                  ? '받을 수 있는 보상이 있어요!'
                  : nextChallenge
                  ? `누적 ${totalPlays}판 · 다음 보상 ${nextChallenge.plays}판`
                  : '모든 챌린지를 달성했어요!'}
              </Text>
            </View>
          </View>
          {claimableChallenge ? <View style={s.dot} /> : <Text style={s.menuArrow}>›</Text>}
        </TouchableOpacity>

        {/* 광고 프리패스 */}
        {PASS_ENABLED && (
          <TouchableOpacity style={s.menuCard} onPress={() => navigation.navigate('/pass')} activeOpacity={0.85}>
            <View style={s.menuLeft}>
              <Text style={s.menuEmoji}>⚡</Text>
              <View style={s.menuTexts}>
                <Text style={s.menuTitle}>광고 프리패스</Text>
                <Text style={s.menuSub}>
                  {hasPass ? `사용 중 · ${passDaysLeft}일 남음` : '게임 후 광고 없이 바로 코인 받기'}
                </Text>
              </View>
            </View>
            <Text style={s.menuArrow}>›</Text>
          </TouchableOpacity>
        )}

        <View style={s.imageAdWrap}>
          <InlineAd adGroupId={IMAGE_AD} variant="expanded" impressFallbackOnMount />
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('/info')} activeOpacity={0.6}>
          <Text style={s.footerTxt}>앱 정보</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 코인 안내 (최초 1회) */}
      <Modal visible={noticeVisible} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={s.modalDim}>
          <View style={s.modalCard}>
            <Text style={s.modalEmoji}>🪙</Text>
            <Text style={s.modalTitle}>코인을 모아 토스포인트로!</Text>
            <Text style={s.modalBody}>
              게임을 하면 코인이 쌓여요.{'\n'}
              모은 코인은 교환소에서{'\n'}
              100코인 = 토스포인트 100원으로 바꿀 수 있어요.
            </Text>
            <TouchableOpacity
              style={s.modalBtn}
              onPress={() => {
                setNoticeVisible(false);
                markCoinNoticeShown();
              }}
              activeOpacity={0.85}
            >
              <Text style={s.modalBtnTxt}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function PlayPill({ label, left, total, active }: { label: string; left: number; total: number; active: boolean }) {
  return (
    <View style={[s.pill, active && s.pillActive]}>
      <Text style={[s.pillLabel, active && s.pillLabelActive]}>{label}</Text>
      <Text style={[s.pillCount, active && s.pillLabelActive]}>{left}/{total}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  bannerWrap: { overflow: 'hidden', backgroundColor: BG },
  scroll: { flex: 1 },
  content: { paddingTop: 12, paddingBottom: 32, paddingHorizontal: 16, gap: 12 },

  walletCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: PRIMARY_LIGHT,
  },
  walletLeft: { gap: 2 },
  walletCoin: { fontSize: 22, fontWeight: '800', color: '#191F28' },
  walletCaption: { fontSize: 12, color: '#8B95A1' },
  walletCta: {
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  walletCtaTxt: { fontSize: 13, fontWeight: '700', color: PRIMARY },

  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PRIMARY_LIGHT,
  },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#191F28' },
  heroSub: { fontSize: 13, color: '#6B7684', textAlign: 'center', marginTop: 6, lineHeight: 19 },
  heroFlags: { marginTop: 18, marginBottom: 6 },
  bestTxt: { fontSize: 13, fontWeight: '700', color: PRIMARY, marginTop: 8 },
  startBtn: {
    alignSelf: 'stretch',
    marginTop: 16,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  startBtnDisabled: { backgroundColor: '#B0B8C1' },
  startBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
  playsRow: { flexDirection: 'row', gap: 8, marginTop: 12, alignSelf: 'stretch' },
  pill: {
    flex: 1,
    backgroundColor: BG,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 1,
  },
  pillActive: { backgroundColor: PRIMARY_LIGHT },
  pillLabel: { fontSize: 11, color: '#8B95A1' },
  pillCount: { fontSize: 13, fontWeight: '700', color: '#4E5968' },
  pillLabelActive: { color: PRIMARY },

  bonusCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  bonusTitle: { fontSize: 14, fontWeight: '700', color: '#7A5800' },
  bonusCta: { fontSize: 14, fontWeight: '800', color: '#D18700' },

  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  menuEmoji: { fontSize: 22 },
  menuTexts: { gap: 2, flexShrink: 1 },
  menuTitle: { fontSize: 15, fontWeight: '700', color: '#191F28' },
  menuSub: { fontSize: 12, color: '#8B95A1' },
  menuArrow: { fontSize: 20, color: '#B0B8C1', fontWeight: '600' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F04452' },

  imageAdWrap: { overflow: 'hidden', borderRadius: 12 },
  footerTxt: { textAlign: 'center', fontSize: 12, color: '#B0B8C1', paddingVertical: 8 },

  modalDim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  modalCard: {
    alignSelf: 'stretch',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  modalEmoji: { fontSize: 40 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#191F28', marginTop: 10 },
  modalBody: { fontSize: 13, color: '#6B7684', textAlign: 'center', lineHeight: 20, marginTop: 8 },
  modalBtn: {
    alignSelf: 'stretch',
    marginTop: 18,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
