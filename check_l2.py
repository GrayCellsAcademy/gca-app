import base64, urllib.request, os

# Read our output file content directly via a simple write
content = open("src/Lesson02Session.jsx", "r", encoding="utf-8").read()
lines = content.splitlines()
print(f"Lines on disk: {len(lines)}")

# Check for duplicate RectilinearSVG
count = content.count("function RectilinearSVG")
print(f"RectilinearSVG count: {count}")

# Check brace balance
depth = 0
for ch in content:
    if ch == "{": depth += 1
    elif ch == "}": depth -= 1
print(f"Brace balance: {depth}")
