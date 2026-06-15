import { useEffect, useRef, useState } from 'react';
import { pingPresence, serverEnabled } from './server';

// 60초마다 하트비트를 보내 현재 이용자 수를 갱신. 화면 마운트 동안 동작.
// (홈이 스택에 남아 있으면 게임 중에도 핑이 유지돼 인게임 유저도 집계됨)
export function useLiveUsers(): number | null {
  const [online, setOnline] = useState<number | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    if (!serverEnabled()) return;
    alive.current = true;
    const tick = async () => {
      const n = await pingPresence();
      if (alive.current && n !== null) setOnline(n);
    };
    tick();
    const t = setInterval(tick, 60_000);
    return () => {
      alive.current = false;
      clearInterval(t);
    };
  }, []);

  return online;
}
