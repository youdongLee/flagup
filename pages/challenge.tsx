import { InlineAd, loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/framework';
import { grantPromotionReward } from '@apps-in-toss/native-modules';
import { createRoute } from '@granite-js/react-native';
import React, { useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AD_CHALLENGE_IDS, BANNER_SUB, PROMO_CHALLENGE } from '../data/ads';
import { CHALLENGES, randomChallengeWon } from '../data/commands';
import { isGrantSuccess } from '../src/server';
import { useFallbackAd } from '../src/useFallbackAd';
import { useGame } from '../stores/GameContext';

export const Route = createRoute('/challenge', { component: ChallengePage });

const PRIMARY = '#1B64DA';
const BG = '#F4F7FB';

function ChallengePage() {
  const { totalPlays, challengesClaimed, markChallengeClaimed } = useGame();
  const adSupported = loadFullScreenAd.isSupported() && showFullScreenAd.isSupported();
  const { adLoaded, activeAdId, reload } = useFallbackAd(AD_CHALLENGE_IDS, adSupported);
  const [busy, setBusy] = useState(false);
  const [unlocked, setUnlocked] = useState<Record<number, boolean>>({}); // plays → 광고 시청 완료(수령 가능)
  const lock = useRef(false);
  const earnedRef = useRef(false);

  // 1단계: 광고 시청 → 수령 CTA 활성화 (금액은 수령 시 공개)
  const onWatchAd = (plays: number, maxWon: number) => {
    if (lock.current || busy) return;
    const unlock = () => setUnlocked((prev) => ({ ...prev, [plays]: true }));
    if (!adSupported || !activeAdId) {
      unlock();
      return;
    }
    if (!adLoaded) {
      Alert.alert('광고 준비 중이에요', '잠시 후 다시 시도해주세요.');
      return;
    }
    Alert.alert('광고 보고 보상 받기', `광고를 보면 누적 ${plays.toLocaleString()}판 보상(최대 ${maxWon}원)을 받을 수 있어요. 광고를 볼까요?`, [
      { text: '다음에', style: 'cancel' },
      {
        text: '광고 보기',
        onPress: () => {
          setBusy(true);
          earnedRef.current = false;
          showFullScreenAd({
            options: { adGroupId: activeAdId },
            onEvent: (e) => {
              if (e.type === 'userEarnedReward') earnedRef.current = true;
              if (e.type === 'dismissed') {
                setBusy(false);
                reload();
                if (earnedRef.current) unlock();
              }
            },
            onError: () => {
              setBusy(false);
              Alert.alert('광고를 불러올 수 없어요', '잠시 후 다시 시도해주세요.');
            },
          });
        },
      },
    ]);
  };

  // 2단계: CTA 눌러 랜덤 토스포인트 수령 (금액은 이때 결정·공개)
  const onClaim = async (plays: number, maxWon: number) => {
    if (lock.current || busy) return;
    if (!unlocked[plays]) return;
    const amount = randomChallengeWon(maxWon); // 1 ~ maxWon
    lock.current = true;
    setBusy(true);
    try {
      let ok = false;
      try {
        const result = await grantPromotionReward({ params: { promotionCode: PROMO_CHALLENGE, amount } });
        ok = isGrantSuccess(result);
      } catch {
        ok = false;
      }
      if (ok) {
        await markChallengeClaimed(plays);
        setUnlocked((prev) => {
          const next = { ...prev };
          delete next[plays];
          return next;
        });
        Alert.alert('챌린지 달성!', `누적 ${plays.toLocaleString()}판 보상으로 토스포인트 ${amount}원을 받았어요! (최대 ${maxWon}원)`);
      } else {
        Alert.alert('지급에 실패했어요', '보상은 그대로 남아있어요. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setBusy(false);
      lock.current = false;
    }
  };

  return (
    <View style={s.root}>
      <View style={s.bannerWrap}>
        <InlineAd adGroupId={BANNER_SUB} variant="expanded" impressFallbackOnMount />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.headCard}>
          <Text style={s.headEmoji}>🚩</Text>
          <Text style={s.headTitle}>누적 도전 챌린지</Text>
          <Text style={s.headSub}>지금까지 {totalPlays}판 도전했어요</Text>
        </View>

        {CHALLENGES.map((c) => {
          const claimed = challengesClaimed.includes(c.plays);
          const achievable = totalPlays >= c.plays && !claimed;
          const pct = Math.min(1, totalPlays / c.plays);
          return (
            <View key={c.plays} style={[s.itemCard, claimed && s.itemCardDone]}>
              <View style={s.itemTop}>
                <Text style={s.itemTitle}>누적 {c.plays.toLocaleString()}판 도전</Text>
                <Text style={s.itemCoin}>최대 {c.maxWon}원</Text>
              </View>
              <View style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${pct * 100}%` }, claimed && s.progressDone]} />
              </View>
              <View style={s.itemBottom}>
                <Text style={s.itemProgress}>
                  {Math.min(totalPlays, c.plays).toLocaleString()} / {c.plays.toLocaleString()}판
                </Text>
                {claimed ? (
                  <Text style={s.doneTxt}>수령 완료 ✓</Text>
                ) : achievable ? (
                  unlocked[c.plays] ? (
                    <TouchableOpacity
                      style={[s.claimBtn, busy && s.claimBtnDisabled]}
                      onPress={() => onClaim(c.plays, c.maxWon)}
                      disabled={busy}
                      activeOpacity={0.85}
                    >
                      <Text style={s.claimBtnTxt}>{busy ? '지급 중' : '보상 받기'}</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[s.adBtn, busy && s.claimBtnDisabled]}
                      onPress={() => onWatchAd(c.plays, c.maxWon)}
                      disabled={busy}
                      activeOpacity={0.85}
                    >
                      <Text style={s.adBtnTxt}>광고 보고 받기</Text>
                    </TouchableOpacity>
                  )
                ) : (
                  <Text style={s.lockedTxt}>진행 중</Text>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  bannerWrap: { overflow: 'hidden', backgroundColor: BG },
  scroll: { flex: 1 },
  content: { paddingTop: 12, paddingBottom: 32, paddingHorizontal: 16, gap: 10 },

  headCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    gap: 4,
  },
  headEmoji: { fontSize: 32 },
  headTitle: { fontSize: 18, fontWeight: '800', color: '#191F28' },
  headSub: { fontSize: 13, color: '#6B7684' },

  itemCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 10 },
  itemCardDone: { opacity: 0.65 },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemTitle: { fontSize: 15, fontWeight: '700', color: '#191F28' },
  itemCoin: { fontSize: 14, fontWeight: '800', color: '#D18700' },
  progressTrack: { height: 8, backgroundColor: '#F2F4F6', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: PRIMARY, borderRadius: 4 },
  progressDone: { backgroundColor: '#22A557' },
  itemBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemProgress: { fontSize: 12, color: '#8B95A1' },
  doneTxt: { fontSize: 12, fontWeight: '700', color: '#22A557' },
  lockedTxt: { fontSize: 12, color: '#B0B8C1' },
  claimBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  claimBtnDisabled: { opacity: 0.5 },
  claimBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '800' },
  adBtn: {
    backgroundColor: '#E8F1FF',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  adBtnTxt: { color: PRIMARY, fontSize: 13, fontWeight: '800' },
});
