import { createRoute } from '@granite-js/react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { PASS_DURATION_MS, PASS_ENABLED, PASS_SKU, useGame } from '../stores/GameContext';

export const Route = createRoute('/pass', { component: PassPage });

const PRIMARY = '#1B64DA';
const BG = '#F4F7FB';

// 인앱결제 모듈은 SDK 버전에 따라 노출 형태가 다를 수 있어 방어적으로 로드한다.
// (PASS_ENABLED가 false인 동안에는 어떤 경로로도 호출되지 않음)
function getIap(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fw: any = require('@apps-in-toss/framework');
    return fw?.IAP ?? null;
  } catch {
    return null;
  }
}

function PassPage() {
  const { hasPass, passUntil, activatePass } = useGame();
  const [price, setPrice] = useState('990원');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!PASS_ENABLED) return;
    (async () => {
      try {
        const iap = getIap();
        const res = await iap?.getProductItemList?.();
        const item = res?.products?.find((p: any) => p.sku === PASS_SKU);
        if (item?.displayAmount) setPrice(item.displayAmount);
      } catch {}
    })();
  }, []);

  const grantPass = async () => {
    const base = passUntil > Date.now() ? passUntil : Date.now();
    await activatePass(base + PASS_DURATION_MS);
  };

  const onPurchase = () => {
    if (processing) return;
    const iap = getIap();
    if (!iap?.createOneTimePurchaseOrder) {
      Alert.alert('구매를 사용할 수 없어요', '앱을 최신 버전으로 업데이트해주세요.');
      return;
    }
    setProcessing(true);
    try {
      iap.createOneTimePurchaseOrder({
        options: {
          sku: PASS_SKU,
          processProductGrant: async () => {
            await grantPass();
            return true;
          },
        },
        onEvent: (event: any) => {
          setProcessing(false);
          if (event?.type === 'success') {
            Alert.alert('구매 완료!', '광고 프리패스 30일이 시작됐어요.');
          }
        },
        onError: () => {
          setProcessing(false);
          Alert.alert('결제에 실패했어요', '잠시 후 다시 시도해주세요.');
        },
      });
    } catch {
      setProcessing(false);
      Alert.alert('결제에 실패했어요', '잠시 후 다시 시도해주세요.');
    }
  };

  const onRestore = async () => {
    const iap = getIap();
    if (!iap) return;
    try {
      // 1) 미결 주문 복원 (결제됐지만 지급 안 된 건)
      const pending = await iap.getPendingOrders?.();
      const pendingList: any[] = pending?.orders ?? pending ?? [];
      for (const order of pendingList) {
        if (order?.sku === PASS_SKU && order?.orderId) {
          await grantPass();
          await iap.completeProductGrant?.({ params: { orderId: order.orderId } });
          Alert.alert('복원 완료', '광고 프리패스가 복원됐어요.');
          return;
        }
      }
      // 2) 기기 변경 복원 (최근 30일 내 결제 완료 건) — 구매 시각 필드는 `date`
      const completed = await iap.getCompletedOrRefundedOrders?.();
      const completedList: any[] = completed?.orders ?? completed ?? [];
      const recent = completedList.find((o: any) => {
        const when = o?.date ?? o?.purchasedAt;
        return (
          o?.sku === PASS_SKU &&
          o?.status === 'COMPLETED' &&
          when &&
          Date.now() - new Date(when).getTime() < PASS_DURATION_MS
        );
      });
      if (recent) {
        const when = recent.date ?? recent.purchasedAt;
        await activatePass(new Date(when).getTime() + PASS_DURATION_MS);
        Alert.alert('복원 완료', '광고 프리패스가 복원됐어요.');
        return;
      }
      Alert.alert('복원할 구매가 없어요', '최근 30일 내 구매 내역이 없어요.');
    } catch {
      Alert.alert('복원에 실패했어요', '잠시 후 다시 시도해주세요.');
    }
  };

  if (!PASS_ENABLED) {
    return (
      <View style={s.root}>
        <View style={s.emptyCard}>
          <Text style={s.emptyEmoji}>⚡</Text>
          <Text style={s.emptyTxt}>광고 프리패스는 준비 중이에요{'\n'}곧 만나요!</Text>
        </View>
      </View>
    );
  }

  const daysLeft = hasPass ? Math.ceil((passUntil - Date.now()) / (24 * 60 * 60 * 1000)) : 0;

  return (
    <View style={s.root}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.heroCard}>
          <Text style={s.heroEmoji}>⚡</Text>
          <Text style={s.heroTitle}>광고 프리패스 30일</Text>
          <Text style={s.heroPrice}>{price}</Text>
          {hasPass && <Text style={s.activeTxt}>사용 중 · {daysLeft}일 남음</Text>}
        </View>

        <View style={s.benefitCard}>
          <Text style={s.benefitTitle}>패스 혜택</Text>
          <Text style={s.benefitRow}>✓ 게임 완료 코인을 광고 시청 없이 바로 받아요</Text>
          <Text style={s.benefitRow}>✓ 30일 동안 적용돼요 (기간 중 재구매 시 연장)</Text>
          <Text style={s.noteTxt}>
            코인 지급량과 교환 한도는 패스와 관계없이 모든 사용자에게 동일해요.{'\n'}
            판 충전·이어하기 광고와 배너 광고는 패스 적용 대상이 아니에요.
          </Text>
        </View>

        <TouchableOpacity
          style={[s.buyBtn, processing && s.buyBtnDisabled]}
          onPress={onPurchase}
          disabled={processing}
          activeOpacity={0.85}
        >
          <Text style={s.buyBtnTxt}>
            {processing ? '결제 진행 중...' : hasPass ? `30일 연장하기 (${price})` : `구매하기 (${price})`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.restoreBtn} onPress={onRestore} activeOpacity={0.7}>
          <Text style={s.restoreTxt}>구매 복원 (기기 변경 시)</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  emptyCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyEmoji: { fontSize: 38 },
  emptyTxt: { fontSize: 14, color: '#8B95A1', textAlign: 'center', lineHeight: 21 },

  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 26,
    alignItems: 'center',
    gap: 4,
  },
  heroEmoji: { fontSize: 38 },
  heroTitle: { fontSize: 19, fontWeight: '800', color: '#191F28', marginTop: 6 },
  heroPrice: { fontSize: 24, fontWeight: '900', color: PRIMARY, marginTop: 2 },
  activeTxt: { fontSize: 13, fontWeight: '700', color: '#22A557', marginTop: 6 },

  benefitCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, gap: 8 },
  benefitTitle: { fontSize: 14, fontWeight: '800', color: '#191F28' },
  benefitRow: { fontSize: 13, color: '#4E5968', lineHeight: 19 },
  noteTxt: { fontSize: 11, color: '#8B95A1', lineHeight: 17, marginTop: 6 },

  buyBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buyBtnDisabled: { opacity: 0.5 },
  buyBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
  restoreBtn: { alignItems: 'center', paddingVertical: 8 },
  restoreTxt: { fontSize: 13, color: '#8B95A1', textDecorationLine: 'underline' },
});
