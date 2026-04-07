content = open("src/live/LiveSession.jsx", encoding="utf-8").read()

# The broken section looks like:
# if (view === "classwork") {\n    return <ClassworkSessionWrapper user={user}\n  if (view === "worksheet") {\n    return <WorksheetSession user={user} onHome={() => setView("menu")} />;\n  } onHome={() => setView("menu")} />;\n  }
# Fix it back to clean:
broken = '  if (view === "classwork") {\n    return <ClassworkSessionWrapper user={user}\n  if (view === "worksheet") {\n    return <WorksheetSession user={user} onHome={() => setView("menu")} />;\n  } onHome={() => setView("menu")} />;\n  }'
fixed = '  if (view === "classwork") {\n    return <ClassworkSessionWrapper user={user} onHome={() => setView("menu")} />;\n  }'
content = content.replace(broken, fixed)

# Also remove duplicate worksheet blocks - keep only first one
import re
blocks = list(re.finditer(r'  if \(view === "worksheet"\) \{[^}]+\}', content))
print("Worksheet blocks found:", len(blocks))
if len(blocks) > 1:
    # Remove all but the first
    for b in reversed(blocks[1:]):
        content = content[:b.start()] + content[b.end():]

print("After fix - worksheet blocks:", len(list(re.finditer(r'view === "worksheet"', content))))
print("Lines:", len(content.splitlines()))
open("src/live/LiveSession.jsx", "w", encoding="utf-8").write(content)
