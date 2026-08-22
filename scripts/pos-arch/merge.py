#!/usr/bin/env python3
"""Merge cover PDF + body PDF into final document."""
from pypdf import PdfReader, PdfWriter
import os

A4_W, A4_H = 595.28, 841.89

def normalize(page):
    box = page.mediabox
    w, h = float(box.width), float(box.height)
    if abs(w - A4_W) > 0.1 or abs(h - A4_H) > 0.1:
        page.scale_to(A4_W, A4_H)
    return page

cover_pdf = '/home/z/my-project/download/pos-arch/cover.pdf'
body_pdf = '/home/z/my-project/download/pos-arch/body.pdf'
output_pdf = '/home/z/my-project/download/pos-arch/MyeCommerce_Global_POS_Architecture_Blueprint.pdf'

writer = PdfWriter()

# Cover as page 1
cover_page = PdfReader(cover_pdf).pages[0]
writer.add_page(normalize(cover_page))

# Body pages
for page in PdfReader(body_pdf).pages:
    writer.add_page(normalize(page))

writer.add_metadata({
    '/Title': 'MyeCommerce Global POS - Architecture Blueprint',
    '/Author': 'Z.ai',
    '/Creator': 'Z.ai',
    '/Subject': 'Technical architecture document for global POS system'
})

with open(output_pdf, 'wb') as f:
    writer.write(f)

print(f'Merged PDF: {output_pdf}')
print(f'Size: {os.path.getsize(output_pdf) / 1024:.1f} KB')
print(f'Pages: {len(writer.pages)}')