// Felles topptekst, meny og bunntekst for alle sider.
// Ny side? Legg til én linje i PAGES. Ingenting annet trenger å endres.
const PAGES = [
  { href: 'bilder.html', label: 'Bilder' },
  { href: 'beretninger.html', label: 'Beretninger' },
];
const NAME = 'Thor Tveito';

(() => {
  const here = location.pathname.split('/').pop() || 'index.html';

  const navList = () => '<ul>' + PAGES.map((p) =>
    `<li><a href="${p.href}"${p.href === here ? ' aria-current="page"' : ''}>${p.label}</a></li>`
  ).join('') + '</ul>';

  // <header data-site-header></header>: liten logo til venstre, meny til høyre
  for (const el of document.querySelectorAll('[data-site-header]')) {
    el.classList.add('site-header');
    el.innerHTML =
      `<a class="vf vf--sm" href="index.html" aria-label="${NAME}, forside"><span class="vf-text">${NAME}</span></a>` +
      `<nav class="nav" aria-label="Hovedmeny">${navList()}</nav>`;
  }

  // <nav data-site-nav></nav>: bare menyen (brukes på forsiden)
  for (const el of document.querySelectorAll('[data-site-nav]')) {
    el.classList.add('nav');
    if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', 'Hovedmeny');
    el.innerHTML = navList();
  }

  // <footer data-site-footer></footer>
  for (const el of document.querySelectorAll('[data-site-footer]')) {
    el.classList.add('site-footer');
    el.innerHTML =
      `<span class="label">© ${new Date().getFullYear()} ${NAME}</span>` +
      `<a class="label" href="#top">Til toppen ↑</a>`;
  }
})();
