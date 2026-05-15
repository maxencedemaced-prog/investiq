#!/bin/bash
mkdir -p icons

# Generate simple SVG icons as PNG placeholders using Python
python3 << 'PYEOF'
import os
os.makedirs('icons', exist_ok=True)

svg_192 = '''<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="40" fill="#7c3aed"/>
  <polyline points="152,56 104,110 72,80 40,128" stroke="white" stroke-width="14" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <polyline points="120,56 152,56 152,88" stroke="white" stroke-width="14" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>'''

svg_512 = svg_192.replace('width="192" height="192" viewBox="0 0 192 192"', 'width="512" height="512" viewBox="0 0 192 192"')

with open('icons/icon-192.svg', 'w') as f:
    f.write(svg_192)
with open('icons/icon-512.svg', 'w') as f:
    f.write(svg_512)

print("SVG icons created")
PYEOF
