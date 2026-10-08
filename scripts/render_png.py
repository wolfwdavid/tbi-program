"""Render every PDF in a folder to PNGs (one per page) for visual checks.

    python scripts/render_png.py <dir> [scale]

Needs: pip install pypdfium2
"""

import pathlib
import sys

import pypdfium2 as pdfium

folder = pathlib.Path(sys.argv[1])
scale = float(sys.argv[2]) if len(sys.argv) > 2 else 1.5

for pdf_path in sorted(folder.glob("*.pdf")):
    pdf = pdfium.PdfDocument(str(pdf_path))
    pdf.init_forms()  # draw filled form fields, not just page content
    for i, page in enumerate(pdf):
        out = pdf_path.with_name(f"{pdf_path.stem}-p{i + 1}.png")
        page.render(scale=scale, may_draw_forms=True).to_pil().save(out)
        print(out)
