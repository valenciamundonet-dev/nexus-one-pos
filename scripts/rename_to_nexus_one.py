#!/usr/bin/env python3
"""Rename MyeCommerce -> Nexus One across the project."""

import os, re

BASE = '/home/z/my-project/upload/extracted'

# Extensions to process (text files)
TEXT_EXTS = {
    '.ts', '.tsx', '.js', '.json', '.md', '.txt', '.bat', '.vbs',
    '.html', '.css', '.prisma', '.toml', '.hta', '.py'
}

# Files/dirs to SKIP entirely
SKIP = {
    'node_modules', '.next', '.git', 'package-lock.json', 'bun.lock',
    'zip/MyeCommerce-v2.9.68.zip'
}

def should_process(filepath):
    rel = os.path.relpath(filepath, BASE)
    for skip in SKIP:
        if rel.startswith(skip) or rel == skip:
            return False
    ext = os.path.splitext(filepath)[1].lower()
    return ext in TEXT_EXTS

def rename_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()

    original = content

    # Order matters - most specific first
    replacements = [
        # Display names
        ('MyeCommerce POS', 'Nexus One POS'),
        ('MyeCommerce-POS', 'Nexus-One-POS'),
        ('MyeCommerce', 'Nexus One'),
        ('MYECOMMERCE', 'NEXUSONE'),
        ('myecommerce', 'nexusone'),
        # Package name
        ('my-ecommerce', 'nexus-one-pos'),
        # Domain
        ('myecommerce.ve', 'nexusone.ve'),
        # Bat file references
        ('INICIAR-MYECCOMMERCE', 'INICIAR-NEXUSONE'),
    ]

    for old, new in replacements:
        content = content.replace(old, new)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def rename_files_and_dirs():
    """Rename actual file/directory names."""
    # Rename INICIAR-MYECCOMMERCE.bat and INICIAR-MYECCOMMERCE-OCULTO.vbs
    renames = [
        ('INICIAR-MYECCOMMERCE.bat', 'INICIAR-NEXUSONE.bat'),
        ('INICIAR-MYECCOMMERCE-OCULTO.vbs', 'INICIAR-NEXUSONE-OCULTO.vbs'),
    ]
    for old_name, new_name in renames:
        old_path = os.path.join(BASE, old_name)
        new_path = os.path.join(BASE, new_name)
        if os.path.exists(old_path):
            os.rename(old_path, new_path)
            print(f'  RENAMED FILE: {old_name} -> {new_name}')

    # Update references to renamed files in .vbs/.bat files
    for root, dirs, files in os.walk(BASE):
        # Skip ignored dirs
        dirs[:] = [d for d in dirs if d not in SKIP and not d.startswith('.')]
        for fname in files:
            fpath = os.path.join(root, fname)
            if not should_process(fpath):
                continue
            # Re-check after file renames
            if 'MYECCOMMERCE' in fname.upper():
                continue
            rename_in_file(fpath)


count = 0
print('=== Renaming files/directories ===')
rename_files_and_dirs()

print('\n=== Renaming content in files ===')
for root, dirs, files in os.walk(BASE):
    dirs[:] = [d for d in dirs if d not in SKIP and not d.startswith('.')]
    for fname in files:
        fpath = os.path.join(root, fname)
        if not should_process(fpath):
            continue
        if rename_in_file(fpath):
            rel = os.path.relpath(fpath, BASE)
            print(f'  {rel}')
            count += 1

print(f'\nDone: {count} files modified')
