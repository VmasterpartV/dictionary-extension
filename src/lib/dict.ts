export type DictEntry = {
    word: string
    senses: string[]
    source: "wiktionary-es"
}

const UA = "mini-dict-extension/0.1 (contact: you@example.com)"
const BASE = "https://api.wikimedia.org/core/v1/wiktionary/es/page"

// -------- helpers de limpieza ----------
function textClean(s: string) {
    return s
        .replace(/\s+/g, " ")
        .replace(/\s([:;,.!?])/g, "$1")
        .trim()
}

function stripExamplePrefix(s: string) {
    // quita "Ejemplo: …" y similares al final
    return s.replace(/(^|\s)Ejemplo:\s.*$/i, "").trim()
}

function removeRefs(el: Element) {
    // quita notas, referencias [1], estilos/scripts incrustados, etc.
    el.querySelectorAll("sup, .mw-ref, .reference, .mw-cite-backlink, style, script").forEach((n) => n.remove())
}

function withinSpanishSection(doc: Document): HTMLElement | null {
    // Encuentra <h2 id="Español"> … hasta el siguiente <h2>
    const h2 = Array.from(doc.querySelectorAll("h2")).find((h) => h.id?.toLowerCase().includes("español"))
    if (!h2) return null
    const frag = document.createElement("div")
    let n: Element | null = h2.nextElementSibling
    while (n && n.tagName !== "H2") {
        frag.appendChild(n.cloneNode(true))
        n = n.nextElementSibling
    }
    return frag
}

function preferSustantivoBlock(root: HTMLElement): HTMLElement {
    // Si existe un bloque con título "Sustantivo ..." úsalo como raíz de búsqueda
    const h4s = Array.from(root.querySelectorAll("h4"))
    const idx = h4s.findIndex((h) => /sustantivo/i.test(h.textContent || ""))
    if (idx >= 0) {
        const frag = document.createElement("div")
        // desde ese h4 hasta el siguiente h4/h3/h2
        let n: Element | null = h4s[idx]!.nextElementSibling
        while (n && !/^(H4|H3|H2)$/.test(n.tagName)) {
            frag.appendChild(n.cloneNode(true))
            n = n.nextElementSibling
        }
        return frag
    }
    return root
}

/** Si la sección es "forma flexiva" (e.g. "Forma del plural de ..."),
 * intenta extraer el lema base (texto del <a>) para redirigir. */
function maybeFindFlexiveLemma(root: HTMLElement): string | null {
    // Busca spans o texto con "definicion-impropia" o frases típicas
    const ddList = Array.from(root.querySelectorAll("dl > dd"))
    for (const dd of ddList) {
        const hasBadge =
            dd.querySelector(".definicion-impropia") ||
            /^(Forma (del|de la)|Flexión de)\b/i.test(dd.textContent || "")
        if (hasBadge) {
            // El enlace suele apuntar al lema base
            const a = dd.querySelector("a[href]")
            const text = (a?.textContent || "").trim()
            if (text) return text.toLowerCase()
        }
    }
    return null
}

function extractFromDL(root: HTMLElement): string[] {
    // Busca <dl> con pares <dt><dd> y toma los dd (definiciones)
    const out: string[] = []
    const dls = Array.from(root.querySelectorAll("dl"))
    for (const dl of dls) {
        const items = Array.from(dl.querySelectorAll(":scope > dd"))
        const defs = items
            .map((dd) => {
                const clone = dd.cloneNode(true) as HTMLElement
                removeRefs(clone) // <-- elimina <style> incrustado y refs
                // si hay listas de ejemplo dentro, elimínalas
                clone.querySelectorAll("ul, ol").forEach((l) => l.remove())
                return stripExamplePrefix(textClean(clone.textContent || ""))
            })
            .filter((t) => t.length > 0 && /\w/.test(t))
        if (defs.length) {
            out.push(...defs)
            break // primera lista útil
        }
    }
    return out
}

function extractFromOL(root: HTMLElement): string[] {
    // Fallback: primera <ol> con <li> “definitorios”
    const out: string[] = []
    const ols = Array.from(root.querySelectorAll("ol"))
    for (const ol of ols) {
        const lis = Array.from(ol.querySelectorAll(":scope > li"))
        const defs = lis
            .map((li) => {
                const clone = li.cloneNode(true) as HTMLElement
                removeRefs(clone) // <-- elimina <style> incrustado y refs
                // quitar "Ejemplo: …" si lo hubiera dentro
                return stripExamplePrefix(textClean(clone.textContent || ""))
            })
            .filter((t) => t && t.length >= 3)
        if (defs.length) {
            out.push(...defs)
            break
        }
    }
    return out
}

// ------------- lookup principal -------------
export async function lookup(wordRaw: string, lang: "es" | "en" = "es"): Promise<DictEntry | null> {
    const word = (wordRaw || "").trim()
    if (!word || lang !== "es") return null

    const url = `${BASE}/${encodeURIComponent(word)}/html`
    const res = await fetch(url, { headers: { "Api-User-Agent": UA } })
    if (!res.ok) return null

    const html = await res.text()
    const doc = new DOMParser().parseFromString(html, "text/html")
    const esBlock = withinSpanishSection(doc)
    if (!esBlock) return null

    // Preferir el segmento bajo “Sustantivo …”
    const scope = preferSustantivoBlock(esBlock)

    // Si es una forma flexiva, intentar resolver el lema y devolver las definiciones del lema
    const lemma = maybeFindFlexiveLemma(scope)
    if (lemma && lemma !== word.toLowerCase()) {
        // Llamada recursiva al lema base
        const base = await lookup(lemma, "es")
        if (base) {
            return {
                word,
                senses: [
                    `Forma flexiva de «${lemma}».`,
                    ...base.senses // añade definiciones reales del lema
                ].slice(0, 4),
                source: "wiktionary-es"
            }
        }
    }

    // 1) Primero intenta con <dl><dd>
    let senses = extractFromDL(scope)

    // 2) Si no hay, intenta con <ol><li>
    if (!senses.length) senses = extractFromOL(scope)

    // Limpiezas finales típicas de Wikcionario
    senses = senses
        .map((s) =>
            s
                // elimina encabezados no definitorios
                .replace(/^Forma del plural.+$/i, "")
                .replace(/^Forma del\s+\w+\s+de.+$/i, "") // plural/de la/de los/…
                .replace(/^Flexión de.+$/i, "")
                .replace(/^Véase.+$/i, "")
                .trim()
        )
        .filter((s) => s && s.length > 2)

    if (!senses.length) return null

    // Limita a 4 definiciones para UI
    return { word, senses: senses.slice(0, 4), source: "wiktionary-es" }
}

export function formatEntry(e: DictEntry): string {
    if (!e) return "Sin resultados."
    const head = `📖 ${e.word} · Wikcionario (es)`
    const defs = e.senses.map((s) => `• ${s}`).join("\n")
    return `${head}\n\n${defs}`
}
