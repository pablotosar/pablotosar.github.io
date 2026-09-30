source "https://rubygems.org"

# GitHub Pages gem — pins Jekyll + all whitelisted plugins
# to the exact versions used by GitHub Pages.
gem "github-pages", "232", group: :jekyll_plugins

# Needed to run Jekyll locally on Ruby 3+
gem "webrick"

# Windows / JRuby compatibility
platforms :mingw, :x64_mingw, :mswin, :jruby do
  gem "tzinfo", ">= 1", "< 3"
  gem "tzinfo-data"
end

gem "wdm", "~> 0.1", platforms: [:mingw, :x64_mingw, :mswin]

# Solo CI/local: valida el HTML generado (enlaces internos, imágenes, alt).
# Ver docs/open-source-components.md
group :test do
  gem "html-proofer", "5.2.2"
end
