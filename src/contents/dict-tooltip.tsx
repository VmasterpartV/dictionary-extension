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

const PANEL_WIDTH = 360
const START_RIGHT_GAP = 40    // separación inicial desde el borde derecho
const MIN_GAP = 4             // margen mínimo al arrastrar (izq/arriba/der/abajo)
const EDGE_SLACK = 0          // permite meterse -N px fuera del viewport si quieres
const POS_KEY = "dict-panel-pos"

// ---- helpers storage (seguro si no existe chrome.storage) ----
const hasChromeStorage = () => typeof chrome !== "undefined" && !!chrome.storage?.local
async function loadPos(): Promise<{ top: number; left: number } | null> {
  try {
    if (hasChromeStorage()) {
      const obj = await chrome.storage.local.get(POS_KEY)
      return obj?.[POS_KEY] ?? null
    }
  } catch {}
  // fallback localStorage (no ideal, es por origen)
  try {
    const raw = localStorage.getItem(POS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
async function savePos(pos: { top: number; left: number }) {
  try {
    if (hasChromeStorage()) {
      await chrome.storage.local.set({ [POS_KEY]: pos })
      return
    }
  } catch {}
  try {
    localStorage.setItem(POS_KEY, JSON.stringify(pos))
  } catch {}
}

const Tooltip: React.FC = () => {
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [content, setContent] = useState<string>("Doble-clic en una palabra para ver su definición…")
  const [copied, setCopied] = useState(false)

  // ── estado para arrastrar ─────────────────────────
  const [pos, setPos] = useState<{ top: number; left: number }>(() => ({
    top: Math.round(window.innerHeight * 0.1),
    left: Math.round(window.innerWidth - PANEL_WIDTH - START_RIGHT_GAP)
  }))
  // al montar, intenta cargar última posición guardada
  useEffect(() => {
    ;(async () => {
      const saved = await loadPos()
      if (saved && Number.isFinite(saved.top) && Number.isFinite(saved.left)) {
        setPos(saved)
      }
    })()
  }, [])

  // guarda cada cambio de posición
  useEffect(() => { savePos(pos) }, [pos])

  const dragRef = useRef<{ dragging: boolean; startX: number; startY: number; startTop: number; startLeft: number }>({
    dragging: false,
    startX: 0,
    startY: 0,
    startTop: 0,
    startLeft: 0
  })
  const boxRef = useRef<HTMLDivElement>(null)

  // estilos
  const styles = useMemo(() => {
    const box: React.CSSProperties = {
      position: "fixed",
      top: pos.top,
      left: pos.left,
      width: PANEL_WIDTH,
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
      marginBottom: 8,
      cursor: "move",
      userSelect: "none"
    }
    const title: React.CSSProperties = { margin: 0, fontSize: 14, fontWeight: 700, opacity: 0.95 }
    const hint: React.CSSProperties = { opacity: 0.75, fontSize: 12, marginTop: 8 }
    const close: React.CSSProperties = { border: 0, background: "transparent", color: "#bbb", cursor: "pointer", fontSize: 16 }
    const btnRow: React.CSSProperties = { display: "flex", gap: 8, marginTop: 8 }
    const btn: React.CSSProperties = { border: 0, background: "#2563eb", color: "#fff", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontWeight: 600 }
    const btnGhost: React.CSSProperties = { border: "1px solid #374151", background: "transparent", color: "#e5e7eb", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontWeight: 600 }
    const status: React.CSSProperties = { position: "absolute", left: -9999, top: "auto", width: 1, height: 1, overflow: "hidden" }
    return { box, header, title, hint, close, btnRow, btn, btnGhost, status }
  }, [pos])

  // reset “Copiar” cuando cambie el contenido
  useEffect(() => { setCopied(false) }, [content])

  // clamp en resize para no quedar fuera de pantalla
  useEffect(() => {
    const onResize = () => {
      const boxH = boxRef.current?.offsetHeight ?? 0
      const maxLeft = window.innerWidth - MIN_GAP - PANEL_WIDTH
      const maxTop = window.innerHeight - MIN_GAP - Math.min(boxH, window.innerHeight)
      setPos((p) => ({
        top: Math.max(EDGE_SLACK, Math.min(maxTop, p.top)),
        left: Math.max(EDGE_SLACK, Math.min(maxLeft, p.left))
      }))
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

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

  // ── copiar con fallback ───────────────────────────
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
      } catch {}
    }
  }

  const onClose = () => { setVisible(false); setCopied(false) }

  // ── drag handlers (mouse + touch) ─────────────────
  const startDrag = (clientX: number, clientY: number) => {
    dragRef.current.dragging = true
    dragRef.current.startX = clientX
    dragRef.current.startY = clientY
    dragRef.current.startTop = pos.top
    dragRef.current.startLeft = pos.left
  }
  const moveDrag = (clientX: number, clientY: number) => {
    if (!dragRef.current.dragging) return
    const dx = clientX - dragRef.current.startX
    const dy = clientY - dragRef.current.startY

    const boxH = boxRef.current?.offsetHeight ?? 0
    const minLeft = EDGE_SLACK
    const maxLeft = window.innerWidth - MIN_GAP - PANEL_WIDTH
    const minTop = EDGE_SLACK
    const maxTop = window.innerHeight - MIN_GAP - Math.min(boxH, window.innerHeight)

    const newTop = Math.max(minTop, Math.min(maxTop, dragRef.current.startTop + dy))
    const newLeft = Math.max(minLeft, Math.min(maxLeft, dragRef.current.startLeft + dx))

    setPos({ top: newTop, left: newLeft }) // esto ya se guarda por el useEffect([pos])
  }
  const endDrag = () => { dragRef.current.dragging = false }

  const onHeaderMouseDown: React.MouseEventHandler = (e) => {
    e.preventDefault()
    startDrag(e.clientX, e.clientY)
    const onMove = (ev: MouseEvent) => moveDrag(ev.clientX, ev.clientY)
    const onUp = () => {
      endDrag()
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }

  const onHeaderTouchStart: React.TouchEventHandler = (e) => {
    const t = e.touches[0]
    if (!t) return
    startDrag(t.clientX, t.clientY)
    const onMove = (ev: TouchEvent) => {
      const tt = ev.touches[0]
      if (tt) moveDrag(tt.clientX, tt.clientY)
    }
    const onEnd = () => {
      endDrag()
      window.removeEventListener("touchmove", onMove)
      window.removeEventListener("touchend", onEnd)
      window.removeEventListener("touchcancel", onEnd)
    }
    window.addEventListener("touchmove", onMove, { passive: false })
    window.addEventListener("touchend", onEnd)
    window.addEventListener("touchcancel", onEnd)
  }

  return visible ? (
    <div ref={boxRef} style={styles.box} onMouseDown={(e) => e.stopPropagation()}>
      <div
        style={styles.header}
        onMouseDown={onHeaderMouseDown}
        onTouchStart={onHeaderTouchStart}
        title="Arrastra para mover"
      >
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
        </>
      )}
    </div>
  ) : null
}

export default Tooltip
