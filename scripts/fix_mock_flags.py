from pathlib import Path
p = Path(r"C:\Users\Irham\Documents\code\metropolis\mobile\src\api\client.ts")
t = p.read_text(encoding="utf-8")
t = t.replace("if (USE_MOCK)", "if (MOCK)")
p.write_text(t, encoding="utf-8")
print("replaced", t.count("if (MOCK)"), "remaining USE_MOCK if", t.count("if (USE_MOCK)"))
