window.i18n = {
  lang: "pl",
  data: {},
  async load(l) {
    this.lang = l;
    localStorage.setItem("otd_lang", l);
    const res = await fetch(`/i18n_pack/i18n/${l}.json`);
    if (!res.ok) {
      console.error(`Failed to load language ${l}`);
      return;
    }
    this.data = await res.json();
    this.apply();
  },
  apply() {
    // Apply translations to data-i18n attributes
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      const value = key.split(".").reduce((o, i) => o?.[i], this.data);
      if (value !== undefined && value !== null) {
        el.innerHTML = value;
      }
    });
    // Apply placeholders to data-i18n-ph attributes
    document.querySelectorAll("[data-i18n-ph]").forEach(el => {
      const key = el.getAttribute("data-i18n-ph");
      const value = key.split(".").reduce((o, i) => o?.[i], this.data);
      if (value !== undefined && value !== null) {
        el.setAttribute("placeholder", value);
      }
    });
    // Update language selector buttons
    document.querySelectorAll('#langBarMain button').forEach(btn => {
      btn.classList.toggle('on', btn.dataset.lang === this.lang);
    });
  },
  t(key) {
    // Helper function to get translation by key
    return key.split(".").reduce((o, i) => o?.[i], this.data) || key;
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const lang = localStorage.getItem("otd_lang") || "pl";
  i18n.load(lang);
});
