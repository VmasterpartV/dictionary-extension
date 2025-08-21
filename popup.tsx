import React, { useEffect, useState } from "react"
import { lookup, formatEntry, type DictEntry } from "./src/lib/dict"

const HISTORY_KEY = "mini_dict_history_v1"

type HistoryItem = { word: string; at: number }

export default function Popup() {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>("")
  const [error, setError] = useState("")
  const [history, setHistory] = useState<HistoryItem[]>([])

  useEffect(() => {
    // Carga historial al abrir popup
    ;(async () => {
      const { [HISTORY_KEY]: h = [] } = await chrome.storage.sync.get(HISTORY_KEY)
      setHistory(h)
    })()
  }, [])

  const pushHistory = async (word: string) => {
    const clean = word.toLowerCase().trim()
    if (!clean) return
    const next = [{ word: clean, at: Date.now() }, ...history.filter((x) => x.word !== clean)].slice(0, 10)
    setHistory(next)
    await chrome.storage.sync.set({ [HISTORY_KEY]: next })
  }

  const onSearch = async (w?: string) => {
    const word = (w ?? query).toLowerCase().trim()
    setError("")
    setResult("")
    if (!word) return
    setLoading(true)
    try {
      const entry = await lookup(word, "es")  // <— ahora busca en español
      if (!entry) {
        setResult("")
        setError("No results.")
      } else {
        setResult(formatEntry(entry))
        pushHistory(word)
      }
    } catch (e: any) {
      setError(`Error: ${e?.message || e}`)
    } finally {
      setLoading(false)
    }
  }

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") onSearch()
  }

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(result || "")
    } catch {}
  }

  const clearHistory = async () => {
    setHistory([])
    await chrome.storage.sync.set({ [HISTORY_KEY]: [] })
  }

  return (
    <div style={styles.wrap}>
      <h3 style={styles.h3}>Mini Dictionary</h3>

      <div style={styles.row}>
        <input
          style={styles.input}
          placeholder="Type a word (English)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          autoFocus
        />
        <button style={styles.btn} onClick={() => onSearch()} disabled={loading}>
          {loading ? "…" : "Buscar"}
        </button>
      </div>

      {error && <div style={styles.err}>{error}</div>}

      {result && (
        <div style={styles.card}>
          <pre style={styles.pre}>{result}</pre>
          <div style={styles.rowEnd}>
            <button style={styles.btnGhost} onClick={onCopy}>Copiar</button>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <>
          <div style={styles.histHead}>
            <span>Historial</span>
            <button style={styles.btnGhost} onClick={clearHistory}>Limpiar</button>
          </div>
          <div style={styles.histList}>
            {history.map((h) => (
              <button key={h.word} style={styles.histItem} onClick={() => onSearch(h.word)}>
                {h.word}
              </button>
            ))}
          </div>
        </>
      )}

      <div style={styles.hint}>Tip: también puedes hacer doble-clic en una palabra en la página (tooltip).</div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    width: 360,
    padding: 12,
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif"
  },
  h3: { margin: 0, marginBottom: 8, fontSize: 16 },
  row: { display: "flex", gap: 8, alignItems: "center" },
  rowEnd: { display: "flex", justifyContent: "flex-end", marginTop: 6 },
  input: {
    flex: 1,
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: "8px 10px",
    outline: "none"
  },
  btn: {
    border: 0,
    borderRadius: 10,
    padding: "8px 12px",
    cursor: "pointer",
    background: "#111",
    color: "#fff",
    fontWeight: 600
  },
  btnGhost: {
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    background: "white",
    padding: "6px 10px",
    cursor: "pointer"
  },
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    background: "#fafafa"
  },
  pre: { whiteSpace: "pre-wrap", margin: 0, fontSize: 13, lineHeight: 1.35 },
  err: { color: "#b91c1c", fontSize: 13, marginTop: 8 },
  histHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, fontWeight: 600 },
  histList: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 },
  histItem: {
    border: "1px solid #e5e7eb",
    background: "white",
    borderRadius: 9999,
    padding: "4px 10px",
    cursor: "pointer",
    fontSize: 12
  },
  hint: { color: "#6b7280", fontSize: 12, marginTop: 12 }
}
