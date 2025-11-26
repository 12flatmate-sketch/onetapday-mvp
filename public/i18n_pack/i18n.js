window.i18n = {
  lang: "pl",
  data: {},
  async load(l) {
    this.lang = l;
    localStorage.setItem("lang", l);
    const res = await fetch(`/public/i18n/${l}.json`);
    this.data = await res.json();
    this.apply();
  },
  apply() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      const value = key.split(".").reduce((o, i) => o?.[i], this.data);
      if (value !== undefined && value !== null) el.innerHTML = value;
    });
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const lang = localStorage.getItem("lang") || "pl";
  i18n.load(lang);
});
