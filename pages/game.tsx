import { InlineAd, loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/framework';
import { CommonActions } from '@granite-js/native/@react-navigation/native';
import { createRoute } from '@granite-js/react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Flags } from '../components/Flags';
import { AD_REVIVE_IDS, BANNER_SUB, IMAGE_AD } from '../data/ads';
import {
  applyAction,
  Command,
  commandWindowMs,
  FlagAction,
  FlagState,
  generateCommand,
  INITIAL_FLAGS,
} from '../data/commands';
import { useGame } from '../stores/GameContext';
import { useFallbackAd } from '../src/useFallbackAd';

export const Route = createRoute('/game', { component: GamePage });

const PRIMARY = '#1B64DA';
const BG = '#F4F7FB';
const GAP_MS = 350; // 라운드 사이 명령 숨김 간격
const OK_FLASH_MS = 220;

function GamePage() {
  const navigation = Route.useNavigation();
  const { finishGame } = useGame();

  const adSupported = loadFullScreenAd.isSupported() && showFullScreenAd.isSupported();
  const { adLoaded, activeAdId, reload } = useFallbackAd(AD_REVIVE_IDS, adSupported);

  const [phase, setPhase] = useState<'ready' | 'playing'>('ready');
  const [flags, setFlags] = useState<FlagState>(INITIAL_FLAGS);
  const [command, setCommand] = useState<Command | null>(null);
  const [round, setRound] = useState(1);
  const [feedback, setFeedback] = useState<'ok' | 'wrong' | null>(null);
  const [timePct, setTimePct] = useState(1);
  const [progress, setProgress] = useState(0); // 2동작 명령 진행 단계

  const flagsRef = useRef<FlagState>(INITIAL_FLAGS);
  const commandRef = useRef<Command | null>(null);
  const roundRef = useRef(1);
  const roundStartRef = useRef<number | null>(null);
  const windowRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gapRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef(0);
  const reactionsRef = useRef<number[]>([]);
  const reviveUsedRef = useRef(false);
  const endedRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    if (gapRef.current) { clearTimeout(gapRef.current); gapRef.current = null; }
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const endGame = useCallback(async () => {
    if (endedRef.current) return;
    endedRef.current = true;
    clearTimers();
    const score = roundRef.current - 1;
    const bonus = await finishGame(score); // 최고기록 보너스 자동 지급 (차액분)
    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [
          { name: '/' },
          {
            name: '/result',
            params: {
              score: String(score),
              reactions: reactionsRef.current.join(','),
              revived: reviveUsedRef.current ? '1' : '0',
              bonus: String(bonus),
            },
          },
        ],
      }),
    );
  }, [clearTimers, finishGame, navigation]);

  const beginRound = useCallback((r: number) => {
    if (endedRef.current) return;
    clearTimers();
    setFeedback(null);
    setCommand(null);
    commandRef.current = null;
    roundStartRef.current = null;
    setTimePct(1);
    setRound(r);
    roundRef.current = r;
    progressRef.current = 0;
    setProgress(0);

    gapRef.current = setTimeout(() => {
      const cmd = generateCommand(flagsRef.current, r);
      commandRef.current = cmd;
      setCommand(cmd);
      const windowMs = commandWindowMs(r, cmd);
      windowRef.current = windowMs;
      roundStartRef.current = Date.now();
      tickRef.current = setInterval(() => {
        const start = roundStartRef.current;
        if (start === null) return;
        const elapsed = Date.now() - start;
        const pct = Math.max(0, 1 - elapsed / windowMs);
        setTimePct(pct);
        if (elapsed >= windowMs) {
          onFailRef.current('timeout');
        }
      }, 50);
    }, GAP_MS);
  }, [clearTimers]);

  // onFail은 interval 내부에서 호출되므로 ref로 고정
  const onFailRef = useRef<(reason: 'wrong' | 'timeout') => void>(() => {});

  const showReviveAd = useCallback(() => {
    if (!adSupported || !activeAdId) {
      // 개발 환경: 광고 미지원 시 바로 이어하기
      reviveUsedRef.current = true;
      beginRound(roundRef.current);
      return;
    }
    let earned = false;
    showFullScreenAd({
      options: { adGroupId: activeAdId },
      onEvent: (e) => {
        if (e.type === 'userEarnedReward') earned = true;
        if (e.type === 'dismissed') {
          reload();
          if (earned) {
            reviveUsedRef.current = true;
            beginRound(roundRef.current);
          } else {
            endGame();
          }
        }
      },
      onError: () => {
        Alert.alert('광고를 불러올 수 없어요', '결과 화면으로 이동할게요.', [
          { text: '확인', onPress: () => endGame() },
        ]);
      },
    });
  }, [adSupported, activeAdId, beginRound, endGame, reload]);

  const onFail = useCallback((reason: 'wrong' | 'timeout') => {
    if (endedRef.current) return;
    clearTimers();
    roundStartRef.current = null;
    setFeedback('wrong');
    const score = roundRef.current - 1;
    // 5라운드 이상 진행한 판에서만 이어하기 제안 (저라운드 광고 시청은 유저 손해)
    const canRevive = score >= 5 && !reviveUsedRef.current && (adLoaded || !adSupported);
    const title = reason === 'timeout' ? '시간 초과!' : '앗, 틀렸어요!';
    if (canRevive) {
      Alert.alert(title, `${score}라운드까지 성공했어요.\n광고를 보면 이어서 도전할 수 있어요. (1회)`, [
        { text: '그만하기', style: 'cancel', onPress: () => endGame() },
        { text: '광고 보고 이어하기', onPress: () => showReviveAd() },
      ]);
    } else {
      Alert.alert(title, `${score}라운드까지 성공했어요.`, [
        { text: '결과 보기', onPress: () => endGame() },
      ]);
    }
  }, [adLoaded, adSupported, clearTimers, endGame, showReviveAd]);

  useEffect(() => {
    onFailRef.current = onFail;
  }, [onFail]);

  const onAction = (action: FlagAction) => {
    const cmd = commandRef.current;
    const start = roundStartRef.current;
    if (!cmd || start === null || endedRef.current) return;
    const expected = cmd.seq[progressRef.current];
    if (action !== expected) {
      onFail('wrong');
      return;
    }
    // 정답 입력 — 깃발 상태는 즉시 반영 (2동작 명령의 중간 피드백)
    const nextFlags = applyAction(flagsRef.current, action);
    flagsRef.current = nextFlags;
    setFlags(nextFlags);

    const isLast = progressRef.current + 1 >= cmd.seq.length;
    if (!isLast) {
      // 2동작 명령의 1단계 완료 — 타이머는 계속 흐름
      progressRef.current += 1;
      setProgress(progressRef.current);
      return;
    }
    clearTimers();
    roundStartRef.current = null;
    reactionsRef.current.push(Date.now() - start); // 명령 전체 완료까지의 시간
    setFeedback('ok');
    gapRef.current = setTimeout(() => beginRound(roundRef.current + 1), OK_FLASH_MS);
  };

  const onStart = () => {
    // 이어하기 광고가 로드 실패 상태면 게임 시작 시 한 번 더 시도 (no-fill 대비)
    if (adSupported && !adLoaded) reload();
    setPhase('playing');
    flagsRef.current = INITIAL_FLAGS;
    setFlags(INITIAL_FLAGS);
    reactionsRef.current = [];
    reviveUsedRef.current = false;
    endedRef.current = false;
    beginRound(1);
  };

  // ----- 준비 화면 -----
  if (phase === 'ready') {
    return (
      <View style={s.root}>
        <ScrollView style={s.scroll} contentContainerStyle={s.readyContent} showsVerticalScrollIndicator={false}>
          <View style={s.guideCard}>
            <Text style={s.guideTitle}>게임 방법</Text>
            <View style={s.guideRow}>
              <Text style={s.guideNum}>1</Text>
              <Text style={s.guideTxt}>명령에 맞는 버튼을 빠르게 눌러요</Text>
            </View>
            <View style={s.guideRow}>
              <Text style={s.guideNum}>2</Text>
              <Text style={s.guideTxt}>"~하지 마" 명령엔 <Text style={s.guideStrong}>가만히!</Text> 버튼</Text>
            </View>
            <View style={s.guideRow}>
              <Text style={s.guideNum}>3</Text>
              <Text style={s.guideTxt}>
                20라운드부터 <Text style={s.guideStrong}>두 동작 명령</Text>! "청기 올리고 백기 내려"는 순서대로 두 번 눌러요
              </Text>
            </View>
            <View style={s.guideRow}>
              <Text style={s.guideNum}>4</Text>
              <Text style={s.guideTxt}>라운드가 올라갈수록 점점 빨라져요</Text>
            </View>
            <View style={s.guideRow}>
              <Text style={s.guideNum}>5</Text>
              <Text style={s.guideTxt}>틀리거나 시간을 넘기면 탈락!</Text>
            </View>
          </View>

          <View style={s.imageAdWrap}>
            <InlineAd adGroupId={IMAGE_AD} variant="expanded" impressFallbackOnMount />
          </View>

          <View style={s.rewardCard}>
            <Text style={s.rewardTitle}>🪙 코인 보상</Text>
            <View style={s.rewardRow}>
              <Text style={s.rewardLabel}>한 판 완료</Text>
              <Text style={s.rewardValue}>+1코인</Text>
            </View>
            <View style={s.rewardRow}>
              <Text style={s.rewardLabel}>오늘 최고 20라운드 돌파</Text>
              <Text style={s.rewardValue}>+2코인 자동 지급</Text>
            </View>
            <View style={s.rewardRow}>
              <Text style={s.rewardLabel}>오늘 최고 30라운드 돌파</Text>
              <Text style={s.rewardValue}>+3코인 자동 지급</Text>
            </View>
            <View style={s.rewardRow}>
              <Text style={s.rewardLabel}>오늘 최고 40라운드 돌파</Text>
              <Text style={s.rewardValue}>+5코인 자동 지급</Text>
            </View>
            <View style={s.rewardRow}>
              <Text style={s.rewardLabel}>주간 랭킹 TOP 10</Text>
              <Text style={s.rewardValue}>+100~1,000코인</Text>
            </View>
            <Text style={s.rewardNote}>최고기록 보너스는 갱신한 만큼만 더 받아요 (하루 최대 5코인)</Text>
          </View>
        </ScrollView>

        <View style={s.footer}>
          <TouchableOpacity style={s.startBtn} onPress={onStart} activeOpacity={0.85}>
            <Text style={s.startBtnTxt}>준비됐어요, 시작!</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ----- 플레이 화면 -----
  return (
    <View style={s.root}>
      <View style={s.bannerWrap}>
        <InlineAd adGroupId={BANNER_SUB} variant="expanded" impressFallbackOnMount />
      </View>

      <View style={s.statusRow}>
        <Text style={s.roundTxt}>ROUND {round}</Text>
        <Text style={s.scoreTxt}>성공 {round - 1}</Text>
      </View>

      <View style={s.timeBarTrack}>
        <View
          style={[
            s.timeBarFill,
            { width: `${timePct * 100}%` },
            timePct < 0.3 && s.timeBarDanger,
          ]}
        />
      </View>

      <View style={s.commandArea}>
        <Text
          style={[
            s.commandTxt,
            feedback === 'ok' && s.commandOk,
            feedback === 'wrong' && s.commandWrong,
          ]}
          numberOfLines={2}
          adjustsFontSizeToFit
        >
          {feedback === 'ok' ? '통과!' : command ? command.text : '· · ·'}
        </Text>
        {command && command.seq.length >= 2 && feedback !== 'ok' && (
          <View style={s.dualPill}>
            <Text style={s.dualPillTxt}>두 동작! {progress}/{command.seq.length} 입력</Text>
          </View>
        )}
      </View>

      <View style={s.flagsArea}>
        <Flags state={flags} height={110} />
      </View>

      <View style={s.btnArea}>
        <View style={s.btnRow}>
          <ActionBtn label="청기 올려" color={PRIMARY} onPress={() => onAction('blue-up')} />
          <ActionBtn label="청기 내려" color={PRIMARY} outline onPress={() => onAction('blue-down')} />
        </View>
        <View style={s.btnRow}>
          <ActionBtn label="백기 올려" color="#4E5968" onPress={() => onAction('white-up')} />
          <ActionBtn label="백기 내려" color="#4E5968" outline onPress={() => onAction('white-down')} />
        </View>
        <TouchableOpacity style={s.holdBtn} onPress={() => onAction('hold')} activeOpacity={0.8}>
          <Text style={s.holdBtnTxt}>가만히!</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ActionBtn({
  label,
  color,
  outline,
  onPress,
}: {
  label: string;
  color: string;
  outline?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        s.actionBtn,
        outline ? { borderWidth: 2, borderColor: color, backgroundColor: '#fff' } : { backgroundColor: color },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[s.actionBtnTxt, outline && { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  bannerWrap: { overflow: 'hidden', backgroundColor: BG },
  scroll: { flex: 1 },

  // ready
  readyContent: { padding: 16, gap: 12, paddingBottom: 24 },
  guideCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 22,
    gap: 12,
  },
  guideTitle: { fontSize: 18, fontWeight: '800', color: '#191F28', marginBottom: 4 },
  guideRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  guideNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E8F1FF',
    color: PRIMARY,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 22,
    overflow: 'hidden',
  },
  guideTxt: { fontSize: 14, color: '#4E5968', flexShrink: 1 },
  guideStrong: { fontWeight: '800', color: '#F04452' },
  rewardCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 22,
    gap: 10,
  },
  rewardTitle: { fontSize: 16, fontWeight: '800', color: '#191F28', marginBottom: 2 },
  rewardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  rewardLabel: { fontSize: 13, color: '#4E5968', flexShrink: 1 },
  rewardValue: { fontSize: 13, fontWeight: '800', color: PRIMARY },
  rewardNote: { fontSize: 11, color: '#8B95A1', marginTop: 4 },
  imageAdWrap: { overflow: 'hidden', borderRadius: 12 },
  footer: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: BG,
  },
  startBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
  },
  startBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // playing
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    alignItems: 'center',
  },
  roundTxt: { fontSize: 16, fontWeight: '800', color: PRIMARY },
  scoreTxt: { fontSize: 14, fontWeight: '600', color: '#6B7684' },
  timeBarTrack: {
    height: 8,
    backgroundColor: '#E5E8EB',
    borderRadius: 4,
    marginHorizontal: 20,
    marginTop: 10,
    overflow: 'hidden',
  },
  timeBarFill: { height: 8, backgroundColor: PRIMARY, borderRadius: 4 },
  timeBarDanger: { backgroundColor: '#F04452' },
  commandArea: {
    minHeight: 86,
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginTop: 8,
  },
  commandTxt: {
    fontSize: 30,
    fontWeight: '900',
    color: '#191F28',
    textAlign: 'center',
  },
  commandOk: { color: '#22A557' },
  commandWrong: { color: '#F04452' },
  dualPill: {
    alignSelf: 'center',
    marginTop: 8,
    backgroundColor: '#FFF1D6',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  dualPillTxt: { fontSize: 12, fontWeight: '800', color: '#D18700' },
  flagsArea: { alignItems: 'center', justifyContent: 'center', flexGrow: 1 },
  btnArea: { padding: 16, paddingBottom: 24, gap: 10 },
  btnRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnTxt: { color: '#fff', fontSize: 17, fontWeight: '800' },
  holdBtn: {
    backgroundColor: '#FFB331',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  holdBtnTxt: { color: '#fff', fontSize: 17, fontWeight: '900' },
});
