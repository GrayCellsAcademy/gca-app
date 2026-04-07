lines = open("src/live/LiveSession.jsx", encoding="utf-8").readlines()
print("Total lines:", len(lines))
for i, line in enumerate(lines[620:645], start=621):
    print(f"{i}: {repr(line)}")
