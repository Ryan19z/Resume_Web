# CNC605+ 用户使用手册（中文版）

本目录包含 **CNC605+ 喷油嘴清洗检测仪** 用户手册的英文原版与中文翻译版。

| 文件 | 说明 |
|------|------|
| `CNC605+_User_Manual_EN.pdf` | 英文原版 PDF（24 页） |
| `CNC605+_User_Manual_EN.docx` | 英文原版 Word（由 PDF 转换） |
| `CNC605+_用户使用手册_CN.pdf` | **中文翻译版 PDF**（保留原版图式与图片） |
| `CNC605+_用户使用手册_CN.docx` | **中文翻译版 Word** |

## 重新生成中文版

```bash
python3 scripts/build_cnc605_cn_manual.py
```

## 翻译说明

- 正文已全部译为简体中文；车型名称、品牌（如 Toyota、LAUNCH）、技术缩写（EFI/GDI/PIEZO）及接口代码（如 SC、ERROR）按行业惯例保留英文。
- 图片、表格版式及章节结构均沿用英文原版。
- 中文 PDF 由中文版 DOCX 通过 LibreOffice 导出，页数可能因排版略有增加。
