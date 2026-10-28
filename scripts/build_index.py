#!/usr/bin/env python3
"""Generate a public JSON index for every file/folder under ./debo."""
import json
from pathlib import Path

ROOT = Path('debo')
OUT = Path('debo-index.json')
entries = []
if ROOT.exists():
    for path in sorted(ROOT.rglob('*'), key=lambda p: p.as_posix().casefold()):
        if not path.is_file() and not path.is_dir():
            continue
        rel = path.as_posix()
        if rel.endswith('/.gitkeep') or path.name in {'.DS_Store', 'Thumbs.db', 'desktop.ini'}:
            continue
        parent = path.parent.as_posix()
        item = {'name': path.name, 'path': rel, 'parent': parent, 'type': 'folder' if path.is_dir() else 'file'}
        if path.is_file():
            item['size'] = path.stat().st_size
        entries.append(item)
# Also preserve empty folders through .gitkeep markers: add the folder itself if it was not found as a child entry.
existing = {e['path'] for e in entries}
for folder in sorted((p for p in ROOT.rglob('*') if p.is_dir()), key=lambda p: p.as_posix().casefold()) if ROOT.exists() else []:
    if folder.as_posix() not in existing:
        entries.append({'name': folder.name, 'path': folder.as_posix(), 'parent': folder.parent.as_posix(), 'type': 'folder'})
entries.sort(key=lambda e: (e['path'].casefold(), e['type']))
OUT.write_text(json.dumps({'root': 'debo', 'entries': entries}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Generated {OUT} with {len(entries)} entries')
