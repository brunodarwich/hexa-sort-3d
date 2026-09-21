import os
import sys
import math
from PIL import Image, ImageDraw, ImageFilter

# Force UTF-8 stdout if possible
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGO_PATH = os.path.join(BASE_DIR, "hexa-infinity-logo.png")
STORE_DIR = os.path.join(BASE_DIR, "store_assets")
PUBLIC_DIR = os.path.join(BASE_DIR, "public")
ANDROID_RES_DIR = os.path.join(BASE_DIR, "android", "app", "src", "main", "res")

os.makedirs(STORE_DIR, exist_ok=True)
os.makedirs(PUBLIC_DIR, exist_ok=True)

# Load original logo
logo_raw = Image.open(LOGO_PATH).convert("RGBA")

# Trim whitespace/transparent borders
bbox = logo_raw.getbbox()
if bbox:
    logo_trimmed = logo_raw.crop(bbox)
else:
    logo_trimmed = logo_raw

def create_radial_gradient(width, height, inner_color, outer_color, center_x=0.5, center_y=0.5, radius=None):
    """Creates a high quality radial gradient background"""
    if radius is None:
        radius = math.sqrt((width * 0.5) ** 2 + (height * 0.5) ** 2)
    
    w_small = max(32, width // 2)
    h_small = max(32, height // 2)
    img = Image.new("RGBA", (w_small, h_small))
    cx = w_small * center_x
    cy = h_small * center_y
    r = radius * 0.5
    
    draw = ImageDraw.Draw(img)
    for y in range(h_small):
        for x in range(w_small):
            dist = math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
            t = min(1.0, max(0.0, dist / r))
            t = t * t * (3 - 2 * t)
            r_val = int(inner_color[0] * (1 - t) + outer_color[0] * t)
            g_val = int(inner_color[1] * (1 - t) + outer_color[1] * t)
            b_val = int(inner_color[2] * (1 - t) + outer_color[2] * t)
            draw.point((x, y), fill=(r_val, g_val, b_val, 255))
            
    return img.resize((width, height), Image.Resampling.LANCZOS)

def draw_hex_pattern(img, color=(255, 255, 255, 12), hex_size=40):
    """Draw subtle decorative hexagonal grid pattern"""
    draw = ImageDraw.Draw(img, "RGBA")
    w, h = img.size
    
    def hex_corners(cx, cy, size):
        points = []
        for i in range(6):
            angle_deg = 60 * i - 30
            angle_rad = math.pi / 180 * angle_deg
            points.append((cx + size * math.cos(angle_rad), cy + size * math.sin(angle_rad)))
        return points

    w_step = hex_size * math.sqrt(3)
    h_step = hex_size * 1.5
    
    rows = int(h / h_step) + 3
    cols = int(w / w_step) + 3
    
    for r in range(rows):
        cy = r * h_step
        offset_x = (w_step / 2) if (r % 2 == 1) else 0
        for c in range(cols):
            cx = c * w_step + offset_x
            corners = hex_corners(cx, cy, hex_size * 0.85)
            draw.polygon(corners, outline=color, width=2)
            
    return img

def fit_image_inside(src_img, target_w, target_h, padding_ratio=0.1):
    """Fits an RGBA image inside target dimensions with padding"""
    avail_w = target_w * (1 - 2 * padding_ratio)
    avail_h = target_h * (1 - 2 * padding_ratio)
    
    src_w, src_h = src_img.size
    scale = min(avail_w / src_w, avail_h / src_h)
    new_w = int(src_w * scale)
    new_h = int(src_h * scale)
    
    resized = src_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    return resized, (int((target_w - new_w) / 2), int((target_h - new_h) / 2))

print("[1/5] Gerando Icones da Google Play Store (512x512)...")
# 1. Google Play Store Icon (512x512) - Dark theme backdrop
play_icon = create_radial_gradient(512, 512, (20, 30, 55), (8, 12, 22), center_x=0.5, center_y=0.45, radius=320)
play_icon = draw_hex_pattern(play_icon, color=(56, 189, 248, 18), hex_size=28)
fitted_logo, pos = fit_image_inside(logo_trimmed, 512, 512, padding_ratio=0.08)

# Soft shadow for logo
shadow = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
shadow.paste((0, 0, 0, 140), (pos[0], pos[1] + 8), mask=fitted_logo)
shadow = shadow.filter(ImageFilter.GaussianBlur(10))
play_icon.paste(shadow, (0, 0), mask=shadow)
play_icon.paste(fitted_logo, pos, mask=fitted_logo)

play_icon.save(os.path.join(STORE_DIR, "google_play_icon_512x512.png"), "PNG")
print("  -> store_assets/google_play_icon_512x512.png")

# Transparent 512x512 version
trans_icon = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
trans_fitted, trans_pos = fit_image_inside(logo_trimmed, 512, 512, padding_ratio=0.05)
trans_icon.paste(trans_fitted, trans_pos, mask=trans_fitted)
trans_icon.save(os.path.join(STORE_DIR, "google_play_icon_transparent_512x512.png"), "PNG")
print("  -> store_assets/google_play_icon_transparent_512x512.png")

print("[2/5] Gerando Grafico de Recursos / Banner (1024x500)...")
# 2. Feature Graphic (1024x500)
feature_bg = create_radial_gradient(1024, 500, (30, 41, 79), (7, 10, 19), center_x=0.5, center_y=0.5, radius=550)
feature_bg = draw_hex_pattern(feature_bg, color=(96, 165, 250, 22), hex_size=42)

# Add soft decorative radial glow in center
glow = create_radial_gradient(600, 400, (59, 130, 246, 70), (0, 0, 0, 0), center_x=0.5, center_y=0.5, radius=280)
feature_bg.paste(glow, (212, 50), mask=glow)

feature_logo, fpos = fit_image_inside(logo_trimmed, 1024, 500, padding_ratio=0.12)
fshadow = Image.new("RGBA", (1024, 500), (0, 0, 0, 0))
fshadow.paste((0, 0, 0, 160), (fpos[0], fpos[1] + 12), mask=feature_logo)
fshadow = fshadow.filter(ImageFilter.GaussianBlur(16))
feature_bg.paste(fshadow, (0, 0), mask=fshadow)
feature_bg.paste(feature_logo, fpos, mask=feature_logo)

feature_bg.save(os.path.join(STORE_DIR, "google_play_feature_graphic_1024x500.png"), "PNG")
feature_bg.convert("RGB").save(os.path.join(STORE_DIR, "google_play_feature_graphic_1024x500.jpg"), "JPEG", quality=95)
print("  -> store_assets/google_play_feature_graphic_1024x500.png / .jpg")

# 3. Social / OpenGraph Card (1200x630)
og_bg = create_radial_gradient(1200, 630, (30, 41, 79), (7, 10, 19), center_x=0.5, center_y=0.5, radius=650)
og_bg = draw_hex_pattern(og_bg, color=(96, 165, 250, 20), hex_size=48)
og_logo, og_pos = fit_image_inside(logo_trimmed, 1200, 630, padding_ratio=0.14)
og_bg.paste(og_logo, og_pos, mask=og_logo)
og_bg.save(os.path.join(STORE_DIR, "opengraph_share_1200x630.png"), "PNG")
print("  -> store_assets/opengraph_share_1200x630.png")

print("[3/5] Gerando Assets Web e PWA (/public)...")
pwa_sizes = [
    (16, "favicon-16x16.png"),
    (32, "favicon-32x32.png"),
    (48, "favicon-48x48.png"),
    (64, "favicon.png"),
    (180, "apple-touch-icon.png"),
    (192, "icon-192x192.png"),
    (512, "icon-512x512.png"),
]

for sz, name in pwa_sizes:
    canvas = Image.new("RGBA", (sz, sz), (0, 0, 0, 0))
    fit_img, pos = fit_image_inside(logo_trimmed, sz, sz, padding_ratio=0.04)
    canvas.paste(fit_img, pos, mask=fit_img)
    canvas.save(os.path.join(PUBLIC_DIR, name), "PNG")
    print(f"  -> public/{name}")

ico_16 = Image.open(os.path.join(PUBLIC_DIR, "favicon-16x16.png"))
ico_32 = Image.open(os.path.join(PUBLIC_DIR, "favicon-32x32.png"))
ico_48 = Image.open(os.path.join(PUBLIC_DIR, "favicon-48x48.png"))
ico_32.save(os.path.join(PUBLIC_DIR, "favicon.ico"), format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
print("  -> public/favicon.ico")

logo_trimmed.save(os.path.join(PUBLIC_DIR, "logo.png"), "PNG")
print("  -> public/logo.png")

print("[4/5] Gerando Icones do Launcher Android (res/mipmap-*)...")
densities = {
    "mipmap-mdpi": {"launcher": 48, "foreground": 108},
    "mipmap-hdpi": {"launcher": 72, "foreground": 162},
    "mipmap-xhdpi": {"launcher": 96, "foreground": 216},
    "mipmap-xxhdpi": {"launcher": 144, "foreground": 324},
    "mipmap-xxxhdpi": {"launcher": 192, "foreground": 432},
}

for folder, dims in densities.items():
    folder_path = os.path.join(ANDROID_RES_DIR, folder)
    os.makedirs(folder_path, exist_ok=True)
    
    sz = dims["launcher"]
    fg_sz = dims["foreground"]
    
    icon_square = play_icon.resize((sz, sz), Image.Resampling.LANCZOS)
    icon_square.save(os.path.join(folder_path, "ic_launcher.png"), "PNG")
    
    mask_round = Image.new("L", (sz, sz), 0)
    draw_round = ImageDraw.Draw(mask_round)
    draw_round.ellipse((1, 1, sz - 2, sz - 2), fill=255)
    
    icon_round = Image.new("RGBA", (sz, sz), (0, 0, 0, 0))
    icon_round.paste(icon_square, (0, 0), mask=mask_round)
    icon_round.save(os.path.join(folder_path, "ic_launcher_round.png"), "PNG")
    
    fg_canvas = Image.new("RGBA", (fg_sz, fg_sz), (0, 0, 0, 0))
    fg_logo, fg_pos = fit_image_inside(logo_trimmed, fg_sz, fg_sz, padding_ratio=0.22)
    fg_canvas.paste(fg_logo, fg_pos, mask=fg_logo)
    fg_canvas.save(os.path.join(folder_path, "ic_launcher_foreground.png"), "PNG")
    
    print(f"  -> {folder}/ic_launcher.png, ic_launcher_round.png, ic_launcher_foreground.png")

print("[5/5] Gerando Splash Screens Android (res/drawable-*)...")
splash_sizes = {
    "drawable": (480, 800),
    "drawable-port-mdpi": (320, 480),
    "drawable-port-hdpi": (480, 800),
    "drawable-port-xhdpi": (720, 1280),
    "drawable-port-xxhdpi": (960, 1600),
    "drawable-port-xxxhdpi": (1280, 1920),
    "drawable-land-mdpi": (480, 320),
    "drawable-land-hdpi": (800, 480),
    "drawable-land-xhdpi": (1280, 720),
    "drawable-land-xxhdpi": (1600, 960),
    "drawable-land-xxxhdpi": (1920, 1280),
}

for folder, (sw, sh) in splash_sizes.items():
    folder_path = os.path.join(ANDROID_RES_DIR, folder)
    os.makedirs(folder_path, exist_ok=True)
    
    splash_bg = create_radial_gradient(sw, sh, (24, 34, 62), (8, 12, 22), center_x=0.5, center_y=0.48, radius=int(min(sw, sh) * 0.8))
    splash_bg = draw_hex_pattern(splash_bg, color=(56, 189, 248, 14), hex_size=int(min(sw, sh) * 0.05))
    
    pad = 0.22 if sw < sh else 0.16
    sp_logo, sp_pos = fit_image_inside(logo_trimmed, sw, sh, padding_ratio=pad)
    
    sp_shadow = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    sp_shadow.paste((0, 0, 0, 150), (sp_pos[0], sp_pos[1] + 10), mask=sp_logo)
    sp_shadow = sp_shadow.filter(ImageFilter.GaussianBlur(14))
    splash_bg.paste(sp_shadow, (0, 0), mask=sp_shadow)
    splash_bg.paste(sp_logo, sp_pos, mask=sp_logo)
    
    splash_bg.save(os.path.join(folder_path, "splash.png"), "PNG")
    print(f"  -> {folder}/splash.png ({sw}x{sh})")

print("\nConcluido com sucesso! Todos os assets gerados e organizados.")
