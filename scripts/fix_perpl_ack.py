from pathlib import Path
p = Path(r"C:\Users\Irham\Documents\code\metropolis\src\shared\perplAuth.ts")
t = p.read_text(encoding="utf-8")
# Fix success ack: only code === 0
old = """      if (msg?.mt === 3) {
        clearTimeout(timeout);
        const code = msg?.status?.code ?? msg?.code;
        const sid = msg?.sid;
        try {
          ws.close();
        } catch {
          /* noop */
        }
        // Accept any gateway ack after order send (sid may not always be 100)
        if (code === 0 || code === undefined || sid === 100) {
          if (code === 0 || sid === 100) {
            resolve({ accepted: true, code: code ?? 0, raw: msg });
            return;
          }
        }
        resolve({
          accepted: false,
          code: code ?? -1,
          error: msg?.status?.error || msg?.error || `Perpl gateway code ${code}`,
          raw: msg,
        });
      }"""
new = """      if (msg?.mt === 3) {
        clearTimeout(timeout);
        const code = msg?.status?.code ?? msg?.code;
        try {
          ws.close();
        } catch {
          /* noop */
        }
        if (code === 0) {
          resolve({ accepted: true, code: 0, raw: msg });
          return;
        }
        resolve({
          accepted: false,
          code: code ?? -1,
          error: msg?.status?.error || msg?.error || `Perpl gateway code ${code}`,
          raw: msg,
        });
      }"""
if old not in t:
    print("ack block missing")
else:
    t = t.replace(old, new)
    print("ack fixed")

# lastExecutionBlock: use slightly behind head to avoid "already expired"
t = t.replace(
    "lb: input.lastExecutionBlock || Number(msg?.at?.b ?? msg?.sn ?? 0),",
    "lb: input.lastExecutionBlock ?? Math.max(0, Number(msg?.at?.b ?? 0) - 2),",
)
p.write_text(t, encoding="utf-8")
print("lb fixed")
