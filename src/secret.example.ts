// 이 파일을 src/secret.ts 로 복사한 뒤 실제 값을 넣으세요.
// 앱-서버 점수 서명용 공유 시크릿으로, 서버의 wrangler secret APP_SECRET과 반드시 동일해야 합니다.
// 값 생성 예: PowerShell
//   $b=New-Object byte[] 16;[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b);
//   'fu_'+(($b|%{$_.ToString('x2')}) -join '')
export const APP_SECRET = 'fu_REPLACE_WITH_YOUR_SECRET';
