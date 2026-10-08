import os
import textwrap
from PIL import Image, ImageDraw, ImageFont

def get_font(font_names, size):
    for fn in font_names:
        if os.path.exists(fn):
            try:
                return ImageFont.truetype(fn, size)
            except Exception:
                pass
    return ImageFont.load_default()

bold_cands = [
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
    '/usr/share/fonts/truetype/ubuntu/UbuntuSans-Bold.ttf',
]
reg_cands = [
    '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/truetype/ubuntu/UbuntuSans-Regular.ttf',
]
mono_cands = [
    '/usr/share/fonts/truetype/ubuntu/UbuntuSansMono-Italic[wght].ttf',
    '/usr/share/fonts/truetype/ubuntu/UbuntuMono-R.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',
]

def render_procedural_dark_canvas(width=1200, height=630):
    """Creates a silky, elite dark tactical Swiss engineering background."""
    # Base background #0E1015 (slate obsidian)
    base = Image.new('RGBA', (width, height), (14, 16, 22, 255))
    
    # 1. Subtle, silky background glow (deep indigo/cyan ambient)
    glow = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    cx, cy = 300, 200
    for r in range(500, 0, -25):
        alpha = int((1 - (r / 500)) * 22)
        glow_draw.ellipse(
            [(cx - r, cy - int(r * 0.65)), (cx + r, cy + int(r * 0.65))],
            fill=(29, 78, 216, alpha)
        )
    base = Image.alpha_composite(base, glow)

    # 2. Very subtle tactical grid (barely visible, sophisticated engineering texture)
    grid = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    grid_draw = ImageDraw.Draw(grid)
    
    # 40px grid spacing with ultra-soft alpha (3%-5%)
    for x in range(40, width, 40):
        alpha = 14 if (x % 200 == 0) else 6
        grid_draw.line([(x, 0), (x, height)], fill=(148, 163, 184, alpha), width=1)
        
    for y in range(40, height, 40):
        alpha = 14 if (y % 200 == 0) else 6
        grid_draw.line([(0, y), (width, y)], fill=(148, 163, 184, alpha), width=1)

    # Crosshairs at 200px intersections
    for x in range(200, width, 200):
        for y in range(200, height, 200):
            grid_draw.line([(x - 3, y), (x + 3, y)], fill=(59, 130, 246, 50), width=1)
            grid_draw.line([(x, y - 3), (x, y + 3)], fill=(59, 130, 246, 50), width=1)

    base = Image.alpha_composite(base, grid)
    draw = ImageDraw.Draw(base)

    # 3. Outer border with tactical corner brackets
    draw.rectangle([(24, 24), (width - 24, height - 24)], outline=(30, 41, 59, 255), width=1)
    b_len = 20
    b_col = (59, 130, 246, 255) # Tactical blue accent
    draw.line([(20, 20), (20 + b_len, 20)], fill=b_col, width=2)
    draw.line([(20, 20), (20, 20 + b_len)], fill=b_col, width=2)
    draw.line([(width - 20, 20), (width - 20 - b_len, 20)], fill=b_col, width=2)
    draw.line([(width - 20, 20), (width - 20, 20 + b_len)], fill=b_col, width=2)
    draw.line([(20, height - 20), (20 + b_len, height - 20)], fill=b_col, width=2)
    draw.line([(20, height - 20), (20, height - 20 - b_len)], fill=b_col, width=2)
    draw.line([(width - 20, height - 20), (width - 20 - b_len, height - 20)], fill=b_col, width=2)
    draw.line([(width - 20, height - 20), (width - 20, height - 20 - b_len)], fill=b_col, width=2)

    return base

def build_default_site_og(output_path):
    width, height = 1200, 630
    canvas = render_procedural_dark_canvas(width, height)
    draw = ImageDraw.Draw(canvas)

    font_brand = get_font(bold_cands, 16)
    font_brand_sub = get_font(bold_cands, 12)
    font_title = get_font(bold_cands, 50)
    font_sub = get_font(bold_cands, 24)
    font_body = get_font(reg_cands, 20)
    font_badge = get_font(bold_cands, 13)

    # Header: Optical Lens Icon + Brand + Domain Pill
    cx, cy = 68, 64
    draw.ellipse([(cx - 16, cy - 16), (cx + 16, cy + 16)], outline=(226, 232, 240), width=2)
    draw.ellipse([(cx - 7, cy - 7), (cx + 7, cy + 7)], outline=(59, 130, 246), width=2)
    draw.ellipse([(cx - 2, cy - 2), (cx + 2, cy + 2)], fill=(59, 130, 246))
    draw.line([(cx, cy - 22), (cx, cy - 18)], fill=(226, 232, 240), width=2)
    draw.line([(cx, cy + 18), (cx, cy + 22)], fill=(226, 232, 240), width=2)
    draw.line([(cx - 22, cy), (cx - 18, cy)], fill=(226, 232, 240), width=2)
    draw.line([(cx + 18, cy), (cx + 22, cy)], fill=(226, 232, 240), width=2)

    draw.text((102, 46), "LENS // ALPEREN TOKER", font=font_brand, fill=(248, 250, 252))
    draw.text((102, 70), "ARAŞTIRMA & MÜHENDİSLİK GÜNLÜĞÜ", font=font_brand_sub, fill=(148, 163, 184))

    # Domain Pill on Top Right
    bx1, by1 = width - 210, 48
    draw.rounded_rectangle([(bx1, by1), (bx1 + 150, by1 + 34)], radius=6, fill=(18, 24, 38), outline=(59, 130, 246), width=1)
    draw.ellipse([(bx1 + 12, by1 + 13), (bx1 + 19, by1 + 20)], fill=(16, 185, 129))
    draw.text((bx1 + 28, by1 + 9), "lens.atoker.dev", font=font_badge, fill=(147, 197, 253))

    # Clean dividing line
    draw.line([(56, 110), (width - 56, 110)], fill=(30, 41, 59), width=1)

    # Main Headline
    draw.text((56, 150), "LENS", font=font_title, fill=(255, 255, 255))
    draw.text((212, 152), "//", font=font_title, fill=(59, 130, 246))
    draw.text((280, 150), "Mühendislik & Araştırma", font=font_title, fill=(241, 245, 249))

    # Subtitle
    sub = "Bilgisayarlı Görü · Derin Öğrenme · Kenar Yapay Zeka · Sensör Füzyonu"
    draw.text((56, 226), sub, font=font_sub, fill=(96, 165, 250))

    # Description
    desc = "Otonom sistemler, hedef tespiti, model optimizasyonu (TensorRT/INT8)\nve EO/IR sensör mimarileri üzerine deneysel raporlar ve açık kaynak analizler."
    draw.text((56, 280), desc, font=font_body, fill=(203, 213, 225), spacing=8)

    # Discipline pills
    topics = [
        "DERİN ÖĞRENME // YOLO11 & D-FINE",
        "EDGE AI // JETSON ORIN",
        "TENSORRT FP16/INT8",
        "EO / IR FÜZYON",
        "IEEE TPAMI FORMAT"
    ]
    px = 56
    py = 378
    for tp in topics:
        bbox = font_badge.getbbox(tp)
        pw = (bbox[2] - bbox[0]) + 24
        draw.rounded_rectangle([(px, py), (px + pw, py + 32)], radius=5, fill=(17, 24, 39), outline=(59, 130, 246), width=1)
        draw.text((px + 12, py + 8), tp, font=font_badge, fill=(147, 197, 253))
        px += pw + 12

    # Bottom status bar
    draw.line([(56, height - 88), (width - 56, height - 88)], fill=(30, 41, 59), width=1)
    draw.text((56, height - 64), "Alperen Toker — Yapay Zeka & Bilgisayarlı Görü Mühendisliği", font=font_body, fill=(148, 163, 184))
    draw.text((width - 340, height - 64), "● AÇIK ERİŞİMLİ TEKNİK ARŞİV", font=font_badge, fill=(52, 211, 153))

    canvas.convert('RGB').save(output_path, 'PNG', optimize=True)
    print(f"Site default OG card saved to {output_path}")

def build_article_og(title, category, date_str, reading_time, author, output_path):
    width, height = 1200, 630
    canvas = render_procedural_dark_canvas(width, height)
    draw = ImageDraw.Draw(canvas)

    font_brand = get_font(bold_cands, 15)
    font_badge = get_font(bold_cands, 13)
    font_body = get_font(reg_cands, 19)

    # Header: Optical Lens Icon
    cx, cy = 68, 64
    draw.ellipse([(cx - 16, cy - 16), (cx + 16, cy + 16)], outline=(226, 232, 240), width=2)
    draw.ellipse([(cx - 7, cy - 7), (cx + 7, cy + 7)], outline=(59, 130, 246), width=2)
    draw.ellipse([(cx - 2, cy - 2), (cx + 2, cy + 2)], fill=(59, 130, 246))
    draw.line([(cx, cy - 22), (cx, cy - 18)], fill=(226, 232, 240), width=2)
    draw.line([(cx, cy + 18), (cx, cy + 22)], fill=(226, 232, 240), width=2)
    draw.line([(cx - 22, cy), (cx - 18, cy)], fill=(226, 232, 240), width=2)
    draw.line([(cx + 18, cy), (cx + 22, cy)], fill=(226, 232, 240), width=2)

    draw.text((102, 52), "LENS // TEKNİK RAPOR", font=font_brand, fill=(248, 250, 252))

    # Category Pill right next to the title on header
    cat_text = (category or "BİLGİSAYARLI GÖRÜ").upper()
    cbbox = font_badge.getbbox(cat_text)
    cw = (cbbox[2] - cbbox[0]) + 22
    draw.rounded_rectangle([(320, 48), (320 + cw, 78)], radius=5, fill=(30, 58, 138), outline=(59, 130, 246), width=1)
    draw.text((331, 54), cat_text, font=font_badge, fill=(191, 219, 254))

    # Domain Pill on Top Right
    bx1, by1 = width - 210, 48
    draw.rounded_rectangle([(bx1, by1), (bx1 + 150, by1 + 34)], radius=6, fill=(18, 24, 38), outline=(59, 130, 246), width=1)
    draw.ellipse([(bx1 + 12, by1 + 13), (bx1 + 19, by1 + 20)], fill=(16, 185, 129))
    draw.text((bx1 + 28, by1 + 9), "lens.atoker.dev", font=font_badge, fill=(147, 197, 253))

    draw.line([(56, 110), (width - 56, 110)], fill=(30, 41, 59), width=1)

    # Dynamic Title Wrapping & Sizing
    title_clean = title.strip()
    if len(title_clean) > 85:
        font_size = 38
        wrap_width = 44
        line_height = 50
    elif len(title_clean) > 55:
        font_size = 42
        wrap_width = 38
        line_height = 54
    else:
        font_size = 48
        wrap_width = 34
        line_height = 60

    font_title = get_font(bold_cands, font_size)
    lines = textwrap.wrap(title_clean, width=wrap_width)
    ty = 160
    for line in lines[:3]:
        draw.text((56, ty), line, font=font_title, fill=(255, 255, 255))
        ty += line_height

    # Metadata Badges
    my = max(ty + 32, 388)
    meta_tags = []
    if date_str:
        meta_tags.append(f"TARİH: {date_str}")
    if reading_time:
        meta_tags.append(f"SÜRE: {reading_time}")
    meta_tags.append(f"YAZAR: {author or 'Alperen Toker'}")
    meta_tags.append("FORMAT: IEEE TPAMI")

    mx = 56
    for m in meta_tags:
        mbbox = font_badge.getbbox(m)
        mw = (mbbox[2] - mbbox[0]) + 24
        draw.rounded_rectangle([(mx, my), (mx + mw, my + 32)], radius=5, fill=(17, 24, 39), outline=(59, 130, 246), width=1)
        draw.text((mx + 12, my + 8), m, font=font_badge, fill=(203, 213, 225))
        mx += mw + 12

    # Bottom status bar
    draw.line([(56, height - 88), (width - 56, height - 88)], fill=(30, 41, 59), width=1)
    draw.text((56, height - 64), "LENS — Alperen Toker Araştırma & Mühendislik Notları", font=font_body, fill=(148, 163, 184))
    draw.text((width - 340, height - 64), "● TAM METİN ERİŞİME AÇIK", font=font_badge, fill=(52, 211, 153))

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    canvas.convert('RGB').save(output_path, 'PNG', optimize=True)
    print(f"Article OG card saved: {output_path}")

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description="Procedural Swiss Tactical OpenGraph Image Generator")
    parser.add_argument('--all', action='store_true', help="Generate cards for all articles in SQLite")
    parser.add_argument('--site', action='store_true', help="Generate default site og-image.png")
    parser.add_argument('--title', type=str, help="Article title")
    parser.add_argument('--category', type=str, default='Kenar Yapay Zeka', help="Article category")
    parser.add_argument('--date', type=str, default='Bugün', help="Article display date")
    parser.add_argument('--reading-time', type=str, default='', help="Article reading time")
    parser.add_argument('--author', type=str, default='Alperen Toker', help="Article author")
    parser.add_argument('--output', type=str, help="Output image file path")
    args = parser.parse_args()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, '..'))

    if args.title and args.output:
        build_article_og(
            title=args.title,
            category=args.category,
            date_str=args.date,
            reading_time=args.reading_time,
            author=args.author,
            output_path=args.output
        )

    if args.site:
        site_og_path = args.output or os.path.join(project_root, 'public', 'og-image.png')
        build_default_site_og(site_og_path)

    if args.all:
        import sqlite3
        import json
        db_path = os.path.join(project_root, 'data', 'lens.db')
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT id, slug, title, category, displayDate, date, readingTime, authors FROM articles")
        rows = cur.fetchall()
        for row in rows:
            art_id, slug, title, cat, disp_date, iso_date, read_time, authors_json = row
            author_name = "Alperen Toker"
            try:
                authors = json.loads(authors_json)
                if authors and isinstance(authors, list) and len(authors) > 0:
                    author_name = authors[0].get('name', 'Alperen Toker')
            except Exception:
                pass

            target_public = os.path.join(project_root, 'public', 'og', f"{slug}.png")
            build_article_og(
                title=title,
                category=cat,
                date_str=disp_date or iso_date,
                reading_time=read_time,
                author=author_name,
                output_path=target_public
            )
            print(f"Generated card for {slug}")
        print("Done generating all cards.")

