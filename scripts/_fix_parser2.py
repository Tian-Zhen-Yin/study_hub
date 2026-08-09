path = r'E:\AiProject\study_hub\scripts\parse_markdown_questions.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix: handle lines starting with checkmark or bold marker before option letter
old = "elif re.match(r'^[A-D]\.', line):"
new = "elif re.match(r'^(?:✅\s*)?(?:\*\*)?[A-D](?:\*\*)?\.', line):"
content = content.replace(old, new)

with open(path, 'w', encoding='utf-8', newline='') as f:
    f.write(content)
print('Fixed option regex')
