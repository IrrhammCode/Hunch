from pathlib import Path
p = Path(r"C:\Users\Irham\Documents\code\metropolis\src\shared\perplAuth.ts")
t = p.read_text(encoding="utf-8")
t = t.replace(
    "lb: input.lastExecutionBlock ?? Math.max(0, Number(msg?.at?.b ?? 0) - 2),",
    "lb: input.lastExecutionBlock ?? 0,",
)
# also try marketable IOC with limit price 0
p.write_text(t, encoding="utf-8")
print("lb=0")
