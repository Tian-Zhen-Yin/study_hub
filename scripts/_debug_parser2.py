import sys, re, json
sys.stdout.reconfigure(encoding='utf-8')
from pathlib import Path

path = Path(r'C:\Users\17402\AppData\Local\Temp\senior_arch_review_check\exam-bank\10-architecture-styles.md')
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
blocks = content.split('\n---\n')

block = blocks[1].strip()
print(f'Block starts with: {repr(block[:50])}')

lines = block.split('\n')
print(f'Lines: {len(lines)}')
for i, line in enumerate(lines[:15]):
    print(f'  Line {i}: {repr(line)}')

# Try parsing
stem = re.sub(r'^###\s*\d+\.\s*', '', lines[0]).strip()
print(f'\nStem: {repr(stem)}')

options = []
answer = ''
analysis = ''
in_analysis = False

for line in lines[1:]:
    line = line.strip()
    if not line:
        continue
    if line.startswith('**答案**'):
        answer = re.sub(r'\*\*答案\*\*[：:]\s*', '', line).strip()
        in_analysis = False
        print(f'Found answer: {repr(answer)}')
    elif line.startswith('**解析**'):
        analysis = re.sub(r'\*\*解析\*\*[：:]\s*', '', line).strip()
        in_analysis = True
        print(f'Found analysis: {repr(analysis)}')
    elif in_analysis:
        analysis += line
    elif re.match(r'^[A-D]\.', line):
        opt = re.sub(r'^[A-D]\.\s*', '', line)
        opt = re.sub(r'^✅\s*', '', opt)
        options.append(opt.strip())
        print(f'Found option: {repr(opt.strip()[:50])}')

print(f'\nAnswer: {repr(answer)}')
print(f'Stem: {repr(stem)}')
print(f'Options: {len(options)}')
print(f'Not None: {bool(answer and stem)}')
