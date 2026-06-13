# 인앱결제 상품 이미지 (1024x1024) — 광고 프리패스 30일
# 정책: 식별 텍스트("30일 이용권") 허용, 코인/포인트 언급 금지
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(__file__), "promo")
os.makedirs(OUT, exist_ok=True)

PRIMARY = "#1B64DA"
BOLD = r"C:\Windows\Fonts\malgunbd.ttf"


def F(size):
    return ImageFont.truetype(BOLD, size)


def ctext(d, cx, y, txt, font, fill):
    b = d.textbbox((0, 0), txt, font=font)
    d.text((cx - (b[2] - b[0]) / 2, y), txt, font=font, fill=fill)


S = 1024
img = Image.new("RGB", (S, S), PRIMARY)
d = ImageDraw.Draw(img)

# 배경 장식 원
d.ellipse([-220, -260, 420, 380], fill="#2D74E8")
d.ellipse([660, 700, 1280, 1320], fill="#2D74E8")
d.ellipse([760, -180, 1240, 300], fill="#4385F0")

# 티켓 카드 (그림자 + 본체)
tx0, ty0, tx1, ty1 = 132, 200, 892, 824
d.rounded_rectangle([tx0 + 12, ty0 + 20, tx1 + 12, ty1 + 20], radius=48, fill="#114398")
d.rounded_rectangle([tx0, ty0, tx1, ty1], radius=48, fill="#FFFFFF")

# 티켓 노치 (좌우 반원 홈) — 절취선 위치
notch_y = ty0 + 396
nr = 34
d.ellipse([tx0 - nr, notch_y - nr, tx0 + nr, notch_y + nr], fill=PRIMARY)
d.ellipse([tx1 - nr, notch_y - nr, tx1 + nr, notch_y + nr], fill=PRIMARY)

# 절취 점선
x = tx0 + nr + 26
while x < tx1 - nr - 26:
    d.rounded_rectangle([x, notch_y - 4, x + 26, notch_y + 4], radius=4, fill="#D6DEE8")
    x += 46

# 번개 아이콘 (노란색, 티켓 상단 중앙 — 제목과 겹치지 않게 작게)
cx, top = (tx0 + tx1) / 2, ty0 + 52
sc = 1.05
bolt = [(62, 0), (16, 78), (47, 78), (4, 158), (96, 62), (58, 62), (104, 0)]
pts = [(px * sc, top + py * sc) for px, py in bolt]
min_x = min(p[0] for p in pts)
max_x = max(p[0] for p in pts)
off = cx - (min_x + max_x) / 2
pts = [(p[0] + off, p[1]) for p in pts]
d.polygon(pts, fill="#FFC83D", outline="#E5A800")

# 텍스트 (상단 영역)
ctext(d, cx, ty0 + 254, "광고 프리패스", F(68), "#191F28")

# 하단 영역
ctext(d, cx, notch_y + 44, "30일 이용권", F(88), PRIMARY)
ctext(d, cx, notch_y + 168, "광고 시청 없이 바로 진행", F(36), "#8B95A1")

img.save(os.path.join(OUT, "iap_pass30_1024.png"))
print("saved iap_pass30_1024.png")
