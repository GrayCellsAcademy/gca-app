f = open("src/live/LiveSession.jsx", "r", encoding="utf-8")
content = f.read()
f.close()

content = content.replace(
    'import ClassworkSession, { ClassworkTeacherView, ClassworkStudentView } from "../ClassworkSession";',
    'import ClassworkSession, { ClassworkTeacherView, ClassworkStudentView } from "../ClassworkSession";\nimport WorksheetSession, { WorksheetTeacherView, WorksheetStudentView } from "../WorksheetSession";'
)

content = content.replace(
    '  if (view === "classwork") {',
    '  if (view === "worksheet") {\n    return <WorksheetSession user={user} onHome={() => setView("menu")} />;\n  }\n\n  if (view === "classwork") {'
)

content = content.replace(
    'session.type === "classwork"',
    'session.type === "worksheet"\n            ? (user.role === "teacher"\n                ? <WorksheetTeacherView session={session} sessionId={sessionId} uid={user.id} />\n                : <WorksheetStudentView session={session} sessionId={sessionId} uid={user.id} />)\n            : session.type === "classwork"'
)

menu_card = '''                  <div className="card" onClick={() => setView("worksheet")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ fontSize: 36 }}>WS</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>Decimal Operations Worksheet</div>
                      <div style={{ color: "var(--text2)", fontSize: 13 }}>20 questions - decimal multiplication, division, fractions, order of operations.</div>
                    </div>
                  </div>
                  '''

content = content.replace(
    '                  <div className="card" onClick={() => setView("create")}',
    menu_card + '                  <div className="card" onClick={() => setView("create")'
)

f = open("src/live/LiveSession.jsx", "w", encoding="utf-8")
f.write(content)
f.close()
print("Done. Lines:", len(content.splitlines()))
print("Import OK:", "WorksheetSession" in content)
print("Routing OK:", 'view === "worksheet"' in content)
print("Menu OK:", "Decimal Operations Worksheet" in content)
