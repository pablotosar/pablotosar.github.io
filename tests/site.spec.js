// Comprobaciones de todas las páginas del sitemap: carga limpia, estructura
// básica, accesibilidad (axe, WCAG 2.2 AA) y ausencia de scroll horizontal.
// Las páginas nuevas (posts incluidos) quedan cubiertas automáticamente.
const { test, expect } = require('@playwright/test');
const { default: AxeBuilder } = require('@axe-core/playwright');

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function sitemapPaths(request) {
  const res = await request.get('/sitemap.xml');
  expect(res.ok(), 'sitemap.xml debe existir').toBeTruthy();
  const xml = await res.text();
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  expect(paths.length, 'el sitemap no puede estar vacío').toBeGreaterThan(0);
  return paths;
}

function formatViolations(violations) {
  return violations
    .map((v) => `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.map((n) => n.target.join(' ')).join('\n  ')}`)
    .join('\n');
}

test('todas las páginas del sitemap cargan sin errores y son accesibles', async ({ page, request, baseURL }) => {
  const origin = new URL(baseURL).origin;

  for (const path of await sitemapPaths(request)) {
    await test.step(path, async () => {
      const problems = [];
      page.removeAllListeners();
      page.on('console', (msg) => msg.type() === 'error' && problems.push(`console: ${msg.text()}`));
      page.on('response', (res) => {
        if (res.url().startsWith(origin) && res.status() >= 400) problems.push(`${res.status()} ${res.url()}`);
      });

      const response = await page.goto(path, { waitUntil: 'networkidle' });
      expect(response.status(), `${path} status`).toBe(200);

      await expect(page.locator('html')).toHaveAttribute('lang', /.+/);
      await expect.soft(page.locator('h1'), `${path} debe tener un único h1`).toHaveCount(1);
      await expect.soft(page.locator('link[rel="canonical"]'), `${path} canonical`).toHaveCount(1);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect.soft(overflow, `${path} no debe tener scroll horizontal`).toBeLessThanOrEqual(1);

      const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
      expect.soft(violations, formatViolations(violations)).toEqual([]);

      expect.soft(problems, problems.join('\n')).toEqual([]);
    });
  }
});

test('el primer tabulador lleva al enlace "Saltar al contenido"', async ({ page, isMobile }) => {
  test.skip(isMobile, 'navegación por teclado solo en escritorio');
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toHaveAttribute('href', '#main');
});

test('recursos declarados en <head> existen', async ({ page, request }) => {
  await page.goto('/');
  const hrefs = await page.locator('head link[href^="/"]').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
  for (const href of hrefs) {
    const res = await request.get(href);
    expect(res.status(), href).toBe(200);
  }
});

test('el feed RSS/Atom es válido', async ({ request }) => {
  const res = await request.get('/feed.xml');
  expect(res.ok()).toBeTruthy();
  expect(await res.text()).toMatch(/<feed[\s>]/);
});

test('plantilla de artículo: fecha en español, tiempo de lectura y tabla accesible', async ({ page }) => {
  const res = await page.goto('/writing/post-template/');
  test.skip(res.status() === 404, 'la plantilla solo existe en builds con --drafts (CI)');
  await expect(page.locator('.post-date').first()).toHaveText(/\d{1,2} de [a-z]+ de \d{4}/);
  await expect(page.locator('.post-meta-row')).toContainText('min de lectura');
  const wrap = page.locator('.post-body .table-wrap');
  await expect(wrap).toHaveCount(1);
  await expect(wrap).toHaveAttribute('tabindex', '0');
  await expect(page.locator('h1')).toHaveCount(1);
});

test.describe('calculadora ¿compensa automatizarlo?', () => {
  const casos = [
    // Casos de P-001: veces, minutos, horas, mant/mes, años → neto, equilibrio
    { datos: [52, 18, 6, 15, 2], neto: '+19,2 h', equilibrio: /Unos 5,7 meses/ },
    { datos: [12, 30, 8, 10, 2], neto: '0 h', equilibrio: /Unos 2 años/ },
    { datos: [365, 5, 10, 30, 1], neto: '+14,4 h', equilibrio: /Unos 4,9 meses/ },
    { datos: [12, 10, 4, 10, 2], neto: '-4 h', equilibrio: /Nunca/ },
  ];
  const ids = ['veces', 'minutos', 'construir', 'mantenimiento', 'horizonte'];

  for (const { datos, neto, equilibrio } of casos) {
    test(`calcula ${datos.join('/')}`, async ({ page }) => {
      await page.goto('/herramientas/automatizar/');
      for (const [i, id] of ids.entries()) await page.fill(`#${id}`, String(datos[i]));
      await expect(page.locator('[data-resultado="neto"]')).toHaveText(neto);
      await expect(page.locator('[data-resultado="equilibrio"]')).toHaveText(equilibrio);
    });
  }

  test('datos inválidos muestran un aviso en lugar de un resultado', async ({ page }) => {
    await page.goto('/herramientas/automatizar/');
    await page.fill('#horizonte', '0');
    await expect(page.locator('[data-mensaje]')).toContainText('Revisa los datos');
    await expect(page.locator('[data-resultado="neto"]')).toHaveText('—');
  });

  test('no hace peticiones de red al calcular', async ({ page }) => {
    await page.goto('/herramientas/automatizar/');
    const peticiones = [];
    page.on('request', (r) => peticiones.push(r.url()));
    await page.fill('#veces', '100');
    await page.waitForTimeout(300);
    expect(peticiones).toEqual([]);
  });
});

test('la calculadora declara su CSP y tiene estilos propios', async ({ page }) => {
  await page.goto('/herramientas/automatizar/');
  await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute('content', /script-src 'self'/);
  const fondo = await page.locator('.tool-resultado').evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(fondo, 'el bloque de resultado debe tener fondo (estilos cargados)').not.toBe('rgba(0, 0, 0, 0)');
});

test('zonas táctiles de navegación y footer de al menos 44 px', async ({ page }) => {
  await page.goto('/');
  for (const sel of ['.site-nav a', '.footer-legal a', '.icon-btn']) {
    for (const box of await page.locator(sel).evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) {
      expect(box, `${sel} debe medir ≥44 px de alto`).toBeGreaterThanOrEqual(44);
    }
  }
});

// ── Rediseño «Ría con criterio» ─────────────────────────────────────────────

// Páginas que no están en el sitemap (legal, 404) también se revisan.
const FUERA_DEL_SITEMAP = ['/legal/', '/legal/privacidad/', '/legal/cookies/', '/404.html', '/writing/post-template/'];
const PROHIBIDO = [
  /data-provisional/i,
  /Revisar antes de publicar/i,
  /class="[^"]*\bpendiente\b/i,
  /Por confirmar/i,
  /con puntos/i,
  /falta información/i,
  /lesion/i,
  /crisis personales/i,
  /Coruña/i,
  /momentos personales/i,
  /terapia/i,
  /apnea/i,
  /despacio/i,
  /Santiago/i,
  /jueves/i,
];

test('ningún HTML publicado contiene texto provisional, palabras retiradas ni rayas largas', async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'comprobación de contenido: basta con un proyecto');
  const rutas = [...new Set([...(await sitemapPaths(request)), ...FUERA_DEL_SITEMAP])];
  for (const ruta of rutas) {
    const res = await request.get(ruta);
    if (ruta === '/writing/post-template/' && res.status() === 404) continue; // solo existe con --drafts
    expect(res.status(), ruta).toBe(200);
    // La calculadora usa «—» como valor vacío de sus resultados: es un símbolo, no texto.
    const html = (await res.text()).replace(/(<dd data-resultado="[^"]*">)—(<\/dd>)/g, '$1$2');
    for (const patron of PROHIBIDO) expect.soft(html, `${ruta} contiene ${patron}`).not.toMatch(patron);
    expect.soft(html, `${ruta} contiene rayas largas (— o –)`).not.toMatch(/[\u2013\u2014]/);
  }
});

test('modo oscuro: la portada es accesible (axe) con prefers-color-scheme: dark', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/', { waitUntil: 'networkidle' });
  expect(await page.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches)).toBe(true);
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(violations, formatViolations(violations)).toEqual([]);
});

test('el conmutador de tema fuerza el oscuro y se recuerda al navegar', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await page.click('#tema');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('#tema')).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/now/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('prefers-reduced-motion: ninguna animación en marcha', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const ruta of ['/', '/about/', '/now/', '/herramientas/', '/herramientas/automatizar/']) {
    await test.step(ruta, async () => {
      await page.goto(ruta, { waitUntil: 'networkidle' });
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect
        .poll(() => page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length), { message: `${ruta}: animaciones en marcha` })
        .toBe(0);
    });
  }
});

test('nada se solapa con la boya de la portada (320, 390 y 1440 px)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'los anchos se fijan dentro de la prueba');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const solapes = await page.evaluate(() => {
      const out = [];
      for (const boya of document.querySelectorAll('.ria-buoy')) {
        const B = boya.getBoundingClientRect();
        const pieza = boya.closest('.tile') || document.body;
        for (const el of pieza.querySelectorAll('h1, h2, p, a, .kicker')) {
          const rango = document.createRange();
          rango.selectNodeContents(el);
          for (const r of rango.getClientRects()) {
            if (r.right > B.left && r.left < B.right && r.bottom > B.top && r.top < B.bottom) { out.push(el.textContent.trim().slice(0, 40)); break; }
          }
        }
      }
      return out;
    });
    expect.soft(solapes, `${width}px: texto encima de la boya`).toEqual([]);
  }
});
