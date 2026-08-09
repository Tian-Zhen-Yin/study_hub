# -*- coding: utf-8 -*-
f = r"E:\AiProject\study_hub\src\main\resources\static\shared\pages.js"
c = open(f, encoding="utf-8").read()

# Fix double-backslash that was incorrectly added
c = c.replace("\\\\'", "\\'")

# Now fix the navigate('X') inside single-quoted JS strings -> navigate(\'X\')
# The pattern is: onclick="navigate('memory')" inside a single-quoted string
# We need: onclick="navigate(\'memory\')"
import re

# Replace navigate('word') with navigate(\'word\') when inside single-quoted strings
# But only in the memory section
start = c.index("/* ===== Memory Forge ===== */")
end = c.index("/* ===== Simulation ===== */")
before = c[:start]
mem = c[start:end]
after = c[end:]

# In the memory section, replace 'memory' inside onclick with \\'memory\\'
mem = mem.replace("navigate('memory')", "navigate(\\'memory\\')")

c = before + mem + after
open(f, "w", encoding="utf-8").write(c)
print("Fixed, len=" + str(len(c)))