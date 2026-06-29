#!/usr/bin/env python3
"""生成演示联系二维码占位图 public/placeholders/demo-contact-qr.png"""
from pathlib import Path

try:
    import qrcode
except ImportError:
    raise SystemExit("请先安装: pip install qrcode[pil]")

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "placeholders" / "demo-contact-qr.png"

def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    img = qrcode.make("demo-placeholder-resume-comparison", box_size=8, border=2)
    img.save(OUT)
    print(f"Saved: {OUT}")

if __name__ == "__main__":
    main()
