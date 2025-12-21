// app/javascript/controllers/redact_controller.js
import { Controller } from "@hotwired/stimulus"

/*
  Requirements:
  - Rails resource :redactions (POST /redactions)
  - CSRF meta tag present (default Rails layout)
*/
export default class extends Controller {
  static targets = [
    "input",
    "output",
    "highlight",
    "dictionary",
    "findings",
    "statusPill",
    "meta",
    "copyBtn",
  ]

  connect() {
    this.debounceMs = 350
    this._timer = null
    this._lastReqId = 0
    this.setStatus("Idle", "idle")
    this.syncHighlightScroll()
    this.highlightTarget.textContent = ""
  }

  onInput() {
    // Mirror typed text into highlight preview (no markup) until we have spans
    if (!this.outputTarget.value) {
      this.highlightTarget.textContent = this.inputTarget.value
    }

    window.clearTimeout(this._timer)
    this._timer = window.setTimeout(() => this.run(), this.debounceMs)
  }

  async run() {
    const text = this.inputTarget.value || ""
    if (!text.trim()) {
      this.outputTarget.value = ""
      this.highlightTarget.textContent = ""
      this.renderFindings([])
      this.copyBtnTarget.disabled = true
      this.setStatus("Idle", "idle")
      this.metaTarget.textContent = ""
      return
    }

    const reqId = ++this._lastReqId
    this.setStatus("Redacting…", "busy")

    try {
      const payload = new FormData()
      payload.append("text", text)

      const dictTerms = (this.dictionaryTarget.value || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)

      // Rails will parse dictionary[] as an Array
      dictTerms.forEach((t) => payload.append("dictionary[]", t))

      const res = await fetch("/redactions", {
        method: "POST",
        headers: { "X-CSRF-Token": this.csrfToken() },
        body: payload,
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = await res.json()

      // Discard out-of-order responses (debounce + slow network)
      if (reqId !== this._lastReqId) return

      const spans = Array.isArray(data.spans) ? data.spans : []
      this.outputTarget.value = data.redacted_text || ""
      this.copyBtnTarget.disabled = !(this.outputTarget.value || "").trim()

      this.renderHighlighted(text, spans)
      this.renderFindings(spans)

      this.setStatus("Done", "ok")
      this.metaTarget.textContent = `${spans.length} detection${spans.length === 1 ? "" : "s"}`
    } catch (e) {
      if (reqId !== this._lastReqId) return
      this.setStatus("Error", "err")
      this.metaTarget.textContent = "Could not redact. Check server logs."
      // keep best-effort preview
      this.highlightTarget.textContent = this.inputTarget.value
    }
  }

  clear() {
    this.inputTarget.value = ""
    this.outputTarget.value = ""
    this.dictionaryTarget.value = ""
    this.highlightTarget.textContent = ""
    this.renderFindings([])
    this.copyBtnTarget.disabled = true
    this.setStatus("Idle", "idle")
    this.metaTarget.textContent = ""
    this.inputTarget.focus()
  }

  loadExample(event) {
    event.preventDefault()
    const exampleNum = event.currentTarget.dataset.example
    const examples = {
      "1": `Hi John Smith,

I wanted to follow up on our conversation about the project. Please contact me at john.smith@example.com or call me at (555) 123-4567.

Best regards,
Sarah Johnson
Acme Corporation Inc.
sarah.johnson@acme.com`,
      "2": `Patient Information:
Name: Dr. Michael Williams
SSN: 123-45-6789
Phone: 555-987-6543
Address: 123 Main Street, Suite 100, New York, NY 10001

Medical records for review. Please contact the patient at m.williams@hospital.com.`,
      "3": `Technical Report - Server Configuration

The production server at 192.168.1.100 is accessible via https://api.example.com/v1/status.
Contact the DevOps team at devops@techcorp.com or visit https://techcorp.com/support.

Company: TechCorp Solutions LLC
IP Range: 10.0.0.1 to 10.0.0.255
Support: support@techcorp.com`
    }

    const exampleText = examples[exampleNum]
    if (exampleText) {
      this.inputTarget.value = exampleText
      this.inputTarget.focus()
      // Trigger the input event to start redaction
      this.onInput()
    }
  }

  async copy() {
    const text = this.outputTarget.value || ""
    if (!text.trim()) return

    try {
      await navigator.clipboard.writeText(text)
      this.setStatus("Copied", "ok")
      window.setTimeout(() => {
        // only revert if nothing else is running
        if (this.statusPillTarget.textContent === "Copied") this.setStatus("Done", "ok")
      }, 900)
    } catch {
      // fallback
      this.outputTarget.focus()
      this.outputTarget.select()
      document.execCommand("copy")
      this.setStatus("Copied", "ok")
    }
  }

  // ---------- Rendering helpers ----------

  renderHighlighted(text, spans) {
    if (!text) {
      this.highlightTarget.textContent = ""
      return
    }

    // Defensive: clamp + sort
    const safe = spans
      .map((s) => ({
        start: Math.max(0, Math.min(text.length, Number(s.start))),
        end: Math.max(0, Math.min(text.length, Number(s.end))),
        type: (s.type || "unknown").toString(),
        placeholder: (s.placeholder || "").toString(),
        value: (s.value || "").toString(),
      }))
      .filter((s) => Number.isFinite(s.start) && Number.isFinite(s.end) && s.end > s.start)
      .sort((a, b) => a.start - b.start || b.end - a.end)

    // Build HTML with marks
    let out = ""
    let cursor = 0

    for (const s of safe) {
      if (s.start < cursor) continue // skip overlaps (server should already resolve)
      out += this.escapeHtml(text.slice(cursor, s.start))

      const frag = text.slice(s.start, s.end)
      const label = s.placeholder || `[${s.type}]`
      out += `<mark class="pii pii-${this.safeClass(s.type)}" title="${this.escapeAttr(
        `${s.type} → ${label}`
      )}">${this.escapeHtml(frag)}</mark>`

      cursor = s.end
    }

    out += this.escapeHtml(text.slice(cursor))
    this.highlightTarget.innerHTML = out

    // Keep highlight scroll in sync with textarea after render
    this.syncHighlightScroll()
  }

  renderFindings(spans) {
    const list = Array.isArray(spans) ? spans : []
    if (!list.length) {
      this.findingsTarget.innerHTML = `<div class="empty">No detections yet.</div>`
      return
    }

    // Group by type
    const grouped = new Map()
    for (const s of list) {
      const type = (s.type || "unknown").toString()
      grouped.set(type, (grouped.get(type) || 0) + 1)
    }

    const groupsHtml = Array.from(grouped.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => {
        return `
          <div class="finding">
            <span class="badge badge-${this.safeClass(type)}">${this.escapeHtml(type)}</span>
            <span class="count">${count}</span>
          </div>
        `
      })
      .join("")

    // Also show first ~8 items for quick sanity-check
    const itemsHtml = list
      .slice(0, 8)
      .map((s) => {
        const type = (s.type || "unknown").toString()
        const value = (s.value || "").toString()
        const placeholder = (s.placeholder || "").toString()
        const preview = value.length > 34 ? value.slice(0, 34) + "…" : value
        return `
          <div class="item">
            <span class="badge badge-${this.safeClass(type)}">${this.escapeHtml(type)}</span>
            <code class="preview">${this.escapeHtml(preview)}</code>
            <span class="arrow">→</span>
            <code class="ph">${this.escapeHtml(placeholder || "")}</code>
          </div>
        `
      })
      .join("")

    this.findingsTarget.innerHTML = `
      <div class="finding-groups">${groupsHtml}</div>
      <div class="finding-items">${itemsHtml}</div>
      ${list.length > 8 ? `<div class="more">…and ${list.length - 8} more</div>` : ""}
    `
  }

  setStatus(text, kind) {
    // Preserve the dot indicator span
    const dot = this.statusPillTarget.querySelector('span')
    if (dot) {
      // Remove all text nodes but keep the span
      Array.from(this.statusPillTarget.childNodes).forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          node.remove()
        }
      })
      // Add the new text after the span
      this.statusPillTarget.appendChild(document.createTextNode(` ${text}`))
    } else {
      this.statusPillTarget.textContent = text
    }
    this.statusPillTarget.dataset.kind = kind
  }

  csrfToken() {
    const el = document.querySelector('meta[name="csrf-token"]')
    return el ? el.content : ""
  }

  safeClass(type) {
    return type.toLowerCase().replace(/[^a-z0-9_-]/g, "")
  }

  escapeHtml(str) {
    return (str || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;")
  }

  escapeAttr(str) {
    return this.escapeHtml(str).replaceAll("\n", " ")
  }

  // Keep the highlight <pre> scrolled in sync with textarea
  syncHighlightScroll() {
    const ta = this.inputTarget
    const pre = this.highlightTarget

    // Ensure identical font/line-height in CSS (below), then sync scrollTop
    const handler = () => {
      pre.scrollTop = ta.scrollTop
      pre.scrollLeft = ta.scrollLeft
    }

    // Avoid stacking listeners: remove then add
    ta.removeEventListener("scroll", handler)
    ta.addEventListener("scroll", handler)

    handler()
  }
}
