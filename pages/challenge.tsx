import { InlineAd } from '@apps-in-toss/framework';
import { createRoute } from '@granite-js/react-native';
import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BANNER_SUB } from '../data/ads';
import { CHALLENGES } from '../data/commands';
import { useGame } from '../stores/GameContext';

export const Route = createRoute('/challenge', { component: ChallengePage });

const PRIMARY = '#1B64DA';
const BG = '#F4F7FB';

function ChallengePage() {
  const { totalPlays, challengesClaimed, claimChallenge } = useGame();

  const onClaim = async (plays: number) => {
    const got = await claimChallenge(plays);
    if (got > 0) Alert.alert('챌린지 달성!', `누적 ${plays}판 보상 ${got}코인을 받았어요.`);
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
                <Text style={s.itemCoin}>+{c.coins}코인</Text>
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
                  <TouchableOpacity style={s.claimBtn} onPress={() => onClaim(c.plays)} activeOpacity={0.85}>
                    <Text style={s.claimBtnTxt}>받기</Text>
                  </TouchableOpacity>
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
  claimBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
