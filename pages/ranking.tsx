import { InlineAd } from '@apps-in-toss/framework';
import { grantPromotionReward } from '@apps-in-toss/native-modules';
import { createRoute } from '@granite-js/react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BANNER_SUB } from '../data/ads';
import { RANK_REWARDS } from '../data/commands';
import { useGame } from '../stores/GameContext';
import {
  claimReward,
  fetchLeaderboard,
  fetchReward,
  LeaderboardResponse,
  RewardResponse,
  serverEnabled,
} from '../src/server';

export const Route = createRoute('/ranking', { component: RankingPage });

const PRIMARY = '#1B64DA';
const BG = '#F4F7FB';

function RankingPage() {
  const { nickname, setNickname, addCoins } = useGame();
  const [board, setBoard] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [reward, setReward] = useState<RewardResponse | null>(null);
  const [claiming, setClaiming] = useState(false);
  const claimLock = useRef(false);

  const [editingNick, setEditingNick] = useState(false);
  const [nickInput, setNickInput] = useState('');

  const load = useCallback(async () => {
    if (!serverEnabled()) return;
    setLoading(true);
    const [b, r] = await Promise.all([fetchLeaderboard(), fetchReward()]);
    setBoard(b);
    setReward(r);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onSaveNick = async () => {
    const v = nickInput.trim();
    if (v.length < 2) {
      Alert.alert('닉네임이 너무 짧아요', '2~8자로 입력해주세요.');
      return;
    }
    await setNickname(v);
    setEditingNick(false);
    Alert.alert('닉네임 저장 완료', '다음 기록 등록부터 새 닉네임으로 표시돼요.');
  };

  const onClaimReward = async () => {
    if (claimLock.current || claiming) return;
    claimLock.current = true;
    setClaiming(true);
    try {
      // 서버에서 먼저 claimed 처리(권위 기록)해 중복 지급을 차단한 뒤 코인을 지급한다.
      const res = await claimReward();
      if (!res || !res.ok || res.total <= 0) {
        Alert.alert('받을 보상이 없어요', '보상은 매주 월요일에 정산돼요.');
        return;
      }
      await addCoins(res.total);
      setReward((prev) => (prev ? { ...prev, claimed: true } : prev));
      Alert.alert('랭킹 보상 지급!', `지난주 랭킹 보상 ${res.total.toLocaleString()}코인을 받았어요.`);
    } finally {
      setClaiming(false);
      claimLock.current = false;
    }
  };

  const rewardAvailable = reward && reward.amount > 0 && !reward.claimed; // amount = 코인 합계

  return (
    <View style={s.root}>
      <View style={s.bannerWrap}>
        <InlineAd adGroupId={BANNER_SUB} variant="expanded" impressFallbackOnMount />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* 닉네임 */}
        <View style={s.nickCard}>
          {editingNick ? (
            <View style={s.nickEditRow}>
              <TextInput
                style={s.nickInput}
                value={nickInput}
                onChangeText={setNickInput}
                placeholder="닉네임 (2~8자)"
                placeholderTextColor="#B0B8C1"
                maxLength={8}
                autoFocus
              />
              <TouchableOpacity style={s.nickSaveBtn} onPress={onSaveNick} activeOpacity={0.85}>
                <Text style={s.nickSaveTxt}>저장</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.nickRow}>
              <View style={s.nickTexts}>
                <Text style={s.nickLabel}>내 닉네임</Text>
                <Text style={s.nickValue}>{nickname || '아직 없어요 (첫 기록 등록 시 자동 생성)'}</Text>
              </View>
              <TouchableOpacity
                style={s.nickEditBtn}
                onPress={() => {
                  setNickInput(nickname);
                  setEditingNick(true);
                }}
                activeOpacity={0.85}
              >
                <Text style={s.nickEditTxt}>변경</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 지난주 보상 */}
        {rewardAvailable && (
          <TouchableOpacity style={s.rewardCard} onPress={onClaimReward} disabled={claiming} activeOpacity={0.85}>
            <Text style={s.rewardTitle}>
              🏆 지난주 {reward!.rank}위 보상이 도착했어요!
            </Text>
            <Text style={s.rewardCta}>
              {claiming ? '지급 중...' : `+${reward!.amount.toLocaleString()}코인 받기`}
            </Text>
          </TouchableOpacity>
        )}

        {/* 보상 안내 */}
        <View style={s.infoCard}>
          <Text style={s.infoTitle}>이번 주 랭킹 보상</Text>
          <View style={s.infoRow}>
            {RANK_REWARDS.map((r) => (
              <View key={r.from} style={s.infoPill}>
                <Text style={s.infoPillRank}>{r.from === r.to ? `${r.from}위` : `${r.from}~${r.to}위`}</Text>
                <Text style={s.infoPillCoin}>+{r.coins.toLocaleString()}코인</Text>
              </View>
            ))}
          </View>
          <Text style={s.infoSub}>매주 월요일 0시에 지난주 순위로 코인이 지급돼요</Text>
        </View>

        {/* 리더보드 */}
        {!serverEnabled() ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyEmoji}>🛠️</Text>
            <Text style={s.emptyTxt}>랭킹 서버 준비 중이에요{'\n'}곧 만나요!</Text>
          </View>
        ) : loading && !board ? (
          <View style={s.emptyCard}>
            <ActivityIndicator color={PRIMARY} />
          </View>
        ) : board ? (
          <View style={s.boardCard}>
            <View style={s.boardHeader}>
              <Text style={s.boardTitle}>이번 주 TOP 50</Text>
              <TouchableOpacity onPress={load} activeOpacity={0.7} disabled={loading}>
                <Text style={s.refreshTxt}>{loading ? '새로고침 중...' : '새로고침 ↻'}</Text>
              </TouchableOpacity>
            </View>

            {board.myRank !== null && (
              <View style={s.myRankRow}>
                <Text style={s.myRankTxt}>
                  내 순위 {board.myRank}위 · 주간 최고 {board.myBest}라운드 · 참가자 {board.totalPlayers}명
                </Text>
              </View>
            )}

            {board.entries.length === 0 ? (
              <Text style={s.emptyTxt}>아직 이번 주 기록이 없어요.{'\n'}첫 번째 주인공이 되어보세요!</Text>
            ) : (
              board.entries.map((e) => (
                <View key={`${e.rank}-${e.nickname}`} style={[s.entryRow, e.me && s.entryRowMe]}>
                  <Text style={[s.entryRank, e.rank <= 3 && s.entryRankTop]}>
                    {e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : e.rank}
                  </Text>
                  <Text style={[s.entryNick, e.me && s.entryNickMe]} numberOfLines={1}>
                    {e.nickname}{e.me ? ' (나)' : ''}
                  </Text>
                  <Text style={s.entryScore}>{e.best}라운드</Text>
                </View>
              ))
            )}
          </View>
        ) : (
          <View style={s.emptyCard}>
            <Text style={s.emptyEmoji}>📡</Text>
            <Text style={s.emptyTxt}>랭킹을 불러오지 못했어요</Text>
            <TouchableOpacity style={s.retryBtn} onPress={load} activeOpacity={0.85}>
              <Text style={s.retryTxt}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  bannerWrap: { overflow: 'hidden', backgroundColor: BG },
  scroll: { flex: 1 },
  content: { paddingTop: 12, paddingBottom: 32, paddingHorizontal: 16, gap: 12 },

  nickCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  nickRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nickTexts: { gap: 2, flexShrink: 1 },
  nickLabel: { fontSize: 12, color: '#8B95A1' },
  nickValue: { fontSize: 15, fontWeight: '700', color: '#191F28' },
  nickEditBtn: {
    backgroundColor: '#E8F1FF',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  nickEditTxt: { fontSize: 13, fontWeight: '700', color: PRIMARY },
  nickEditRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  nickInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E8EB',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#191F28',
  },
  nickSaveBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  nickSaveTxt: { color: '#fff', fontSize: 13, fontWeight: '800' },

  rewardCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  rewardTitle: { fontSize: 15, fontWeight: '800', color: '#7A5800', textAlign: 'center' },
  rewardCta: { fontSize: 16, fontWeight: '900', color: '#D18700' },

  infoCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 10 },
  infoTitle: { fontSize: 14, fontWeight: '800', color: '#191F28' },
  infoRow: { flexDirection: 'row', gap: 8 },
  infoPill: {
    flex: 1,
    backgroundColor: '#E8F1FF',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  infoPillRank: { fontSize: 12, fontWeight: '700', color: PRIMARY },
  infoPillCoin: { fontSize: 13, fontWeight: '800', color: '#191F28' },
  infoSub: { fontSize: 11, color: '#8B95A1', textAlign: 'center' },

  boardCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 4 },
  boardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  boardTitle: { fontSize: 15, fontWeight: '800', color: '#191F28' },
  refreshTxt: { fontSize: 12, fontWeight: '700', color: PRIMARY },
  myRankRow: {
    backgroundColor: '#E8F1FF',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  myRankTxt: { fontSize: 12, fontWeight: '700', color: PRIMARY },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    gap: 10,
  },
  entryRowMe: { backgroundColor: '#F0F6FF', borderRadius: 10, paddingHorizontal: 8 },
  entryRank: { width: 34, fontSize: 14, fontWeight: '800', color: '#8B95A1', textAlign: 'center' },
  entryRankTop: { fontSize: 17 },
  entryNick: { flex: 1, fontSize: 14, fontWeight: '600', color: '#333D4B' },
  entryNickMe: { color: PRIMARY, fontWeight: '800' },
  entryScore: { fontSize: 14, fontWeight: '800', color: '#191F28' },

  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  emptyEmoji: { fontSize: 34 },
  emptyTxt: { fontSize: 13, color: '#8B95A1', textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    backgroundColor: '#E8F1FF',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  retryTxt: { fontSize: 13, fontWeight: '700', color: PRIMARY },
});
