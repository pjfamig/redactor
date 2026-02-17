import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["lightIcon", "darkIcon"]

  connect() {
    this.applySaved()
    this.syncIcons()
  }

  toggle() {
    document.documentElement.classList.toggle("dark")
    this.save()
    this.syncIcons()
  }

  applySaved() {
    const stored = localStorage.getItem("theme")
    if (stored === "dark") {
      document.documentElement.classList.add("dark")
    } else if (stored === "light") {
      document.documentElement.classList.remove("dark")
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      if (prefersDark) document.documentElement.classList.add("dark")
      else document.documentElement.classList.remove("dark")
    }
  }

  save() {
    const isDark = document.documentElement.classList.contains("dark")
    localStorage.setItem("theme", isDark ? "dark" : "light")
  }

  syncIcons() {
    const isDark = document.documentElement.classList.contains("dark")
    if (this.hasLightIconTarget) {
      this.lightIconTarget.classList.toggle("hidden", !isDark)
    }
    if (this.hasDarkIconTarget) {
      this.darkIconTarget.classList.toggle("hidden", isDark)
    }
  }
}
