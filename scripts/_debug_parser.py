import sys
sys.stdout.reconfigure(encoding='utf-8')
from pathlib import Path

path = Path(r'C:\Users\17402\AppData\Local\Temp\senior_arch_review_check\exam-bank\10-architecture-styles.md')
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
print(f'File length: {len(content)} chars')
blocks = content.split('\n---\n')
print(f'Blocks: {len(blocks)}')
for i, block in enumerate(blocks[:3]):
    stripped = block.strip()
    starts_hash = stripped.startswith('#') if stripped else False
    starts_triple = stripped.startswith('###') if stripped else False
    print(f'Block {i}: len={len(stripped)}, starts_hash={starts_hash}, starts_triple={starts_triple}')
    if stripped:
        print(f'  First 80: {repr(stripped[:80])}')
