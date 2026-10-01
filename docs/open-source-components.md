# Componentes open source

Qué usamos, por qué y cómo quitarlo. Solo herramientas de verificación: **nada de
esto se publica con la web** (`docs/`, `tests/` y `package*.json` están en
`exclude` de `_config.yml`). La web publicada sigue siendo HTML + CSS sin JavaScript.

Revisado: 2026-09-30. Revisión de oportunidades: semanal. Actualizaciones: Dependabot.

## En uso

| Proyecto | Versión / commit | Licencia | Necesidad | Por qué este | Riesgos y mantenimiento | Cómo retirarlo |
|---|---|---|---|---|---|---|
| [github-pages gem](https://github.com/github/pages-gem) | `232` (fijada en `Gemfile`) | MIT | Compilar en CI con las mismas versiones que Pages (Jekyll 3.10) | Ya era la base del proyecto | Última release 2024-08: el build clásico de Pages está congelado. Si algún día hace falta Jekyll 4, migrar a Pages con Actions (cambio de despliegue → requiere aprobación) | No retirar mientras se use el build clásico |
| [html-proofer](https://github.com/gjtorikian/html-proofer) | `5.2.2` | MIT | Enlaces, imágenes y recursos rotos en el HTML generado | Mismo toolchain Ruby, funciona sin red para enlaces internos, un solo gem | Activo (release 2026-07). Enlaces externos solo en el job semanal para no bloquear PRs por webs ajenas | Quitar del `Gemfile` y los pasos `htmlproofer` de los workflows |
| [@playwright/test](https://github.com/microsoft/playwright) | `1.63.0` (lockfile) | Apache-2.0 | Pruebas en navegador de escritorio y móvil | Estándar actual, sin scripts de instalación, descarga Chromium solo en CI | Actualizaciones frecuentes; Dependabot agrupa | Borrar `tests/`, `playwright.config.js`, `package*.json` y los pasos Node de `ci.yml` |
| [@axe-core/playwright](https://github.com/dequelabs/axe-core-npm) | `4.13.0` (lockfile) | MPL-2.0 (sin modificar, solo se usa) | Accesibilidad automática WCAG 2.2 AA | Motor de referencia, integrado en las pruebas de Playwright | axe detecta solo una parte de los problemas: **no sustituye revisión manual** (teclado, lector de pantalla, lenguaje) | Quitar el bloque `AxeBuilder` de `tests/site.spec.js` |
| [actions/checkout](https://github.com/actions/checkout) | `v7.0.1` @ `3d3c42e5` | MIT | CI | Oficial | Fijada a SHA; Dependabot propone cambios | — |
| [ruby/setup-ruby](https://github.com/ruby/setup-ruby) | `v1.327.0` @ `14594264` | MIT | Ruby + caché de gems | Oficial de la org Ruby | Fijada a SHA | — |
| [actions/setup-node](https://github.com/actions/setup-node) | `v7.0.0` @ `82076278` | MIT | Node + caché npm | Oficial | Fijada a SHA | — |
| [actions/upload-artifact](https://github.com/actions/upload-artifact) | `v7.0.1` @ `043fb46d` | MIT | Preview descargable de cada PR (`_site` + reporte) | Oficial | Fijada a SHA. Retención 14 días | — |

Actualizar un SHA a mano: `git ls-remote https://github.com/<owner>/<repo> refs/tags/<tag>` y
sustituir el SHA y el comentario de versión.

## Evaluados y descartados (2026-09-30)

| Necesidad | Candidato | Decisión | Motivo |
|---|---|---|---|
| Accesibilidad | pa11y-ci 4.1.1 | Descartado | 6 avisos *high* sin arreglo compatible (extract-zip vía puppeteer) |
| Accesibilidad | Playwright + axe | **Elegido** | 0 vulnerabilidades, 22 MB, cubre también pruebas funcionales |
| Enlaces | lycheeverse/lychee-action | Descartado | Segundo toolchain innecesario; la Action tuvo una inyección de código (GHSA-65rg-554r-9j5x, corregida) |
| Enlaces | html-proofer | **Elegido** | Ya tenemos Ruby |
| Secretos | gitleaks | Descartado | GitHub *secret scanning* y *push protection* ya están activos en el repo (verificado vía API) |
| Rendimiento | Lighthouse CI | Aplazado | Web estática sin JS, ~8 KB de HTML. Sin release desde 2025-06. Reevaluar si se añade JS o imágenes pesadas |
| Dependencias | Renovate | Descartado | Dependabot es nativo, sin app de terceros ni permisos extra |
| Búsqueda | Pagefind | Aplazado | No hay artículos todavía. Reevaluar con ~15 artículos |
| CMS | Decap CMS | Descartado por ahora | Requiere backend OAuth externo; la revisión por PR cubre la necesidad |
| Automatización | anthropics/claude-code-action | No incorporado | Necesita credencial de API (coste nuevo) y tuvo un RCE vía config MCP en PRs (GHSA-8q5r-mmjf-575q). Se prefiere Claude Code Routine |

## Limitaciones conocidas

- Pasar axe no significa que la web sea accesible; significa que no tiene los fallos que axe detecta.
- Las pruebas corren contra un servidor estático local, no contra GitHub Pages (cabeceras y 404 reales pueden diferir). `npm run test:prod` prueba producción.
- `Gemfile.lock` sigue en `.gitignore` (GitHub Pages lo ignora); las versiones directas están fijadas en `Gemfile` y `github-pages` fija las transitivas de Jekyll.
