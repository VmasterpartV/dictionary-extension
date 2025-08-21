import type { PlasmoCSConfig } from "plasmo"
import React, { useEffect, useMemo, useRef, useState } from "react"
import { lookup, formatEntry } from "../lib/dict"

export const config: PlasmoCSConfig = { matches: ["<all_urls>"], run_at: "document_idle" }

function getSelectedWord(): string {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return ""
  const raw = sel.toString().trim()
  if (!raw) return ""
  const m = raw.match(/[\p{L}\p{M}'-]+/u)
  return (m?.[0] || "").toLowerCase()
}

const Tooltip: React.FC = () => {
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [content, setContent] = useState<string>("Doble-clic en una palabra para ver su definición…")
  const [copied, setCopied] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  // estilos
  const styles = useMemo(() => {
    const box: React.CSSProperties = {
      position: "fixed", top: "10%", right: 16, width: 360, maxHeight: "80vh", overflow: "auto",
      background: "#111", color: "#fff", padding: "12px", borderRadius: 12,
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
      fontSize: 13, lineHeight: 1.35, boxShadow: "0 12px 32px rgba(0,0,0,.35)",
      zIndex: 2147483647, whiteSpace: "pre-wrap", userSelect: "text"
    }
    const header: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }
    const title: React.CSSProperties = { margin: 0, fontSize: 14, fontWeight: 700, opacity: 0.95 }
    const hint: React.CSSProperties = { opacity: 0.75, fontSize: 12, marginTop: 8 }
    const close: React.CSSProperties = { border: 0, background: "transparent", color: "#bbb", cursor: "pointer", fontSize: 16 }
    const btnRow: React.CSSProperties = { display: "flex", gap: 8, marginTop: 8 }
    const btn: React.CSSProperties = { border: 0, background: "#2563eb", color: "#fff", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontWeight: 600 }
    const btnGhost: React.CSSProperties = { border: "1px solid #374151", background: "transparent", color: "#e5e7eb", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontWeight: 600 }
    const status: React.CSSProperties = { position: "absolute", left: -9999, top: "auto", width: 1, height: 1, overflow: "hidden" }
    return { box, header, title, hint, close, btnRow, btn, btnGhost, status }
  }, [])

  // resetear “Copiado” AUTOMÁTICAMENTE cuando cambie el contenido mostrado
  useEffect(() => { setCopied(false) }, [content])

  async function searchSelected() {
    const word = getSelectedWord()
    setVisible(true)
    setLoading(true)
    setContent(word ? "Buscando…" : "Selecciona una sola palabra y vuelve a intentar.")
    if (!word) { setLoading(false); return }

    const entry = await lookup(word, "es")
    setLoading(false)
    setContent(entry ? formatEntry(entry) : "Sin resultados.")
  }

  useEffect(() => {
    const onDbl = () => searchSelected()
    document.addEventListener("dblclick", onDbl)
    return () => document.removeEventListener("dblclick", onDbl)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        searchSelected()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  // copiar con fallback
  const onCopy = async () => {
    const text = content || ""
    if (!text || text.startsWith("Buscando")) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        throw new Error("Clipboard API unavailable")
      }
      setCopied(true)
    } catch {
      // Fallback clásico
      try {
        const ta = document.createElement("textarea")
        ta.value = text
        ta.style.position = "fixed"
        ta.style.opacity = "0"
        document.body.appendChild(ta)
        ta.select()
        document.execCommand("copy")
        document.body.removeChild(ta)
        setCopied(true)
      } catch {
        // si aún falla, no cambiar estado
      }
    }
  }

  const onClose = () => { setVisible(false); setCopied(false) }

  return visible ? (
    <div ref={boxRef} style={styles.box} onMouseDown={(e) => e.stopPropagation()}>
      <div style={styles.header}>
        <h4 style={styles.title}>Diccionario (ES)</h4>
        <div style={styles.btnRow}>
          <button onClick={onCopy} style={styles.btnGhost} disabled={loading}>
            {copied ? "Copiado" : "Copiar"}
          </button>
          <button aria-label="Cerrar" style={styles.close} onClick={onClose}>✕</button>
        </div>
      </div>

      <span aria-live="polite" style={styles.status}>{copied ? "Copiado" : ""}</span>

      <div>{content}</div>

      {!loading && (
        <>
          <div style={styles.hint}>
            Doble-clic en otra palabra, o <b>Ctrl/⌘+K</b> con una palabra seleccionada.
          </div>
          <div style={styles.btnRow}>
            <button style={styles.btn} onClick={searchSelected} disabled={loading}>
              Buscar selección
            </button>
          </div>
        </>
      )}
    </div>
  ) : null
}

export default Tooltip
