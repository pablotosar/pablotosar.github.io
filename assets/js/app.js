/* pablotosar.com · conmutador de tema, hojas, luz bajo el puntero, pausa del carrusel, calculadora rápida y copiar correo.
   Se carga en <head> sin defer: aplica el tema guardado antes del primer pintado; el resto espera al DOM. Sin librerías.
   Solo guarda en localStorage la preferencia de tema («tema»), si la eliges con el botón. */
(() => {
  const d = document, r = d.documentElement, mq = (q) => matchMedia(q);
  const dark = mq("(prefers-color-scheme: dark)"), calm = () => mq("(prefers-reduced-motion: reduce)").matches;
  try { const t = localStorage.getItem("tema"); if (t === "light" || t === "dark") r.dataset.theme = t; } catch (e) {}
  const cur = () => r.dataset.theme || (dark.matches ? "dark" : "light");
  const vt = (f) => (d.startViewTransition && !calm() ? d.startViewTransition(f) : (f(), null));
  const nm = (e, v) => e && (e.style.viewTransitionName = v);

  d.addEventListener("DOMContentLoaded", () => {
    /* Tema: sigue al sistema; el botón fija una preferencia y se recuerda al navegar */
    const tb = d.getElementById("tema");
    if (tb) {
      const sync = () => tb.setAttribute("aria-pressed", String(cur() === "dark"));
      sync(); dark.addEventListener("change", sync);
      tb.addEventListener("click", () => {
        const n = cur() === "dark" ? "light" : "dark";
        try { localStorage.setItem("tema", n); } catch (e) {}
        vt(() => { r.dataset.theme = n; sync(); });
      });
    }

    /* Hojas: la pieza se convierte en la hoja y vuelve a su sitio por el mismo camino */
    let src = null;
    const open = (g, t) => { src = t; nm(t, "sheet"); vt(() => { nm(t, ""); nm(g, "sheet"); g.showModal(); }); };
    const shut = (g) => {
      if (!g.open) return;
      const t = src, x = vt(() => { g.close(); nm(g, ""); nm(t, "sheet"); }), c = () => nm(t, "");
      x ? x.finished.then(c, c) : c();
    };
    d.addEventListener("click", (e) => {
      const b = e.target.closest("[commandfor]"), g = b && d.getElementById(b.getAttribute("commandfor"));
      if (!g || g.tagName !== "DIALOG") return;
      e.preventDefault();
      b.getAttribute("command") === "close" ? shut(g) : open(g, b.closest(".tile"));
    });
    d.querySelectorAll("dialog.sheet").forEach((g) => {
      g.addEventListener("cancel", (e) => { e.preventDefault(); shut(g); });
      g.addEventListener("click", (e) => { if (e.target === g) shut(g); });
    });

    /* Luz bajo el puntero: JS solo escribe dos variables */
    if (mq("(hover: hover) and (pointer: fine)").matches) {
      d.querySelectorAll(".tile[data-glow]").forEach((t) => t.addEventListener("pointermove", (e) => {
        const b = t.getBoundingClientRect();
        t.style.setProperty("--mx", e.clientX - b.left + "px");
        t.style.setProperty("--my", e.clientY - b.top + "px");
      }));
    }

    /* Pausa del carrusel (WCAG 2.2.2) */
    const fu = d.querySelector(".t-fuera"), pb = fu && fu.querySelector(".pause");
    pb && pb.addEventListener("click", () => {
      const p = fu.toggleAttribute("data-paused");
      pb.setAttribute("aria-pressed", String(p));
      pb.setAttribute("aria-label", p ? "Reanudar movimiento" : "Pausar movimiento");
    });

    /* Calculadora rápida: balance del primer año = ahorro - (montaje + mantenimiento) */
    const f = d.getElementById("calc");
    if (f) {
      const N = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }), h = (n) => N.format(n) + " h", $ = (i) => d.getElementById(i);
      const up = () => {
        const v = (n) => +f.elements[n].value, s = (v("freq") * v("min")) / 60, c = v("horas") + (v("mant") * 12) / 60, b = s - c;
        f.querySelectorAll("[data-for]").forEach((o) => { o.value = f.elements[o.dataset.for].value; });
        $("calc-out").value = (b < 0 ? "−" : "+") + h(Math.abs(b));
        $("calc-save").textContent = h(s); $("calc-cost").textContent = h(c);
        $("calc-verdict").textContent = b >= 0 ? "Compensa ya en el primer año." : "En el primer año, todavía no compensa.";
        $("calc-result").dataset.state = b >= 0 ? "yes" : "no";
      };
      f.addEventListener("input", up); f.addEventListener("submit", (e) => e.preventDefault()); up();
    }

    /* Copiar correo */
    const st = d.getElementById("copy-status");
    d.querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(b.dataset.copy); if (st) st.textContent = "Correo copiado."; }
      catch (e) { if (st) st.textContent = "No se pudo copiar. Selecciona la dirección de arriba."; }
    }));
  });
})();
