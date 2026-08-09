path = r'E:\AiProject\study_hub\src\main\resources\static\js\pages\quiz.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# The buggy line has two single quotes '' inside a single-quoted JS string
# It should be escaped single quotes
old = "QuizPage.selectAnswer('' + labels[i] + '')"
new = "QuizPage.selectAnswer(\\'\" + labels[i] + \"\\')"
content = content.replace(old, new)

# Also fix the frontend copy
path2 = r'E:\AiProject\study_hub\src\main\frontend\js\pages\quiz.js'
with open(path2, 'r', encoding='utf-8') as f:
    content2 = f.read()
content2 = content2.replace(old, new)

with open(path, 'w', encoding='utf-8', newline='') as f:
    f.write(content)
with open(path2, 'w', encoding='utf-8', newline='') as f:
    f.write(content2)
print('Fixed')
