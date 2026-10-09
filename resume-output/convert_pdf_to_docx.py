#!/usr/bin/env python3
"""Convert resume PDFs to DOCX without changing content (pdf2docx)."""
from pathlib import Path
from pdf2docx import Converter

SRC = Path(__file__).resolve().parent / "pdf"
DST = Path(__file__).resolve().parent / "docx-from-pdf"
FILES = [
    "侯钟棋-海外技术支持-中文-一页版.pdf",
    "侯钟棋-海外技术支持-中文-两页版.pdf",
    "Hou-Zhongqi-Overseas-Technical-Support-EN-1page.pdf",
    "Hou-Zhongqi-Overseas-Technical-Support-EN-2page.pdf",
]

def main():
    DST.mkdir(parents=True, exist_ok=True)
    for name in FILES:
        pdf = SRC / name
        docx = DST / name.replace(".pdf", ".docx")
        cv = Converter(str(pdf))
        cv.convert(str(docx))
        cv.close()
        print("Wrote", docx)

if __name__ == "__main__":
    main()
