content = open("src/live/LiveSession.jsx", encoding="utf-8").read()

# Fix 1: import
content = content.replace(
    'import ClassworkSession, { ClassworkTeacherView, ClassworkStudentView } from "../ClassworkSession";',
    'import ClassworkSession, { ClassworkTeacherView, ClassworkStudentView } from "../ClassworkSession";\nimport WorksheetSession, { WorksheetTeacherView, WorksheetStudentView } from "../WorksheetSession";'
)

# Fix 2: routing - the classwork block looks like:
#   if (view === "classwork") {\n    return <ClassworkSessionWrapper user={user} onHome={() => setView("menu")} />;\n  }
# We replace the whole block with worksheet first then classwork
old = '  if (view === "classwork") {\n    return <ClassworkSessionWrapper user={user} onHome={() => setView("menu")} />;\n  }'
new = '  if (view === "worksheet") {\n    return <WorksheetSession user={user} onHome={() => setView("menu")} />;\n  }\n\n  if (view === "classwork") {\n    return <ClassworkSessionWrapper user={user} onHome={() => setView("menu")} />;\n  }'
content = content.replace(old, new)

# Fix 3: session type routing
content = content.replace(
    'session.type === "classwork"',
    'session.type === "worksheet"\n            ? (user.role === "teacher" ? <WorksheetTeacherView session={session} sessionId={sessionId} uid={user.id} /> : <WorksheetStudentView session={session} sessionId={sessionId} uid={user.id} />)\n            : session.type === "classwork"'
)

# Fix 4: menu card
old_card = '                  <div className="card" onClick={() => setView("create")}'
new_card = '                  <div className="card" onClick={() => setView("worksheet")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}><div style={{ fontSize: 36 }}>WS</div><div><div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>Decimal Operations Worksheet</div><div style={{ color: "var(--text2)", fontSize: 13 }}>20 questions covering decimal operations.</div></div></div>\n                  <div className="card" onClick={() => setView("create")}'
content = content.replace(old_card, new_card)

open("src/live/LiveSession.jsx", "w", encoding="utf-8").write(content)
print("Done. Lines:", len(content.splitlines()))
print("Import:", "WorksheetSession" in content)
print("Routing:", content.count('view === "worksheet"'))
print("Menu:", "Decimal Operations Worksheet" in content)
