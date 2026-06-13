// 토스 로그인 약관 등록용 동의문 (외부 URL 호스팅). Worker의 /terms, /privacy 로 서빙.
// ⚠️ 사업자 정보(운영자명/연락처)는 실제 값으로 채우고, 출시 전 법률 검토를 권장합니다.

const SERVICE = '청기백기 순발력 랭킹전';
const OPERATOR = '[운영자명]'; // TODO: 실제 사업자/운영자명으로 교체
const CONTACT = 'jameslee0206@gmail.com';
const EFFECTIVE = '2026년 6월 14일';

function page(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} | ${SERVICE}</title>
<style>
  :root { color-scheme: light; }
  body { margin:0; background:#F4F7FB; color:#191F28;
    font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;
    line-height:1.7; }
  .wrap { max-width:720px; margin:0 auto; padding:28px 20px 64px; }
  h1 { font-size:22px; margin:0 0 4px; }
  .meta { color:#8B95A1; font-size:13px; margin-bottom:24px; }
  h2 { font-size:16px; margin:28px 0 8px; color:#1B64DA; }
  p, li { font-size:14px; color:#333D4B; }
  ul { padding-left:20px; }
  table { border-collapse:collapse; width:100%; margin:8px 0; font-size:13px; }
  th, td { border:1px solid #E5E8EB; padding:8px 10px; text-align:left; vertical-align:top; }
  th { background:#EEF3FA; }
  .foot { margin-top:32px; color:#8B95A1; font-size:13px; }
</style>
</head>
<body><div class="wrap">${bodyHtml}
<p class="foot">문의: ${CONTACT}<br>시행일: ${EFFECTIVE}</p>
</div></body></html>`;
}

export const TERMS_HTML = page(
  '서비스 이용약관',
  `<h1>서비스 이용약관</h1>
<p class="meta">${SERVICE}</p>

<h2>제1조 (목적)</h2>
<p>본 약관은 ${OPERATOR}(이하 "운영자")가 앱인토스 미니앱으로 제공하는 "${SERVICE}"(이하 "서비스")의 이용과 관련하여 운영자와 이용자 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.</p>

<h2>제2조 (정의)</h2>
<ul>
<li>"이용자"란 본 약관에 동의하고 서비스를 이용하는 토스 회원을 말합니다.</li>
<li>"코인"이란 서비스 내에서 게임 활동을 통해 획득하는 앱 내 가상 재화로, 현금이 아니며 정해진 조건에 따라 토스포인트로 교환할 수 있는 수단을 말합니다.</li>
<li>"랭킹"이란 이용자의 게임 기록을 기준으로 산정·노출되는 순위를 말합니다.</li>
</ul>

<h2>제3조 (약관의 효력 및 변경)</h2>
<ul>
<li>본 약관은 서비스 화면 또는 연결된 링크에 게시함으로써 효력이 발생합니다.</li>
<li>운영자는 관련 법령을 위반하지 않는 범위에서 약관을 변경할 수 있으며, 변경 시 적용일자와 사유를 사전에 공지합니다.</li>
</ul>

<h2>제4조 (서비스의 제공)</h2>
<p>운영자는 순발력 게임, 코인 적립 및 교환, 주간 랭킹, 인앱결제(광고 프리패스) 등의 기능을 제공합니다. 일부 기능은 토스 로그인 연동 시 이용할 수 있습니다.</p>

<h2>제5조 (서비스의 변경 및 중단)</h2>
<p>운영자는 운영상·기술상 필요에 따라 서비스의 전부 또는 일부를 변경하거나 중단할 수 있으며, 이 경우 사전에 공지하되 부득이한 경우 사후에 공지할 수 있습니다.</p>

<h2>제6조 (이용자의 의무 및 부정행위 금지)</h2>
<ul>
<li>이용자는 자동화 프로그램, 비정상적인 요청 조작, 기록 위·변조 등 서비스의 정상 운영을 방해하는 행위를 해서는 안 됩니다.</li>
<li>부정한 방법으로 기록을 등록하거나 보상을 취득한 경우 운영자는 사전 통지 없이 해당 기록·코인·보상을 제외 또는 회수할 수 있습니다.</li>
</ul>

<h2>제7조 (코인 및 보상)</h2>
<ul>
<li>코인은 현금성·환가성 재화가 아니며, 서비스가 정한 단위·한도에 따라 토스포인트로 교환할 수 있습니다.</li>
<li>코인 지급량과 교환 한도는 모든 이용자에게 동일하게 적용됩니다.</li>
<li>주간 랭킹 보상은 순위 구간에 따라 토스포인트로 지급될 수 있으며, 구체적 금액과 정산 시점은 서비스 화면에 안내합니다.</li>
<li>코인 및 보상은 서비스 종료, 이용자의 탈퇴·로그인 연결 해제, 부정행위 적발 등의 사유로 소멸될 수 있습니다.</li>
</ul>

<h2>제8조 (인앱결제 및 환불)</h2>
<p>유료 상품(광고 프리패스 등)의 결제 및 환불은 앱마켓(Apple, Google) 및 앱인토스의 정책을 따릅니다. 환불 시 해당 상품으로 제공된 혜택은 회수될 수 있습니다.</p>

<h2>제9조 (책임의 제한)</h2>
<p>운영자는 천재지변, 토스·앱마켓 등 외부 플랫폼의 장애, 이용자의 귀책사유로 인한 손해에 대하여 관련 법령이 허용하는 범위에서 책임을 지지 않습니다.</p>

<h2>제10조 (분쟁 해결 및 준거법)</h2>
<p>본 약관은 대한민국 법령에 따라 해석되며, 서비스 이용과 관련한 분쟁은 관련 법령에 정한 절차에 따릅니다.</p>`,
);

export const PRIVACY_HTML = page(
  '개인정보 수집·이용 동의',
  `<h1>개인정보 수집·이용 동의</h1>
<p class="meta">${SERVICE}</p>

<p>운영자는 「개인정보 보호법」 등 관련 법령에 따라 아래와 같이 개인정보를 수집·이용합니다. 이용자는 동의를 거부할 권리가 있으며, 거부 시 아래 일부 기능 이용이 제한될 수 있습니다.</p>

<h2>1. 수집 항목</h2>
<table>
<tr><th>구분</th><th>항목</th></tr>
<tr><td>토스 로그인</td><td>사용자 식별자(userKey)</td></tr>
<tr><td>서비스 이용</td><td>기기 식별값, 닉네임, 게임 기록(라운드·반응속도), 코인 잔액 및 보상 내역</td></tr>
</table>
<p>이름·연락처·생년월일 등 민감한 개인정보는 수집하지 않습니다.</p>

<h2>2. 수집·이용 목적</h2>
<ul>
<li>이용자 식별 및 기기 변경·재설치 시 데이터(코인·기록) 연속성 제공</li>
<li>주간 랭킹 산정 및 노출</li>
<li>코인 교환·랭킹 보상(토스포인트) 지급 및 부정행위 방지</li>
</ul>

<h2>3. 보유·이용 기간</h2>
<p>수집한 개인정보는 회원 탈퇴 또는 토스 로그인 연결 해제 시 지체 없이 파기합니다. 다만 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.</p>

<h2>4. 제3자 제공</h2>
<p>코인 교환 및 랭킹 보상의 토스포인트 지급을 위하여 필요한 범위에서 토스(비바리퍼블리카)에 관련 정보가 처리될 수 있습니다.</p>

<h2>5. 동의 거부 권리 및 불이익</h2>
<p>이용자는 본 동의를 거부할 수 있습니다. 다만 토스 로그인 연동을 거부하는 경우, 기기 변경·재설치 시 코인·기록 유지 등 로그인 기반 기능의 이용이 제한될 수 있습니다.</p>`,
);
