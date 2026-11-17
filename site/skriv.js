// Skrivesiden: lager en ny beretning og lagrer den (tekst + bilder) som én commit i GitHub-repoet.
// GitHub Pages bygger så siden på nytt (se .github/workflows/pages.yml).
//
// Ingen hemmeligheter ligger i denne fila. Siden trenger en finkornet GitHub-nøkkel
// (fine-grained personal access token) med bare «Contents: Read and write» på dette repoet.
// Nøkkelen lagres kun i nettleseren på enheten der du limer den inn.

const REPO = { owner: 'ThorTveito', repo: 'personal-site', branch: 'main' };
const DATA_PATH = 'site/beretninger.json';     // i repoet
const IMG_DIR = 'beretninger';                 // relativt til site/
const MAX_EDGE = 2000;                         // lengste side i piksler
const QUALITY = 0.82;                          // JPEG-kvalitet
const TOKEN_KEY = 'skriv.github-token';
const DRAFT_KEY = 'skriv.utkast';

(() => {
  const $ = (id) => document.getElementById(id);
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
    del(k) { try { localStorage.removeItem(k); } catch {} },
  };

  $('repo-name').textContent = `${REPO.owner}/${REPO.repo}`;

  // ---------- Nøkkel ----------
  let token = store.get(TOKEN_KEY);
  function showState() {
    $('key-setup').hidden = !!token;
    $('writer').hidden = !token;
    $('key-info').hidden = !token;
  }
  $('save-token').addEventListener('click', () => {
    const v = $('token').value.trim();
    if (!/^(github_pat_|ghp_)[A-Za-z0-9_]+$/.test(v)) {
      $('token').setAttribute('aria-invalid', 'true');
      $('token').focus();
      return;
    }
    token = v; store.set(TOKEN_KEY, v); $('token').value = '';
    showState(); $('title').focus();
  });
  $('forget-token').addEventListener('click', () => {
    token = null; store.del(TOKEN_KEY); showState();
  });
  showState();

  // ---------- Utkast (tittel, dato, tekst) ----------
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  try {
    const draft = JSON.parse(store.get(DRAFT_KEY) || '{}');
    $('title').value = draft.title || '';
    $('body').value = draft.body || '';
    $('date').value = draft.date || today();
  } catch { $('date').value = today(); }
  const saveDraft = () => store.set(DRAFT_KEY, JSON.stringify({ title: $('title').value, body: $('body').value, date: $('date').value }));
  for (const id of ['title', 'body', 'date']) $(id).addEventListener('input', saveDraft);

  // ---------- Bilder ----------
  // Tegnes om på et lerret: mindre fil, riktig retning, og all EXIF (også GPS) forsvinner.
  const images = []; // { blob, width, height, preview, caption }
  async function prepare(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
      const width = Math.round(img.naturalWidth * scale);
      const height = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', QUALITY));
      if (!blob) throw new Error('toBlob');
      return { blob, width, height, preview: URL.createObjectURL(blob), caption: '' };
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  function renderImages() {
    const list = $('images');
    list.textContent = '';
    images.forEach((im, i) => {
      const li = document.createElement('li');
      li.className = 'skriv-image';
      const img = document.createElement('img');
      img.src = im.preview; img.alt = '';
      const cap = document.createElement('input');
      cap.className = 'input'; cap.type = 'text'; cap.value = im.caption;
      cap.placeholder = 'Bildetekst (valgfri)';
      cap.setAttribute('aria-label', `Bildetekst for bilde ${i + 1}`);
      cap.addEventListener('input', () => { im.caption = cap.value; });
      const rm = document.createElement('button');
      rm.type = 'button'; rm.className = 'btn btn--quiet'; rm.textContent = 'Fjern';
      rm.setAttribute('aria-label', `Fjern bilde ${i + 1}`);
      rm.addEventListener('click', () => { URL.revokeObjectURL(im.preview); images.splice(i, 1); renderImages(); });
      li.append(img, cap, rm);
      list.append(li);
    });
  }
  $('files').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    setStatus(files.length === 1 ? 'Gjør klar bildet …' : `Gjør klar ${files.length} bilder …`);
    let failed = 0;
    for (const f of files) {
      try { images.push(await prepare(f)); renderImages(); } catch { failed++; }
    }
    setStatus(failed ? `${failed} bilde(r) kunne ikke leses. HEIC-bilder fra iPhone må eventuelt lagres som JPEG først.` : '');
  });

  // ---------- GitHub ----------
  const api = `https://api.github.com/repos/${REPO.owner}/${REPO.repo}`;
  async function gh(path, { method = 'GET', body, raw = false } = {}) {
    const res = await fetch(api + path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
    if (!res.ok) {
      const err = new Error(`GitHub ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return raw ? res.text() : res.json();
  }
  const toBase64 = (blob) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
  const slug = (s) => s.toLowerCase()
    .replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'beretning';

  async function publish({ title, date, body }) {
    // Hent dagens innhold først, så vi kan lage en unik id og mappe for bildene.
    const head = async () => {
      const ref = await gh(`/git/ref/heads/${REPO.branch}`);
      const commit = await gh(`/git/commits/${ref.object.sha}`);
      let data;
      try { data = JSON.parse(await gh(`/contents/${DATA_PATH}?ref=${ref.object.sha}`, { raw: true })); }
      catch (e) { if (e.status === 404) data = { name: 'Thor Tveito', docUrl: '', posts: [] }; else throw e; }
      return { sha: ref.object.sha, tree: commit.tree.sha, data };
    };

    let cur = await head();
    const base = `${date}-${slug(title)}`;
    let id = base;
    for (let n = 2; cur.data.posts.some((p) => p.id === id); n++) id = `${base}-${n}`;

    // Bildene lastes opp én gang. De avhenger ikke av hva som ellers ligger i repoet.
    const imageEntries = [];
    for (let i = 0; i < images.length; i++) {
      setStatus(`Laster opp bilde ${i + 1} av ${images.length} …`);
      const blob = await gh('/git/blobs', { method: 'POST', body: { content: await toBase64(images[i].blob), encoding: 'base64' } });
      const file = `${String(i + 1).padStart(2, '0')}.jpg`;
      imageEntries.push({ path: `site/${IMG_DIR}/${id}/${file}`, sha: blob.sha, src: `${IMG_DIR}/${id}/${file}`, im: images[i] });
    }

    // Ny commit med bildene og oppdatert beretninger.json. Prøv igjen hvis noe annet ble lagret i mellomtiden.
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt) cur = await head();
      setStatus('Lagrer …');
      const post = {
        id, date, title, body,
        images: imageEntries.map((e) => ({
          src: e.src, width: e.im.width, height: e.im.height,
          ...(e.im.caption.trim() ? { caption: e.im.caption.trim() } : {}),
        })),
        source: 'skriv',
      };
      const data = { ...cur.data, posts: [post, ...cur.data.posts.filter((p) => p.id !== id && p.source !== 'eksempel')] };
      data.posts.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      const json = await gh('/git/blobs', { method: 'POST', body: { content: JSON.stringify(data, null, 2) + '\n', encoding: 'utf-8' } });
      const tree = await gh('/git/trees', {
        method: 'POST',
        body: {
          base_tree: cur.tree,
          tree: [
            { path: DATA_PATH, mode: '100644', type: 'blob', sha: json.sha },
            ...imageEntries.map((e) => ({ path: e.path, mode: '100644', type: 'blob', sha: e.sha })),
          ],
        },
      });
      const commit = await gh('/git/commits', {
        method: 'POST',
        body: { message: `Ny beretning: ${title}`, tree: tree.sha, parents: [cur.sha] },
      });
      try {
        await gh(`/git/refs/heads/${REPO.branch}`, { method: 'PATCH', body: { sha: commit.sha, force: false } });
        return id;
      } catch (e) {
        if (e.status !== 422 || attempt === 2) throw e; // 422 = noen andre committet først
      }
    }
  }

  // ---------- Publiser ----------
  function setStatus(text) { $('status').textContent = text; }
  let busy = false;
  $('publish').addEventListener('click', async () => {
    if (busy) return;
    const title = $('title').value.trim();
    const date = $('date').value;
    const body = $('body').value.replace(/\r/g, '').trim();
    if (!title) { setStatus('Skriv en tittel først.'); $('title').focus(); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { setStatus('Velg en dato.'); $('date').focus(); return; }

    busy = true;
    $('publish').setAttribute('aria-disabled', 'true');
    try {
      const id = await publish({ title, date, body });
      store.del(DRAFT_KEY);
      $('title').value = ''; $('body').value = ''; $('date').value = today();
      images.forEach((im) => URL.revokeObjectURL(im.preview));
      images.length = 0; renderImages();
      $('status').textContent = 'Publisert. Siden oppdateres om et minutt eller to. ';
      const a = document.createElement('a');
      a.className = 'text-link'; a.href = `beretninger.html#${id}`; a.textContent = 'Se beretningen →';
      $('status').append(a);
    } catch (e) {
      const why = {
        401: 'GitHub godtok ikke nøkkelen. Den kan ha utløpt. Glem nøkkelen og lim inn en ny.',
        403: 'Nøkkelen har ikke lov til å skrive. Sjekk at «Contents» står på «Read and write».',
        404: `Fant ikke repoet ${REPO.owner}/${REPO.repo}. Sjekk at nøkkelen har tilgang til det.`,
        409: 'Repoet er tomt eller låst. Prøv igjen om litt.',
        422: 'Noen andre lagret samtidig. Prøv igjen.',
      }[e.status];
      setStatus((why || 'Noe gikk galt, så ingenting ble publisert. Teksten er lagret som utkast. Prøv igjen.') + (e.status ? ` (${e.status})` : ''));
    } finally {
      busy = false;
      $('publish').removeAttribute('aria-disabled');
    }
  });
})();
