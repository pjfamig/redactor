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
  }

  onInput() {
    window.clearTimeout(this._timer)
    this._timer = window.setTimeout(() => this.run(), this.debounceMs)
  }

  async run() {
    const text = this.inputTarget.value || ""
    if (!text.trim()) {
      this.outputTarget.value = ""
      this.renderFindings([])
      this.setCopyButtonsDisabled(true)
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
      this.setCopyButtonsDisabled(!(this.outputTarget.value || "").trim())

      this.renderFindings(spans)

      this.setStatus("Done", "ok")
      this.metaTarget.textContent = `${spans.length} detection${spans.length === 1 ? "" : "s"}`
    } catch (e) {
      if (reqId !== this._lastReqId) return
      this.setStatus("Error", "err")
      this.metaTarget.textContent = "Could not redact. Check server logs."
    }
  }

  clear() {
    this.inputTarget.value = ""
    this.outputTarget.value = ""
    this.dictionaryTarget.value = ""
    this.renderFindings([])
    this.setCopyButtonsDisabled(true)
    this.setStatus("Idle", "idle")
    this.metaTarget.textContent = ""
    this.inputTarget.focus()
  }

  setCopyButtonsDisabled(disabled) {
    this.copyBtnTargets.forEach((el) => { el.disabled = disabled })
  }

  loadExample(event) {
    event.preventDefault()
    const exampleNum = event.currentTarget.dataset.example
    const examples = {
      "1": `Hi Maria Santos,

Quick follow-up: the contract review is ready. Reach me at maria.santos@lawfirm.com or (212) 555-0147.

Thanks,
David Chen`,
      "2": `CLINICAL NOTE - Follow-up Visit
Date: 03/15/2025
Patient: Robert Henderson DOB 08/22/1961
MRN: 88492

CC: Worsening low back pain x 3 weeks, requesting prior auth for physical therapy.

HPI: Mr. Henderson is a 63 yo M with h/o lumbar DDD, s/p L4-L5 fusion 2019. He reports increased pain since shoveling snow in January. Currently on cyclobenzaprine 10 mg at bedtime and naproxen 500 mg BID. Denies bowel/bladder changes, fever, or leg weakness. Pain 6/10, worse with prolonged sitting.

Meds: Lisinopril 10 mg daily, metformin 500 mg BID, atorvastatin 20 mg qHS, cyclobenzaprine 10 mg qHS, naproxen 500 mg BID prn.

A/P: Lumbar radiculopathy, stable. Continue current meds. Order PT x 6 weeks. Will submit prior auth to Aetna. Patient to call (617) 555-8821 if no approval in 2 weeks. F/U in 6 weeks.

Dr. Patricia Wong
Boston Spine Associates
pwong@bostonspine.org`,
      "3": `INSURANCE APPEAL - Prior Authorization Denial
Member: Jennifer Martinez
DOB: 04/11/1978
Member ID: AET-772-4491
Group: 8842
Denial date: 02/28/2025
Service: Continuous glucose monitoring (CGM), Dexcom G7

CLINICAL SUMMARY:
Ms. Martinez has Type 1 diabetes (ICD-10 E10.65), diagnosed age 12. She has had multiple episodes of severe hypoglycemia requiring ER visits (last 11/2024 at Metro General). Current regimen: insulin pump (Tandem t:slim), Humalog U-100 per pump settings, CGM previously approved through 01/2025. A1c at last visit (02/10/2025) was 7.2%. She works overnight shifts as an RN at St. Mary's Hospital and cannot reliably feel lows; her endocrinologist Dr. Rajiv Mehta (NPI 1123456789) has documented that CGM is medically necessary to prevent dangerous hypoglycemia during sleep and work.

Prior auth was denied 02/28/2025 citing "insufficient documentation of hypoglycemia unawareness." We are submitting this appeal with attached chart notes from Dr. Mehta (visit 02/10/2025), hypoglycemia log (Oct 2024–Jan 2025), and ER discharge summary from Metro General (11/18/2024). Patient's pharmacy: CVS #4821, 1400 Oak Street, Boston MA 02115. Contact: j.martinez.patient@email.com, (857) 555-3302.

REQUEST: Overturn denial and approve CGM (Dexcom G7) for 12 months. Without CGM this patient is at significant risk for severe hypoglycemia, seizure, and death.`
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
        if (this.statusPillTarget.textContent.includes("Copied")) this.setStatus("Done", "ok")
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
}
