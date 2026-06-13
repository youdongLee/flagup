import { loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/framework';
import { useRef, useState } from 'react';
import { Alert } from 'react-native';
import { AD_PLAY_IDS } from '../data/ads';
import { COIN_PLAY_COST } from '../data/commands';
import { useGame } from '../stores/GameContext';
import { useFallbackAd } from './useFallbackAd';

// 판 시작 게이트: 무료 → 광고 충전 → 코인 구매 순서로 소비
// 홈과 결과 화면("다시 도전")에서 공유
export function usePlayGate(goGame: () => void, restartLabel = false) {
  const { coins, freeLeft, adLeft, coinLeft, nextSource, startPlay } = useGame();
  const adSupported = loadFullScreenAd.isSupported() && showFullScreenAd.isSupported();
  const { adLoaded, activeAdId, reload } = useFallbackAd(AD_PLAY_IDS, adSupported);
  const [processing, setProcessing] = useState(false);
  const earnedRef = useRef(false);

  const startFree = async () => {
    if (await startPlay('free')) goGame();
  };

  const startWithAd = () => {
    if (!adSupported || !activeAdId) {
      // 개발 환경: 광고 미지원 시 바로 진행
      startPlay('ad').then((ok) => ok && goGame());
      return;
    }
    if (!adLoaded) {
      Alert.alert('광고 준비 중이에요', '잠시 후 다시 시도해주세요.');
      return;
    }
    Alert.alert('광고 보고 1판 시작', '광고를 보면 1판을 더 진행할 수 있어요. 광고를 볼까요?', [
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
                if (earnedRef.current && (await startPlay('ad'))) goGame();
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

  const startWithCoin = () => {
    if (coins < COIN_PLAY_COST) {
      Alert.alert('코인이 부족해요', `${COIN_PLAY_COST}코인이 필요해요. 게임으로 코인을 모아보세요!`);
      return;
    }
    Alert.alert('코인으로 1판 시작', `${COIN_PLAY_COST}코인을 사용해 1판을 시작할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '시작하기',
        onPress: async () => {
          if (await startPlay('coin')) goGame();
          else Alert.alert('시작할 수 없어요', '코인이 부족하거나 오늘 판수를 모두 사용했어요.');
        },
      },
    ]);
  };

  const onPressStart = () => {
    if (processing) return;
    if (nextSource === 'free') startFree();
    else if (nextSource === 'ad') startWithAd();
    else if (nextSource === 'coin') startWithCoin();
  };

  const verb = restartLabel ? '다시 도전' : '게임 시작하기';
  const label = processing
    ? '광고 재생 중...'
    : nextSource === 'free'
    ? `${verb} (무료 ${freeLeft}판)`
    : nextSource === 'ad'
    ? `광고 보고 ${restartLabel ? '다시 도전' : '1판 시작'}`
    : nextSource === 'coin'
    ? `${COIN_PLAY_COST}코인으로 ${restartLabel ? '다시 도전' : '1판 시작'}`
    : '오늘 판수를 모두 사용했어요';

  return { nextSource, processing, label, onPressStart, freeLeft, adLeft, coinLeft };
}
