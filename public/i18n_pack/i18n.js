window.i18n={lang:"pl",data:{},async load(e){this.lang=e,localStorage.setItem("lang",e);const t=await fetch(`/public/i18n/${e}.json`);this.data=await t.json(),this.apply()},apply(){document.querySelectorAll("[data-i18n]").forEach(e=>{const t=e.getAttribute("data-i18n");const n=t.split(".").reduce((o,i)=>o?.[i],this.data);if(n!==undefined&&n!==null)e.innerHTML=n;})}};document.addEventListener("DOMContentLoaded",()=>{const e=localStorage.getItem("lang")||"pl";i18n.load(e)});
// fallback: если язык не подтянулся из старого движка
document.addEventListener('DOMContentLoaded', () => {
  const lang = localStorage.getItem('otd_lang') || 'pl';
  const dictPath = `/public/i18n_pack/${lang}.json`;

  fetch(dictPath)
    .then(r => r.json())
    .then(dict => {
      document.querySelectorAll('[data-i]').forEach(el => {
        const key = el.getAttribute('data-i');
        if (dict[key]) el.textContent = dict[key];
      });
      document.querySelectorAll('[data-i-ph]').forEach(el => {
        const key = el.getAttribute('data-i-ph');
        if (dict[key]) el.placeholder = dict[key];
      });
    })
    .catch(err => console.warn('i18n fallback error', err));
});
