import re

path = 'scripts/generate-refactoring-pdf.py'
with open(path, 'r') as f:
    c = f.read()

# Replace escaped backslashes that are actually just single backslashes in the source
c = c.replace('\\\\n', '\n')
c = c.replace('\\\\s', '\\s')

with open(path, 'w') as f:
    f.write(c)
print('Fixed')
