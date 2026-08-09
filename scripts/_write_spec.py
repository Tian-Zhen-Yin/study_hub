
import os
content = open(os.path.expanduser('~/.codex/tmp_spec.txt'), 'r', encoding='utf-8').read()
with open('E:/AiProject/study_hub/docs/superpowers/specs/2026-07-29-quiz-system-upgrade-design.md', 'w', encoding='utf-8') as f:
    f.write(content)
print('Written', len(content), 'bytes')
