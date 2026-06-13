# flagup 콘솔용 프로모 이미지 생성
# - 가로 썸네일 1932x828 1장
# - 세로 스크린샷 636x1048 3장 (홈/게임/랭킹 — 실제 인앱 화면 재현)
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(__file__), "promo")
os.makedirs(OUT, exist_ok=True)

PRIMARY = "#1B64DA"
PRIMARY_LIGHT = "#E8F1FF"
BG = "#F4F7FB"
TEXT = "#191F28"
SUB = "#8B95A1"
SUB2 = "#6B7684"
GREY_BTN = "#4E5968"
ORANGE = "#FFB331"
GOLD = "#D18700"
GOLD_BG = "#FFF8E1"
COIN_Y = "#FFC83D"
COIN_E = "#E5A800"

BOLD = r"C:\Windows\Fonts\malgunbd.ttf"
REG = r"C:\Windows\Fonts\malgun.ttf"

def F(size, bold=True):
    return ImageFont.truetype(BOLD if bold else REG, size)

def tw(d, txt, font):
    b = d.textbbox((0, 0), txt, font=font)
    return b[2] - b[0], b[3] - b[1]

def ctext(d, cx, y, txt, font, fill):
    w, _ = tw(d, txt, font)
    d.text((cx - w / 2, y), txt, font=font, fill=fill)

def coin_icon(d, cx, cy, r):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=COIN_Y, outline=COIN_E, width=max(2, r // 8))
    d.ellipse([cx - r * 0.62, cy - r * 0.62, cx + r * 0.62, cy + r * 0.62], outline=COIN_E, width=max(2, r // 10))

def draw_flag_pole(d, x, base_y, pole_h, up, color, bordered=False, scale=1.0):
    """깃대 1개 + 깃발 (앱 components/Flags.tsx 재현)"""
    pw = int(5 * scale)
    fw, fh = int(52 * scale), int(36 * scale)
    d.rounded_rectangle([x, base_y - pole_h, x + pw, base_y], radius=pw // 2, fill="#B0B8C1")
    flag_top = base_y - pole_h + (0 if up else int(pole_h * 0.45))
    box = [x + pw, flag_top, x + pw + fw, flag_top + fh]
    if bordered:
        d.rounded_rectangle(box, radius=int(6 * scale), fill="#FFFFFF", outline="#D1D6DB", width=max(2, int(2 * scale)))
    else:
        d.rounded_rectangle(box, radius=int(6 * scale), fill=color)
    bw, bh = int(17 * scale), int(8 * scale)
    d.rounded_rectangle([x - int(6 * scale), base_y - bh // 2, x - int(6 * scale) + bw, base_y + bh // 2],
                        radius=bh // 2, fill="#8B95A1")

def flags_pair(d, cx, base_y, pole_h, blue_up, white_up, scale=1.0):
    gap = int(120 * scale)
    draw_flag_pole(d, cx - gap // 2 - int(30 * scale), base_y, pole_h, blue_up, PRIMARY, scale=scale)
    draw_flag_pole(d, cx + gap // 2 - int(30 * scale), base_y, pole_h, white_up, "#FFFFFF", bordered=True, scale=scale)

# ============================================================
# 세로 스크린샷 공통
W, H = 636, 1048
PAD = 28

def card(d, x0, y0, x1, y1, fill="#FFFFFF", radius=26, outline=None, width=2):
    d.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=fill, outline=outline, width=width if outline else 0)

# ------------------------------------------------------------
# 스크린샷 1 — 홈 화면
def shot_home():
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    y = 30

    # 코인 지갑 카드
    card(d, PAD, y, W - PAD, y + 110, outline=PRIMARY_LIGHT)
    coin_icon(d, PAD + 46, y + 44, 20)
    d.text((PAD + 78, y + 24), "128", font=F(40), fill=TEXT)
    d.text((PAD + 30, y + 74), "내 코인", font=F(19, False), fill=SUB)
    bw = 250
    d.rounded_rectangle([W - PAD - bw - 22, y + 32, W - PAD - 22, y + 80], radius=16, fill=PRIMARY_LIGHT)
    ctext(d, W - PAD - bw / 2 - 22, y + 44, "토스포인트로 교환 ›", F(21), PRIMARY)
    y += 134

    # 히어로 카드
    hero_h = 564
    card(d, PAD, y, W - PAD, y + hero_h, outline=PRIMARY_LIGHT)
    ctext(d, W / 2, y + 34, "청기백기 순발력 랭킹전", F(35), TEXT)
    ctext(d, W / 2, y + 90, "명령에 맞게 깃발을 올리고 내려요", F(21, False), SUB2)
    ctext(d, W / 2, y + 122, "틀리거나 늦으면 탈락!", F(21, False), SUB2)
    flags_pair(d, W / 2, y + 330, 165, True, False, scale=1.45)
    ctext(d, W / 2, y + 352, "오늘 최고기록 27라운드", F(21), PRIMARY)
    # 시작 버튼
    d.rounded_rectangle([PAD + 28, y + 392, W - PAD - 28, y + 458], radius=22, fill=PRIMARY)
    ctext(d, W / 2, y + 408, "게임 시작하기 (무료 5판)", F(26), "#FFFFFF")
    # 판수 필 3개
    pw3 = (W - PAD * 2 - 56 - 24) / 3
    px = PAD + 28
    for label, cnt, active in [("무료", "5/5", True), ("광고", "10/10", False), ("코인", "10/10", False)]:
        d.rounded_rectangle([px, y + 472, px + pw3, y + 500 + 32], radius=16,
                            fill=PRIMARY_LIGHT if active else BG)
        c = PRIMARY if active else SUB
        ctext(d, px + pw3 / 2, y + 478, label, F(17, False), c)
        ctext(d, px + pw3 / 2, y + 502, cnt, F(20), PRIMARY if active else GREY_BTN)
        px += pw3 + 12
    y += hero_h + 24

    # 메뉴 카드 2개
    for icon, title, sub in [
        ("rank", "주간 랭킹", "이번 주 상위 10명에게 코인 보상!"),
        ("flag", "누적 도전 챌린지", "누적 152판 · 다음 보상 300판"),
    ]:
        card(d, PAD, y, W - PAD, y + 108)
        if icon == "rank":
            # 트로피 약식 (금색 컵)
            cx0, cy0 = PAD + 52, y + 54
            d.ellipse([cx0 - 20, cy0 - 22, cx0 + 20, cy0 + 10], fill=COIN_Y, outline=COIN_E, width=3)
            d.rounded_rectangle([cx0 - 7, cy0 + 8, cx0 + 7, cy0 + 22], radius=3, fill=COIN_E)
            d.rounded_rectangle([cx0 - 16, cy0 + 20, cx0 + 16, cy0 + 27], radius=3, fill=COIN_E)
        else:
            draw_flag_pole(d, PAD + 38, y + 80, 56, True, "#F04452", scale=0.62)
        d.text((PAD + 92, y + 22), title, font=F(24), fill=TEXT)
        d.text((PAD + 92, y + 60), sub, font=F(19, False), fill=SUB)
        d.text((W - PAD - 38, y + 34), "›", font=F(34), fill="#B0B8C1")
        y += 128

    img.save(os.path.join(OUT, "screenshot_1_home_636x1048.png"))

# ------------------------------------------------------------
# 스크린샷 2 — 게임 플레이 (2동작 명령)
def shot_game():
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    y = 52

    d.text((PAD + 6, y), "ROUND 24", font=F(28), fill=PRIMARY)
    rtxt = "성공 23"
    rw, _ = tw(d, rtxt, F(23, False))
    d.text((W - PAD - 6 - rw, y + 4), rtxt, font=F(23, False), fill=SUB2)
    y += 52

    # 타임바 (55% 남음)
    d.rounded_rectangle([PAD + 6, y, W - PAD - 6, y + 14], radius=7, fill="#E5E8EB")
    d.rounded_rectangle([PAD + 6, y, PAD + 6 + (W - PAD * 2 - 12) * 0.55, y + 14], radius=7, fill=PRIMARY)
    y += 44

    # 명령
    ctext(d, W / 2, y, "청기 올리고 백기 내려", F(44), TEXT)
    y += 78
    pw_, ph_ = tw(d, "두 동작! 1/2 입력", F(19))
    d.rounded_rectangle([W / 2 - pw_ / 2 - 20, y, W / 2 + pw_ / 2 + 20, y + 44], radius=22, fill="#FFF1D6")
    ctext(d, W / 2, y + 9, "두 동작! 1/2 입력", F(19), GOLD)
    y += 76

    # 깃발 (청기 올라간 상태 — 1단계 입력 완료)
    flags_pair(d, W / 2, y + 290, 252, True, True, scale=1.75)
    y += 352

    # 버튼 그리드
    bx0, bx1 = PAD, W - PAD
    bw2 = (bx1 - bx0 - 16) / 2
    bh = 86
    def abtn(x, yy, label, color, outline=False):
        if outline:
            d.rounded_rectangle([x, yy, x + bw2, yy + bh], radius=22, fill="#FFFFFF", outline=color, width=4)
            ctext(d, x + bw2 / 2, yy + 26, label, F(27), color)
        else:
            d.rounded_rectangle([x, yy, x + bw2, yy + bh], radius=22, fill=color)
            ctext(d, x + bw2 / 2, yy + 26, label, F(27), "#FFFFFF")
    abtn(bx0, y, "청기 올려", PRIMARY)
    abtn(bx0 + bw2 + 16, y, "청기 내려", PRIMARY, outline=True)
    y += bh + 16
    abtn(bx0, y, "백기 올려", GREY_BTN)
    abtn(bx0 + bw2 + 16, y, "백기 내려", GREY_BTN, outline=True)
    y += bh + 16
    d.rounded_rectangle([bx0, y, bx1, y + 80], radius=22, fill=ORANGE)
    ctext(d, W / 2, y + 22, "가만히!", F(28), "#FFFFFF")

    img.save(os.path.join(OUT, "screenshot_2_game_636x1048.png"))

# ------------------------------------------------------------
# 스크린샷 3 — 주간 랭킹
def shot_rank():
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    y = 30

    # 닉네임 카드
    card(d, PAD, y, W - PAD, y + 104)
    d.text((PAD + 30, y + 20), "내 닉네임", font=F(18, False), fill=SUB)
    d.text((PAD + 30, y + 50), "깃발왕", font=F(25), fill=TEXT)
    d.rounded_rectangle([W - PAD - 120, y + 30, W - PAD - 26, y + 76], radius=15, fill=PRIMARY_LIGHT)
    ctext(d, W - PAD - 73, y + 40, "변경", F(20), PRIMARY)
    y += 126

    # 보상 안내 카드
    card(d, PAD, y, W - PAD, y + 196)
    d.text((PAD + 30, y + 22), "이번 주 랭킹 보상", font=F(23), fill=TEXT)
    pw3 = (W - PAD * 2 - 60 - 24) / 3
    px = PAD + 30
    for rank, coins in [("1위", "+300코인"), ("2~3위", "+200코인"), ("4~10위", "+100코인")]:
        d.rounded_rectangle([px, y + 66, px + pw3, y + 138], radius=16, fill=PRIMARY_LIGHT)
        ctext(d, px + pw3 / 2, y + 78, rank, F(19), PRIMARY)
        ctext(d, px + pw3 / 2, y + 106, coins, F(20), TEXT)
        px += pw3 + 12
    ctext(d, W / 2, y + 154, "매주 월요일 0시에 지난주 순위로 정산돼요", F(17, False), SUB)
    y += 218

    # 리더보드 카드
    card(d, PAD, y, W - PAD, H - 30)
    d.text((PAD + 30, y + 24), "이번 주 TOP 50", font=F(24), fill=TEXT)
    rtxt = "새로고침"
    rw, _ = tw(d, rtxt, F(19))
    d.text((W - PAD - 30 - rw, y + 28), rtxt, font=F(19), fill=PRIMARY)
    yy = y + 70
    d.rounded_rectangle([PAD + 24, yy, W - PAD - 24, yy + 54], radius=14, fill=PRIMARY_LIGHT)
    ctext(d, W / 2, yy + 14, "내 순위 8위 · 주간 최고 31라운드 · 참가자 1,204명", F(18), PRIMARY)
    yy += 76

    rows = [
        (1, "번개손가락", 47, False), (2, "청기마스터", 44, False), (3, "깃발지존", 42, False),
        (4, "순발력왕", 39, False), (5, "백기내려", 38, False), (6, "휙휙휙", 36, False),
        (7, "반응속도0.2", 33, False), (8, "깃발왕", 31, True), (9, "토스왕", 30, False),
    ]
    medal = {1: COIN_Y, 2: "#C7CDD4", 3: "#E2A671"}
    for rank, nick, best, me in rows:
        if me:
            d.rounded_rectangle([PAD + 24, yy - 6, W - PAD - 24, yy + 44], radius=14, fill="#F0F6FF")
        if rank in medal:
            cx0 = PAD + 56
            d.ellipse([cx0 - 18, yy + 2, cx0 + 18, yy + 38], fill=medal[rank])
            ctext(d, cx0, yy + 7, str(rank), F(20), "#FFFFFF")
        else:
            ctext(d, PAD + 56, yy + 6, str(rank), F(22), SUB)
        d.text((PAD + 100, yy + 6), nick + (" (나)" if me else ""), font=F(22, me), fill=PRIMARY if me else "#333D4B")
        btxt = f"{best}라운드"
        bw_, _ = tw(d, btxt, F(22))
        d.text((W - PAD - 30 - bw_, yy + 6), btxt, font=F(22), fill=TEXT)
        yy += 52

    img.save(os.path.join(OUT, "screenshot_3_ranking_636x1048.png"))

# ------------------------------------------------------------
# 가로 썸네일 1932x828
def thumbnail():
    TW_, TH_ = 1932, 828
    img = Image.new("RGB", (TW_, TH_), PRIMARY)
    d = ImageDraw.Draw(img)

    # 배경 장식 원
    d.ellipse([1300, -260, 2200, 640], fill="#2D74E8")
    d.ellipse([1480, -120, 2080, 480], fill="#4385F0")
    d.ellipse([-180, 560, 420, 1160], fill="#2D74E8")

    # 좌측 텍스트
    x = 120
    d.text((x, 200), "청기백기", font=F(150), fill="#FFFFFF")
    d.text((x, 370), "순발력 랭킹전", font=F(150), fill="#A8C8FF")
    d.text((x, 575), "명령대로 깃발 올리고 내려!  매주 랭킹에 도전하세요", font=F(44, False), fill="#D7E5FF")

    # 좌측 하단 버튼 모사 (게임 느낌)
    by = 668
    bx = x
    for label, fill, txtc in [("청기 올려", "#FFFFFF", PRIMARY), ("백기 내려", "#163E85", "#FFFFFF"), ("가만히!", ORANGE, "#FFFFFF")]:
        bw_, _ = tw(d, label, F(36))
        d.rounded_rectangle([bx, by, bx + bw_ + 76, by + 84], radius=24, fill=fill)
        d.text((bx + 38, by + 16), label, font=F(36), fill=txtc)
        bx += bw_ + 76 + 26

    # 우측 깃발 일러스트 — 밝은 원판 위에 올려 청기 색이 보이게
    d.ellipse([1330, 90, 2010, 770], fill="#F0F6FF")
    base_y, pole_h, sc = 700, 480, 3.4
    draw_flag_pole(d, 1460, base_y, pole_h, True, PRIMARY, bordered=False, scale=sc)  # 청기 올림
    draw_flag_pole(d, 1720, base_y, pole_h, False, "#FFFFFF", bordered=True, scale=sc)  # 백기 내림
    # 모션 라인
    for i, (mx, my, ln) in enumerate([(1330, 300, 70), (1310, 360, 50), (1340, 420, 60)]):
        d.rounded_rectangle([mx - ln, my, mx, my + 12], radius=6, fill="#A8C8FF")

    img.save(os.path.join(OUT, "thumbnail_1932x828.png"))

shot_home()
shot_game()
shot_rank()
thumbnail()
print("done:", os.listdir(OUT))
