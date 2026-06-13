import { InlineAd } from '@apps-in-toss/framework';
import { grantPromotionReward } from '@apps-in-toss/native-modules';
import { createRoute } from '@granite-js/react-native';
import React, { useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BANNER_SUB, IMAGE_AD, PROMO_EXCHANGE } from '../data/ads';
import { isGrantSuccess } from '../src/server';
import { LOGIN_ENABLED } from '../src/login';
import { DAILY_EXCHANGE_LIMIT, EXCHANGE_UNIT, useGame } from '../stores/GameContext';

export const Route = createRoute('/exchange', { component: ExchangePage });

const PRIMARY = '#1B64DA';
const PRIMARY_LIGHT = '#E8F1FF';
const BG = '#F4F7FB';

function ExchangePage() {
  const { coins, totalExchanged, exchangeCountToday, canExchange, exchangeCoins, addCoins, isLoggedIn, loginAndRestore } = useGame();
  const [processing, setProcessing] = useState(false);
  const lock = useRef(false);

  const promptLogin = () => {
    Alert.alert(
      '토스 로그인이 필요해요',
      '로그인하면 기기를 바꿔도 코인이 유지되고, 토스포인트로 교환할 수 있어요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '토스 로그인',
          onPress: async () => {
            const ok = await loginAndRestore();
            if (!ok) Alert.alert('로그인하지 못했어요', '잠시 후 다시 시도해 주세요.');
          },
        },
      ],
    );
  };

  const notEnoughCoins = coins < EXCHANGE_UNIT;
  const limitReached = exchangeCountToday >= DAILY_EXCHANGE_LIMIT;

  const onExchange = async () => {
    if (lock.current || processing) return;
    // 토스 로그인 활성화 시, 교환 전 로그인 필요 (현금화 직전이 로그인 권유 시점)
    if (LOGIN_ENABLED && !isLoggedIn) {
      promptLogin();
      return;
    }
    lock.current = true;
    setProcessing(true);
    try {
      const result = await exchangeCoins();
      if (result === 'coins') {
        Alert.alert('코인이 부족해요', `${EXCHANGE_UNIT}코인부터 교환할 수 있어요.`);
        return;
      }
      if (result === 'limit') {
        Alert.alert('오늘 교환 한도를 모두 사용했어요', `내일 다시 교환할 수 있어요. (하루 ${DAILY_EXCHANGE_LIMIT}회)`);
        return;
      }
      // grantPromotionReward는 실패해도 throw하지 않으므로 반환값을 검사한다.
      let ok = false;
      try {
        const grant = await grantPromotionReward({
          params: { promotionCode: PROMO_EXCHANGE, amount: EXCHANGE_UNIT },
        });
        ok = isGrantSuccess(grant);
      } catch {
        ok = false;
      }
      if (ok) {
        Alert.alert('교환 완료!', `${EXCHANGE_UNIT}코인을 토스포인트 ${EXCHANGE_UNIT}원으로 교환했어요.`);
      } else {
        // 지급 실패 → 차감한 코인을 환불 (토스포인트는 지급되지 않음)
        await addCoins(EXCHANGE_UNIT);
        Alert.alert('교환에 실패했어요', '코인이 반환됐어요. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setProcessing(false);
      lock.current = false;
    }
  };

  const btnDisabled = processing || !canExchange;
  const btnLabel = processing
    ? '교환 중...'
    : limitReached
    ? '오늘 교환 한도 소진'
    : notEnoughCoins
    ? `${EXCHANGE_UNIT}코인부터 교환 가능`
    : `${EXCHANGE_UNIT}코인 → 토스포인트 ${EXCHANGE_UNIT}원 교환`;

  return (
    <View style={s.root}>
      <View style={s.bannerWrap}>
        <InlineAd adGroupId={BANNER_SUB} variant="expanded" impressFallbackOnMount />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.walletCard}>
          <Text style={s.walletCaption}>내 코인</Text>
          <View style={s.balanceRow}>
            <Text style={s.coinIcon}>🪙</Text>
            <Text style={s.balanceNumber}>{coins}</Text>
            <Text style={s.balanceUnit}>코인</Text>
          </View>
          <Text style={s.balanceSub}>{EXCHANGE_UNIT}코인 = {EXCHANGE_UNIT}토스포인트</Text>

          <TouchableOpacity
            style={[s.exchangeBtn, btnDisabled && s.exchangeBtnDisabled]}
            onPress={onExchange}
            disabled={btnDisabled}
            activeOpacity={0.85}
          >
            <Text style={s.exchangeBtnTxt}>{btnLabel}</Text>
          </TouchableOpacity>

          <Text style={s.metaTxt}>
            오늘 {exchangeCountToday}/{DAILY_EXCHANGE_LIMIT}회 교환
            {totalExchanged > 0 ? ` · 누적 ${totalExchanged}원` : ''}
          </Text>
          {limitReached && (
            <Text style={s.limitTxt}>오늘 교환 한도(하루 {DAILY_EXCHANGE_LIMIT}회)를 모두 사용했어요</Text>
          )}
        </View>

        <View style={s.guideCard}>
          <Text style={s.guideTitle}>코인 모으는 방법</Text>
          <Text style={s.guideRow}>🎮 게임 1판 완료 +1코인</Text>
          <Text style={s.guideRow}>🎉 일일 최고기록 보너스 +2~5코인</Text>
          <Text style={s.guideRow}>🚩 누적 판수 챌린지 +5~100코인</Text>
          <Text style={s.guideHint}>🏆 주간 랭킹 TOP 10은 토스포인트로 바로 지급돼요</Text>
        </View>

        <View style={s.imageAdWrap}>
          <InlineAd adGroupId={IMAGE_AD} variant="expanded" impressFallbackOnMount />
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  bannerWrap: { overflow: 'hidden', backgroundColor: BG },
  scroll: { flex: 1 },
  content: { paddingTop: 16, paddingBottom: 32, paddingHorizontal: 16, gap: 12 },
  walletCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: PRIMARY_LIGHT,
    alignItems: 'center',
    gap: 6,
  },
  walletCaption: { fontSize: 12, color: '#8B95A1' },
  balanceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  coinIcon: { fontSize: 28, marginBottom: 6 },
  balanceNumber: { fontSize: 48, lineHeight: 54, fontWeight: '800', color: PRIMARY },
  balanceUnit: { fontSize: 16, fontWeight: '600', color: '#8B95A1', marginBottom: 8 },
  balanceSub: { fontSize: 13, color: '#8B95A1', marginTop: 2 },
  exchangeBtn: {
    alignSelf: 'stretch',
    marginTop: 16,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  exchangeBtnDisabled: { opacity: 0.5 },
  exchangeBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
  metaTxt: { fontSize: 12, color: '#8B95A1', marginTop: 12 },
  limitTxt: { fontSize: 12, color: PRIMARY, marginTop: 2, textAlign: 'center' },
  guideCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, gap: 8 },
  guideTitle: { fontSize: 14, fontWeight: '800', color: '#191F28', marginBottom: 2 },
  guideRow: { fontSize: 13, color: '#4E5968', lineHeight: 19 },
  guideHint: { fontSize: 13, color: PRIMARY, fontWeight: '700', lineHeight: 19, marginTop: 2 },
  imageAdWrap: { overflow: 'hidden', borderRadius: 12 },
});
