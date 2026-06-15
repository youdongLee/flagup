import { InlineAd, loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/framework';
import { CommonActions } from '@granite-js/native/@react-navigation/native';
import { createRoute } from '@granite-js/react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AD_COIN_IDS, BANNER_SUB, IMAGE_AD } from '../data/ads';
import { getStoredNickname, useGame } from '../stores/GameContext';
import { getUuid, serverEnabled, submitScore, SubmitResponse } from '../src/server';
import { useFallbackAd } from '../src/useFallbackAd';
import { usePlayGate } from '../src/usePlayGate';

export const Route = createRoute('/result', { component: ResultPage });

const PRIMARY = '#1B64DA';
const BG = '#F4F7FB';

function ResultPage() {
  const navigation = Route.useNavigation();
  const params = Route.useParams() as { score?: string; reactions?: string; revived?: string; bonus?: string };
  const score = Number(params.score ?? 0);
  const bonus = Number(params.bonus ?? 0);
  const reactions = (params.reactions ?? '')
    .split(',')
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v) && v > 0);
  const revived = params.revived === '1';

  const { todayBest, hasPass, addCoins, setNickname } = useGame();

  const adSupported = loadFullScreenAd.isSupported() && showFullScreenAd.isSupported();
  const { adLoaded, activeAdId, reload } = useFallbackAd(AD_COIN_IDS, adSupported);

  const [coinClaimed, setCoinClaimed] = useState(false);
  const [processing, setProcessing] = useState(false);
  const earnedRef = useRef(false);

  const [rankInfo, setRankInfo] = useState<SubmitResponse | null>(null);
  const [rankState, setRankState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const submittedRef = useRef(false);

  const avgMs = reactions.length > 0 ? Math.round(reactions.reduce((a, b) => a + b, 0) / reactions.length) : 0;

  // 점수 자동 제출 (닉네임 미설정 시 기본 닉네임 생성)
  useEffect(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    (async () => {
      if (!serverEnabled() || score < 1) return;
      setRankState('loading');
      const uuid = await getUuid();
      let nick = await getStoredNickname();
      if (!nick) {
        nick = `깃발${uuid.slice(0, 4).toUpperCase()}`;
        await setNickname(nick);
      }
      const res = await submitScore(nick, score, reactions);
      if (res && res.ok) {
        setRankInfo(res);
        setRankState('done');
      } else {
        setRankState('error');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grantCoin = async () => {
    setCoinClaimed(true);
    await addCoins(1);
  };

  const onPressClaimCoin = () => {
    if (coinClaimed || processing) return;
    if (hasPass || !adSupported || !activeAdId) {
      // 패스 사용 중(또는 개발 환경)에는 광고 없이 즉시 지급 — 지급량은 동일
      grantCoin();
      return;
    }
    if (!adLoaded) {
      Alert.alert('광고 준비 중이에요', '잠시 후 다시 시도해주세요.');
      return;
    }
    Alert.alert('광고 보고 코인 받기', '광고를 보면 1코인을 받을 수 있어요. 광고를 볼까요?', [
      { text: '다음에', style: 'cancel' },
      {
        text: '광고 보기',
        onPress: () => {
          setProcessing(true);
          earnedRef.current = false;
          showFullScreenAd({
            options: { adGroupId: activeAdId },
            onEvent: async (e) => {
              if (e.type === 'userEarnedReward') earnedRef.current = true;
              if (e.type === 'dismissed') {
                setProcessing(false);
                reload();
                if (earnedRef.current) await grantCoin();
              }
            },
            onError: () => {
              setProcessing(false);
              Alert.alert('광고를 불러올 수 없어요', '잠시 후 다시 시도해주세요.');
            },
          });
        },
      },
    ]);
  };

  const goHome = () =>
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: '/' }] }));

  const gate = usePlayGate(() => navigation.navigate('/game'), true);

  const coinBtnLabel = coinClaimed
    ? '지급 완료 ✓'
    : processing
    ? '광고 재생 중...'
    : hasPass
    ? '+1코인 바로 받기 ⚡'
    : '광고 보고 +1코인 받기';

  return (
    <View style={s.root}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* 배너 광고 (스크롤형) */}
        <View style={s.bannerWrap}>
          <InlineAd adGroupId={BANNER_SUB} variant="expanded" impressFallbackOnMount />
        </View>

        {/* 점수 */}
        <View style={s.scoreCard}>
          <Text style={s.scoreCaption}>이번 판 기록</Text>
          <View style={s.scoreRow}>
            <Text style={s.scoreNum}>{score}</Text>
            <Text style={s.scoreUnit}>라운드</Text>
          </View>
          {avgMs > 0 && <Text style={s.avgTxt}>평균 반응속도 {(avgMs / 1000).toFixed(2)}초</Text>}
          <View style={s.scoreMetaRow}>
            <Text style={s.scoreMeta}>오늘 최고 {Math.max(todayBest, score)}라운드</Text>
            {revived && <Text style={s.revivedBadge}>이어하기 사용</Text>}
          </View>
        </View>

        {/* 코인 지급 */}
        <TouchableOpacity
          style={[s.coinCard, coinClaimed && s.coinCardDone]}
          onPress={onPressClaimCoin}
          disabled={coinClaimed || processing}
          activeOpacity={0.85}
        >
          <Text style={s.coinEmoji}>🪙</Text>
          <View style={s.coinTexts}>
            <Text style={s.coinTitle}>게임 완료 코인</Text>
            <Text style={s.coinSub}>{coinClaimed ? '코인이 지급됐어요' : '한 판당 1코인을 받을 수 있어요'}</Text>
          </View>
          <View style={[s.coinBtn, (coinClaimed || processing) && s.coinBtnDisabled]}>
            <Text style={s.coinBtnTxt}>{coinBtnLabel}</Text>
          </View>
        </TouchableOpacity>

        {/* 최고기록 보너스 — 자동 지급 안내 */}
        {bonus > 0 && (
          <View style={s.bonusCard}>
            <Text style={s.bonusTitle}>🎉 오늘 최고기록 보너스</Text>
            <Text style={s.bonusCta}>+{bonus}코인 지급 완료!</Text>
          </View>
        )}

        {/* 랭킹 */}
        {serverEnabled() && (
          <TouchableOpacity style={s.rankCard} onPress={() => navigation.navigate('/ranking')} activeOpacity={0.85}>
            <Text style={s.rankEmoji}>🏆</Text>
            <View style={s.coinTexts}>
              {rankState === 'loading' && <Text style={s.rankTitle}>랭킹 등록 중...</Text>}
              {rankState === 'done' && rankInfo && (
                <>
                  <Text style={s.rankTitle}>
                    이번 주 {rankInfo.rank !== null ? `${rankInfo.rank}위` : '순위 집계 중'}
                  </Text>
                  <Text style={s.coinSub}>
                    주간 최고 {rankInfo.best}라운드 · 참가자 {rankInfo.totalPlayers}명
                  </Text>
                </>
              )}
              {rankState === 'error' && <Text style={s.coinSub}>랭킹 등록에 실패했어요. 랭킹 화면에서 확인해주세요.</Text>}
              {rankState === 'idle' && <Text style={s.coinSub}>랭킹 보러 가기</Text>}
            </View>
            <Text style={s.menuArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* 이미지 광고 — 랭킹 섹션 아래 */}
        <View style={s.imageAdWrap}>
          <InlineAd adGroupId={IMAGE_AD} variant="expanded" impressFallbackOnMount />
        </View>
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.retryBtn, (gate.nextSource === null || gate.processing) && s.retryBtnDisabled]}
          onPress={gate.onPressStart}
          disabled={gate.nextSource === null || gate.processing}
          activeOpacity={0.85}
        >
          <Text style={s.retryBtnTxt}>{gate.label}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.homeBtn} onPress={goHome} activeOpacity={0.85}>
          <Text style={s.homeBtnTxt}>홈으로</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  bannerWrap: { overflow: 'hidden', backgroundColor: BG },
  imageAdWrap: { overflow: 'hidden', borderRadius: 12 },
  scroll: { flex: 1 },
  content: { paddingTop: 12, paddingBottom: 16, paddingHorizontal: 16, gap: 12 },

  scoreCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
  },
  scoreCaption: { fontSize: 13, color: '#8B95A1' },
  scoreRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 4 },
  scoreNum: { fontSize: 56, lineHeight: 62, fontWeight: '900', color: PRIMARY },
  scoreUnit: { fontSize: 18, fontWeight: '700', color: '#4E5968', marginBottom: 10 },
  avgTxt: { fontSize: 14, fontWeight: '600', color: '#6B7684', marginTop: 4 },
  scoreMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  scoreMeta: { fontSize: 12, color: '#8B95A1' },
  revivedBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D18700',
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: 'hidden',
  },

  coinCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  coinCardDone: { opacity: 0.75 },
  coinEmoji: { fontSize: 26 },
  coinTexts: { flex: 1, gap: 2 },
  coinTitle: { fontSize: 15, fontWeight: '700', color: '#191F28' },
  coinSub: { fontSize: 12, color: '#8B95A1' },
  coinBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  coinBtnDisabled: { backgroundColor: '#B0B8C1' },
  coinBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '800' },

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

  rankCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankEmoji: { fontSize: 26 },
  rankTitle: { fontSize: 15, fontWeight: '800', color: '#191F28' },
  menuArrow: { fontSize: 20, color: '#B0B8C1', fontWeight: '600' },

  footer: { padding: 16, paddingBottom: 24, gap: 8, backgroundColor: BG },
  retryBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  retryBtnDisabled: { backgroundColor: '#B0B8C1' },
  retryBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
  homeBtn: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E8EB',
  },
  homeBtnTxt: { color: '#4E5968', fontSize: 15, fontWeight: '700' },
});
