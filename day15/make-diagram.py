#!/usr/bin/env python3
"""Day 15 factory diagram: ticket -> ... -> approve/escalate. PIL only."""
from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1600, 900
BG = (245, 247, 250)
INK = (17, 24, 39)
MUTED = (75, 85, 99)
ACCENT = (13, 110, 190)      # blue
ACCENT2 = (5, 150, 105)      # green (approve)
WARN = (180, 83, 9)          # amber (escalate)
BOX = (255, 255, 255)
BORDER = (203, 213, 225)

def font(size, bold=False):
    for p in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold
              else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
              "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold
              else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"):
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)

# Title
d.text((80, 48), "Agent Factory — how a ticket becomes a change",
       font=font(46, True), fill=INK)
d.text((80, 108), "Qodo Hackathon 2026  ·  opelphantom96/agent-factory",
       font=font(28), fill=MUTED)

# Flow: 2 rows x 4 boxes
stages = [
    ("1  TICKET", "goal + acceptance\n+ change + test"),
    ("2  SPEC", "validate ticket\ncompleteness"),
    ("3  PLAN REVIEW", "plan vs AGENTS.md\n+ Qodo review"),
    ("4  IMPLEMENT", "run the change\nscript (real edit)"),
    ("5  CODE REVIEW", "diff review\n+ Qodo review"),
    ("6  AUTO-FIX", "PR Resolver:\nfix, re-verify"),
    ("7  VERIFY", "tests + syntax\n+ demo rebuild"),
    ("8  APPROVE", "all green → approve\nelse → human"),
]
bw, bh = 330, 150
gapx, gapy = 40, 90
x0, y0 = 80, 190

def box(x, y, title, sub, last=False):
    d.rounded_rectangle([x, y, x + bw, y + bh], radius=18,
                        fill=BOX, outline=ACCENT if not last else ACCENT2, width=3)
    d.text((x + 20, y + 18), title, font=font(27, True), fill=INK)
    d.text((x + 20, y + 62), sub, font=font(23), fill=MUTED)

def arrow_right(x, y):
    cy = y + bh // 2
    d.line([x, cy, x + gapx, cy], fill=ACCENT, width=5)
    d.polygon([(x + gapx, cy), (x + gapx - 16, cy - 10), (x + gapx - 16, cy + 10)],
              fill=ACCENT)

def arrow_down(x, y):
    cx = x + bw // 2
    d.line([cx, y, cx, y + gapy], fill=ACCENT, width=5)
    d.polygon([(cx, y + gapy), (cx - 10, y + gapy - 16), (cx + 10, y + gapy - 16)],
              fill=ACCENT)

for i, (t, s) in enumerate(stages):
    row, col = divmod(i, 4)
    x = x0 + col * (bw + gapx)
    y = y0 + row * (bh + gapy)
    box(x, y, t, s, last=(i == 7))
    if col < 3:
        arrow_right(x + bw, y)
    elif row == 0:
        arrow_down(x, y + bh)

# Footer notes
fy = y0 + 2 * bh + gapy + 30
d.text((80, fy), "Every stage writes evidence to  evidence/runs/  —  a stage that left no trace did not run.",
       font=font(27, True), fill=INK)
d.text((80, fy + 48), "A failing gate gets fixed or escalated — never loosened to make a run green.",
       font=font(27), fill=MUTED)
d.text((80, fy + 96), "Qodo review runs at plan review + code review  ·  demo app: F1 telemetry dashboard (zero runtime deps)",
       font=font(24), fill=MUTED)
d.text((80, fy + 144), "Day 16 — security scan (Arnica): BLOCKED — Arnica supports organization accounts only;",
       font=font(24, True), fill=WARN)
d.text((80, fy + 178), "personal repos prohibited. Planned once the repo lives in an org.",
       font=font(24, True), fill=WARN)

out = os.path.expanduser("~/workspace/qodo-hackathon/agent-factory/day15/factory-diagram.png")
os.makedirs(os.path.dirname(out), exist_ok=True)
img.save(out)
print("saved", out, img.size)
