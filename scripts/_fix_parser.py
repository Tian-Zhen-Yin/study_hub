path = r'E:\AiProject\study_hub\scripts\parse_markdown_questions.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = "if not block.strip() or block.strip().startswith('#'):"
new = "if not block.strip() or (block.strip().startswith('#') and not block.strip().startswith('###')):"
content = content.replace(old, new)

with open(path, 'w', encoding='utf-8', newline='') as f:
    f.write(content)
print('Fixed parse_markdown_questions.py')
