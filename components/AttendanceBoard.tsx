import { loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/framework';
import { grantPromotionReward } from '@apps-in-toss/native-modules';
import React, { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AD_ATTEND_IDS, PROMO_ATTENDANCE } from '../data/ads';
import { ATTENDANCE_DAILY_WON, ATTENDANCE_STREAK_BONUS_WON, ATTENDANCE_STREAK_LEN } from '../data/commands';
import { isGrantSuccess } from '../src/server';
import { useFallbackAd } from '../src/useFallbackAd';
import { useGame } from '../stores/GameContext';

const PRIMARY = '#1B64DA';
const PRIMARY_LIGHT = '#E8F1FF';
const BG = '#F4F7FB';

// 홈 화면 하단에 인라인으로 노출되는 출석 현황판 (별도 페이지 진입 없이 바로 출석)
export function AttendanceBoard() {
  const {
    attendedToday,
    attendClaimedToday,
    attendStreak,
    attendBonusAvailable,
    stampAttendance,
    markAttendanceClaimed,
    claimAttendanceBonus,
  } = useGame();

  const adSupported = loadFullScreenAd.isSupported() && showFullScreenAd.isSupported();
  const { adLoaded, activeAdId, reload } = useFallbackAd(AD_ATTEND_IDS, adSupported);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const earnedRef = useRef(false);

  const filled = attendStreak;
  const todayIndex = attendedToday ? attendStreak - 1 : attendStreak;

  const doStamp = () => {
    const finish = async () => {
      const res = await stampAttendance();
      if (res) Alert.alert('도장 완료!', '이제 도장을 눌러 토스포인트 1원을 받으세요.');
    };
    if (!adSupported || !activeAdId) {
      finish();
      return;
    }
    if (!adLoaded) {
      Alert.alert('광고 준비 중이에요', '잠시 후 다시 시도해주세요.');
      return;
    }
    Alert.alert('광고 보고 도장 찍기', '광고를 보면 오늘 출석 도장을 찍을 수 있어요. 광고를 볼까요?', [
      { text: '다음에', style: 'cancel' },
      {
        text: '광고 보기',
        onPress: () => {
          setBusy(true);
          earnedRef.current = false;
          showFullScreenAd({
            options: { adGroupId: activeAdId },
            onEvent: async (e) => {
              if (e.type === 'userEarnedReward') earnedRef.current = true;
              if (e.type === 'dismissed') {
                setBusy(false);
                reload();
                if (earnedRef.current) await finish();
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

  const doClaimDaily = async () => {
    setBusy(true);
    try {
      let ok = false;
      try {
        const result = await grantPromotionReward({ params: { promotionCode: PROMO_ATTENDANCE, amount: ATTENDANCE_DAILY_WON } });
        ok = isGrantSuccess(result);
      } catch {
        ok = false;
      }
      if (ok) {
        const seventh = attendStreak === ATTENDANCE_STREAK_LEN;
        await markAttendanceClaimed();
        Alert.alert('수령 완료!', `토스포인트 ${ATTENDANCE_DAILY_WON}원을 받았어요.${seventh ? '\n7일 연속 달성 보너스도 받아보세요! 🎉' : ''}`);
      } else {
        Alert.alert('지급에 실패했어요', '도장은 그대로 있어요. 잠시 후 다시 눌러주세요.');
      }
    } finally {
      setBusy(false);
    }
  };

  const doClaimBonus = async () => {
    if (lock.current || busy) return;
    lock.current = true;
    setBusy(true);
    try {
      let ok = false;
      try {
        const result = await grantPromotionReward({ params: { promotionCode: PROMO_ATTENDANCE, amount: ATTENDANCE_STREAK_BONUS_WON } });
        ok = isGrantSuccess(result);
      } catch {
        ok = false;
      }
      if (ok) {
        await claimAttendanceBonus();
        Alert.alert('7일 연속 달성! 🎉', `연속 출석 보너스 토스포인트 ${ATTENDANCE_STREAK_BONUS_WON}원을 받았어요.`);
      } else {
        Alert.alert('지급에 실패했어요', '보너스는 그대로 있어요. 잠시 후 다시 시도해주세요.');
      }
    } finally {
      setBusy(false);
      lock.current = false;
    }
  };

  const onTodayAction = () => {
    if (lock.current || busy) return;
    lock.current = true;
    try {
      if (!attendedToday) doStamp();
      else if (!attendClaimedToday) doClaimDaily();
    } finally {
      lock.current = false;
    }
  };

  const btnLabel = busy
    ? '처리 중...'
    : !attendedToday
    ? '광고 보고 오늘 도장 찍기'
    : !attendClaimedToday
    ? `토스포인트 ${ATTENDANCE_DAILY_WON}원 받기`
    : '오늘 출석 완료 ✓';
  const btnDisabled = busy || (attendedToday && attendClaimedToday);

  return (
    <View style={s.card}>
      <Text style={s.title}>📅 매일 출석 체크</Text>
      <Text style={s.sub}>광고 보고 도장 찍으면 1원, 7일 연속이면 보너스 5원!</Text>

      <View style={s.daysRow}>
        {Array.from({ length: ATTENDANCE_STREAK_LEN }).map((_, i) => {
          const done = i < filled;
          const isToday = i === todayIndex && !(attendedToday && attendClaimedToday);
          const isBonus = i === ATTENDANCE_STREAK_LEN - 1;
          const tappable = isToday && !busy;
          return (
            <TouchableOpacity
              key={i}
              style={[s.dayCell, done && s.dayCellDone, isToday && s.dayCellToday]}
              onPress={tappable ? onTodayAction : undefined}
              disabled={!tappable}
              activeOpacity={0.8}
            >
              <Text style={[s.dayNum, done && s.dayNumDone]}>{i + 1}</Text>
              <Text style={[s.dayWon, done && s.dayWonDone]}>{isBonus ? '+5원' : '1원'}</Text>
              {done ? (
                <Text style={s.dayCheck}>✓</Text>
              ) : isToday ? (
                <Text style={s.dayToday}>{!attendedToday ? '광고▶' : '받기'}</Text>
              ) : (
                <Text style={s.dayDot}>·</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[s.actionBtn, btnDisabled && s.actionBtnDisabled]}
        onPress={onTodayAction}
        disabled={btnDisabled}
        activeOpacity={0.85}
      >
        <Text style={s.actionBtnTxt}>{btnLabel}</Text>
      </TouchableOpacity>

      {attendBonusAvailable && (
        <TouchableOpacity
          style={[s.bonusCard, busy && s.bonusCardDisabled]}
          onPress={doClaimBonus}
          disabled={busy}
          activeOpacity={0.85}
        >
          <Text style={s.bonusTitle}>🎉 7일 연속 출석 달성!</Text>
          <Text style={s.bonusCta}>보너스 토스포인트 {ATTENDANCE_STREAK_BONUS_WON}원 받기</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 18, gap: 12 },
  title: { fontSize: 16, fontWeight: '800', color: '#191F28' },
  sub: { fontSize: 12, color: '#8B95A1', marginTop: -6 },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  dayCell: {
    width: '13%',
    minWidth: 38,
    aspectRatio: 0.78,
    backgroundColor: BG,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  dayCellDone: { backgroundColor: PRIMARY_LIGHT },
  dayCellToday: { borderWidth: 2, borderColor: PRIMARY },
  dayNum: { fontSize: 11, fontWeight: '700', color: '#8B95A1' },
  dayNumDone: { color: PRIMARY },
  dayWon: { fontSize: 9, color: '#B0B8C1' },
  dayWonDone: { color: PRIMARY, fontWeight: '700' },
  dayCheck: { fontSize: 11, color: PRIMARY, fontWeight: '800' },
  dayToday: { fontSize: 9, color: PRIMARY, fontWeight: '800' },
  dayDot: { fontSize: 11, color: '#D1D6DB' },
  actionBtn: { backgroundColor: PRIMARY, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  actionBtnDisabled: { backgroundColor: '#B0B8C1' },
  actionBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  bonusCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  bonusCardDisabled: { opacity: 0.5 },
  bonusTitle: { fontSize: 13, fontWeight: '800', color: '#7A5800' },
  bonusCta: { fontSize: 14, fontWeight: '900', color: '#D18700' },
});
