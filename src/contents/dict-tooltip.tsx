import type { PlasmoCSConfig } from "plasmo"
import React, { useEffect, useMemo, useRef, useState } from "react"
import { lookup, formatEntry } from "../lib/dict"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_idle"
}

// Toma la palabra seleccionada (si el usuario selecciona más de una, usa la primera)
function getSelectedWord(): string {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return ""
  const raw = sel.toString().trim()
  if (!raw) return ""
  // primera palabra con letras (permite acentos y apóstrofos)
  const m = raw.match(/[\p{L}\p{M}'-]+/u)
  return (m?.[0] || "").toLowerCase()
}

const Tooltip: React.FC = () => {
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [content, setContent] = useState<string>("Doble-clic en una palabra para ver su definición…")
  const boxRef = useRef<HTMLDivElement>(null)

  // Estilos: panel fijo a la derecha
  const styles = useMemo(() => {
    const box: React.CSSProperties = {
      position: "fixed",
      top: "10%",
      right: 16,
      width: 360,
      maxHeight: "80vh",
      overflow: "auto",
      background: "#111",
      color: "#fff",
      padding: "12px",
      borderRadius: 12,
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
      fontSize: 13,
      lineHeight: 1.35,
      boxShadow: "0 12px 32px rgba(0,0,0,.35)",
      zIndex: 2147483647,
      whiteSpace: "pre-wrap",
      userSelect: "text"
    }
    const header: React.CSSProperties = {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8
    }
    const title: React.CSSProperties = { margin: 0, fontSize: 14, fontWeight: 700, opacity: 0.95 }
    const hint: React.CSSProperties = { opacity: 0.75, fontSize: 12, marginTop: 8 }
    const close: React.CSSProperties = {
      border: 0,
      background: "transparent",
      color: "#bbb",
      cursor: "pointer",
      fontSize: 16
    }
    const btnRow: React.CSSProperties = { display: "flex", gap: 8, marginTop: 8 }
    const btn: React.CSSProperties = {
      border: 0,
      background: "#2563eb",
      color: "#fff",
      borderRadius: 8,
      padding: "6px 10px",
      cursor: "pointer",
      fontWeight: 600
    }
    const btnGhost: React.CSSProperties = {
      border: "1px solid #374151",
      background: "transparent",
      color: "#e5e7eb",
      borderRadius: 8,
      padding: "6px 10px",
      cursor: "pointer",
      fontWeight: 600
    }
    return { box, header, title, hint, close, btnRow, btn, btnGhost }
  }, [])

  async function searchSelected() {
    const word = getSelectedWord()
    if (!word) {
      setVisible(true)
      setContent("Selecciona una sola palabra y vuelve a intentar.")
      return
    }
    setVisible(true)
    setLoading(true)
    setContent("Buscando…")
    const entry = await lookup(word, "es") // <-- español
    setLoading(false)
    setContent(entry ? formatEntry(entry) : "Sin resultados.")
  }

  // Doble-clic muestra el panel y busca
  useEffect(() => {
    const onDbl = () => searchSelected()
    document.addEventListener("dblclick", onDbl)
    return () => document.removeEventListener("dblclick", onDbl)
  }, [])

  // Ctrl/⌘ + K para abrir con la palabra seleccionada
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

  // Copiar contenido
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(content || "")
    } catch {}
  }

  return visible ? (
    <div
      ref={boxRef}
      style={styles.box}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div style={styles.header}>
        <h4 style={styles.title}>Diccionario (ES)</h4>
        <div style={styles.btnRow}>
          <button onClick={onCopy} style={styles.btnGhost} disabled={loading}>
            Copiar
          </button>
          <button aria-label="Cerrar" style={styles.close} onClick={() => setVisible(false)}>
            ✕
          </button>
        </div>
      </div>

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
