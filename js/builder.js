/* Empaque de sitios/PWA, vista previa, zip y publicación (Pages / APK). */
const Builder = {
  esTipo(t) { return esBuilder(t); },

  slug(s) {
    const x = String(s || 'app').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
    return x || 'app';
  },
  applicationId(slug) {
    const s = String(slug || 'app').replace(/[^a-z0-9]/g, '') || 'app';
    return 'dot.alfredo829.e7' + s.slice(0, 20);
  },
  tituloDe(html, fallback) {
    const m = String(html || '').match(/<title[^>]*>([^<]+)<\/title>/i);
    return (m && m[1].trim()) || fallback || 'App de Enjambre';
  },
  colorDe(html) {
    const m = String(html || '').match(/theme-color[^>]*content=["']([^"']+)/i)
      || String(html || '').match(/content=["']([^"']+)["'][^>]*theme-color/i);
    return (m && m[1]) || '#0b0b12';
  },

  crc32(u8) {
    let c = ~0;
    for (let i = 0; i < u8.length; i++) {
      c ^= u8[i];
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
    }
    return ~c >>> 0;
  },
  _u16(n) { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, n, true); return b; },
  _u32(n) { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n, true); return b; },
  _cat(arrs) {
    const n = arrs.reduce((s, a) => s + a.length, 0);
    const o = new Uint8Array(n); let i = 0;
    for (const a of arrs) { o.set(a, i); i += a.length; }
    return o;
  },
  zip(files) {
    const enc = new TextEncoder();
    const chunks = [];
    const central = [];
    let offset = 0;
    for (const [name, data] of Object.entries(files)) {
      const nameB = enc.encode(name.replace(/\\/g, '/'));
      const body = typeof data === 'string' ? enc.encode(data) : (data instanceof Uint8Array ? data : new Uint8Array(data));
      const crc = this.crc32(body);
      const local = this._cat([
        this._u32(0x04034b50), this._u16(20), this._u16(0), this._u16(0), this._u16(0), this._u16(0),
        this._u32(crc), this._u32(body.length), this._u32(body.length), this._u16(nameB.length), this._u16(0),
        nameB, body,
      ]);
      chunks.push(local);
      central.push(this._cat([
        this._u32(0x02014b50), this._u16(20), this._u16(20), this._u16(0), this._u16(0), this._u16(0), this._u16(0),
        this._u32(crc), this._u32(body.length), this._u32(body.length),
        this._u16(nameB.length), this._u16(0), this._u16(0), this._u16(0), this._u16(0), this._u32(0),
        this._u32(offset), nameB,
      ]));
      offset += local.length;
    }
    const cen = this._cat(central);
    const end = this._cat([
      this._u32(0x06054b50), this._u16(0), this._u16(0),
      this._u16(central.length), this._u16(central.length),
      this._u32(cen.length), this._u32(offset), this._u16(0),
    ]);
    return new Blob([this._cat([...chunks, cen, end])], { type: 'application/zip' });
  },

  iconoPNG(size, color, letra) {
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const g = c.getContext('2d');
    g.fillStyle = color || '#7c3aed';
    g.fillRect(0, 0, size, size);
    g.fillStyle = '#0b0b12';
    const m = Math.round(size * 0.16);
    g.fillRect(m, m, size - m * 2, size - m * 2);
    g.fillStyle = '#f4f4f8';
    g.font = 'bold ' + Math.round(size * 0.42) + 'px system-ui,sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText((letra || 'E').slice(0, 1).toUpperCase(), size / 2, size / 2 + size * 0.03);
    return new Promise(res => c.toBlob(b => res(b), 'image/png'));
  },
  async blobABase64(blob) {
    const buf = new Uint8Array(await blob.arrayBuffer());
    let s = '';
    for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i]);
    return 'data:image/png;base64,' + btoa(s);
  },
  async blobBytes(blob) { return new Uint8Array(await blob.arrayBuffer()); },

  swTexto(nombre) {
    return [
      "const V = '" + this.slug(nombre) + "-v1';",
      "const BASE = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png'];",
      "self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(BASE))); self.skipWaiting(); });",
      "self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))); self.clients.claim(); });",
      "self.addEventListener('fetch', e => { if (e.request.method !== 'GET') return; e.respondWith(caches.match(e.request).then(m => m || fetch(e.request))); });",
      '',
    ].join('\n');
  },
  manifestTexto({ nombre, color }) {
    return JSON.stringify({
      name: nombre,
      short_name: String(nombre).slice(0, 12),
      start_url: './',
      scope: './',
      display: 'standalone',
      background_color: color || '#0b0b12',
      theme_color: color || '#0b0b12',
      lang: 'es-MX',
      icons: [
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    }, null, 2);
  },
  inyectarPwa(html, { nombre, color }) {
    let h = String(html || '');
    if (!/rel=["']manifest["']/i.test(h)) {
      h = h.replace(/<\/head>/i, '  <link rel="manifest" href="manifest.json">\n  <link rel="apple-touch-icon" href="icon-192.png">\n</head>');
    }
    if (!/navigator\.serviceWorker/i.test(h)) {
      const boot = '<script>if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js")<\/script>\n</body>';
      if (/<\/body>/i.test(h)) h = h.replace(/<\/body>/i, boot);
      else h += boot;
    }
    if (!/theme-color/i.test(h)) {
      h = h.replace(/<\/head>/i, '  <meta name="theme-color" content="' + (color || '#0b0b12') + '">\n</head>');
    }
    return h;
  },
  async empaquetarPWA(html, meta = {}) {
    const nombre = meta.nombre || this.tituloDe(html, 'App de Enjambre');
    const color = meta.color || this.colorDe(html);
    const letra = nombre.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '').slice(0, 1) || 'E';
    const i192 = await this.iconoPNG(192, '#7c3aed', letra);
    const i512 = await this.iconoPNG(512, '#7c3aed', letra);
    const index = this.inyectarPwa(html, { nombre, color });
    const files = {
      'index.html': index,
      'manifest.json': this.manifestTexto({ nombre, color }),
      'sw.js': this.swTexto(nombre),
      'icon-192.png': await this.blobBytes(i192),
      'icon-512.png': await this.blobBytes(i512),
    };
    return { nombre, color, files, slug: this.slug(nombre), zip: this.zip(files), index };
  },

  pareceCortado(txt, entrega, finish) {
    if (finish === 'length') return true;
    if (!esBuilder(entrega)) return false;
    const raw = String(txt || '');
    const fences = (raw.match(/```/g) || []).length;
    if (fences % 2 === 1) return true;
    const h = pareceHTML(raw) || raw;
    if (/<html[\s>]/i.test(h) && !/<\/html>\s*$/i.test(h.trim())) return true;
    if (/<!doctype html/i.test(h) && !/<\/html>/i.test(h)) return true;
    return false;
  },
  coser(a, b) {
    let x = String(a || '').replace(/\s*```\s*$/, '');
    let y = String(b || '').replace(/^```(?:html|htm|xml)?\s*/i, '').replace(/\s*```\s*$/, '');
    const tail = x.slice(-400);
    if (tail && y.startsWith(tail)) y = y.slice(tail.length);
    else {
      for (let n = Math.min(200, tail.length); n >= 20; n--) {
        if (y.startsWith(tail.slice(-n))) { y = y.slice(n); break; }
      }
    }
    return x + y;
  },

  probarHTML(html, ms = 2500) {
    return new Promise((resolve) => {
      const ifr = document.createElement('iframe');
      const errores = [];
      const url = URL.createObjectURL(new Blob([String(html || '')], { type: 'text/html' }));
      let listo = false;
      const terminar = () => {
        if (listo) return;
        listo = true;
        clearTimeout(tm);
        window.removeEventListener('message', onMsg);
        ifr.remove();
        URL.revokeObjectURL(url);
        resolve({ ok: errores.length === 0, errores });
      };
      const onMsg = (ev) => {
        if (ev.source !== ifr.contentWindow) return;
        if (ev.data && ev.data.t === 'e7err') errores.push(String(ev.data.m || 'error de JS'));
        if (ev.data && ev.data.t === 'e7ok') setTimeout(terminar, 400);
      };
      window.addEventListener('message', onMsg);
      const probe = '<script>(function(){function s(m){m=String(m||"");if(/localStorage|sessionStorage|sandboxed and lacks/i.test(m))return;try{parent.postMessage({t:"e7err",m:m},"*")}catch(e){}}window.addEventListener("error",function(e){s(e.message||e.type)});window.addEventListener("unhandledrejection",function(e){s(e.reason&&e.reason.message?e.reason.message:e.reason)});window.addEventListener("load",function(){parent.postMessage({t:"e7ok"},"*")});})();<\/script>';
      const raw = String(html || '');
      const inyectado = /<\/head>/i.test(raw) ? raw.replace(/<\/head>/i, probe + '</head>') : (probe + raw);
      const url2 = URL.createObjectURL(new Blob([inyectado], { type: 'text/html' }));
      URL.revokeObjectURL(url);
      ifr.setAttribute('sandbox', 'allow-scripts');
      ifr.style.cssText = 'position:fixed;left:-9999px;width:390px;height:844px;opacity:0;pointer-events:none';
      ifr.src = url2;
      document.body.appendChild(ifr);
      const tm = setTimeout(terminar, ms);
    });
  },

  abrirPrevia(html, titulo) {
    const v = document.createElement('div');
    v.className = 'visor previa-full';
    v.innerHTML = '<div class="previa-full-bar"><b></b><button type="button" class="primario" id="cerrarPrev">Cerrar</button></div>';
    v.querySelector('b').textContent = titulo || 'Vista previa';
    const ifr = document.createElement('iframe');
    ifr.title = titulo || 'Vista previa';
    const url = URL.createObjectURL(new Blob([String(html || '')], { type: 'text/html' }));
    ifr.src = url;
    v.appendChild(ifr);
    const cerrar = () => { v.remove(); URL.revokeObjectURL(url); };
    v.querySelector('#cerrarPrev').onclick = cerrar;
    v.addEventListener('click', ev => { if (ev.target === v) cerrar(); });
    document.body.appendChild(v);
    return v;
  },

  async gh(token, path, opts = {}) {
    const r = await fetch('https://api.github.com' + path, {
      ...opts,
      headers: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        ...(opts.headers || {}),
      },
    });
    const raw = await r.text();
    let j = null;
    try { j = raw ? JSON.parse(raw) : null; } catch (e) {}
    if (!r.ok) throw new Error((j && (j.message || j.error)) || ('GitHub HTTP ' + r.status));
    return j;
  },
  utf8B64(s) {
    const u = new TextEncoder().encode(String(s));
    let bin = '';
    for (let i = 0; i < u.length; i++) bin += String.fromCharCode(u[i]);
    return btoa(bin);
  },
  async subirRepo(token, { name, files, message, descripcion }) {
    const me = await this.gh(token, '/user');
    const owner = me.login;
    let repo;
    try { repo = await this.gh(token, '/repos/' + owner + '/' + name); }
    catch (e) {
      repo = await this.gh(token, '/user/repos', {
        method: 'POST',
        body: JSON.stringify({ name, description: descripcion || 'App de Enjambre 7', private: false, auto_init: true }),
      });
    }
    const def = repo.default_branch || 'main';
    let shaBase = null;
    for (let i = 0; i < 10; i++) {
      try {
        const ref = await this.gh(token, '/repos/' + owner + '/' + name + '/git/ref/heads/' + def);
        shaBase = ref.object.sha;
        break;
      } catch (e) { await esperar(700); }
    }
    const items = [];
    const entradas = Object.entries(files);
    for (const [path, content] of entradas) {
      const body = content instanceof Uint8Array
        ? { content: btoa(String.fromCharCode(...content)), encoding: 'base64' }
        : { content: this.utf8B64(content), encoding: 'base64' };
      const blob = await this.gh(token, '/repos/' + owner + '/' + name + '/git/blobs', { method: 'POST', body: JSON.stringify(body) });
      items.push({ path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    const tree = await this.gh(token, '/repos/' + owner + '/' + name + '/git/trees', {
      method: 'POST',
      body: JSON.stringify({ base_tree: shaBase || undefined, tree: items }),
    });
    const commit = await this.gh(token, '/repos/' + owner + '/' + name + '/git/commits', {
      method: 'POST',
      body: JSON.stringify({ message: message || 'Enjambre 7', tree: tree.sha, parents: shaBase ? [shaBase] : [] }),
    });
    if (shaBase) {
      await this.gh(token, '/repos/' + owner + '/' + name + '/git/refs/heads/' + def, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha }) });
    } else {
      await this.gh(token, '/repos/' + owner + '/' + name + '/git/refs', { method: 'POST', body: JSON.stringify({ ref: 'refs/heads/' + def, sha: commit.sha }) });
    }
    return { owner, name, url: repo.html_url || ('https://github.com/' + owner + '/' + name), branch: def };
  },

  async publicarPages(token, { name, files, onEstado }) {
    if (onEstado) onEstado('Subiendo archivos…');
    const repo = await this.subirRepo(token, {
      name, files, message: 'Sitio de Enjambre 7', descripcion: 'Sitio publicado desde Enjambre 7',
    });
    if (onEstado) onEstado('Activando GitHub Pages…');
    try {
      await this.gh(token, '/repos/' + repo.owner + '/' + repo.name + '/pages', {
        method: 'POST',
        body: JSON.stringify({ source: { branch: repo.branch || 'main', path: '/' } }),
      });
    } catch (e) {
      if (!/already|409|exists/i.test(e.message || '')) {
        /* Pages a veces tarda en aceptar el POST; el sitio igual quedará en github.io si está activo */
      }
    }
    const url = 'https://' + repo.owner + '.github.io/' + repo.name + '/';
    return { ...repo, pages: url };
  },

  async plantillaApk({ applicationId, appName, assets }) {
    const listR = await fetch('apk-shell/files.json', { cache: 'no-store' });
    if (!listR.ok) throw new Error('No encontré la cáscara Android (apk-shell)');
    const list = await listR.json();
    const files = {};
    for (const rel of (list.files || [])) {
      const r = await fetch('apk-shell/' + rel, { cache: 'no-store' });
      if (!r.ok) throw new Error('Falta apk-shell/' + rel);
      let t = await r.text();
      t = t.replaceAll('__APPLICATION_ID__', applicationId).replaceAll('__APP_NAME__', appName);
      files[rel] = t;
    }
    for (const [nom, contenido] of Object.entries(assets || {})) {
      files['app/src/main/assets/' + nom] = contenido;
    }
    return files;
  },

  async publicarAPK(token, { html, nombre, onEstado, name }) {
    const pack = await this.empaquetarPWA(html, { nombre });
    const repoName = name || ('enjambre-apk-' + pack.slug);
    const appId = this.applicationId(pack.slug);
    if (onEstado) onEstado('Armando la cáscara Android…');
    const files = await this.plantillaApk({
      applicationId: appId,
      appName: pack.nombre.replace(/[^\wÁÉÍÓÚáéíóúñÑ ]+/g, '').slice(0, 30) || 'Enjambre',
      assets: pack.files,
    });
    if (onEstado) onEstado('Subiendo el repo…');
    const repo = await this.subirRepo(token, {
      name: repoName,
      files,
      message: 'App de Enjambre 7 lista para APK',
      descripcion: 'APK de Enjambre 7: ' + pack.nombre,
    });
    if (onEstado) onEstado('Compilando APK en GitHub Actions… esto tarda varios minutos.');
    const t0 = Date.now();
    let apk = '';
    let run = null;
    const tope = Date.now() + 20 * 60 * 1000;
    while (Date.now() < tope) {
      await esperar(8000);
      const runs = await this.gh(token, '/repos/' + repo.owner + '/' + repo.name + '/actions/runs?per_page=5');
      const lista = (runs.workflow_runs || []);
      run = lista.find(x => x.head_branch === repo.branch || x.event === 'push' || x.event === 'workflow_dispatch') || lista[0];
      if (run) {
        const min = Math.round((Date.now() - t0) / 1000);
        if (onEstado) onEstado('Actions: ' + (run.status || '') + (run.conclusion ? ' · ' + run.conclusion : '') + ' · ' + min + 's');
        if (run.status === 'completed') {
          if (run.conclusion !== 'success') throw new Error('El flujo de APK falló (' + run.conclusion + '). Mira ' + run.html_url);
          break;
        }
      } else if (onEstado) onEstado('Esperando a que arranque Actions…');
    }
    if (!run || run.status !== 'completed') throw new Error('Se acabó el tiempo de espera del APK. Revisa el repo: ' + repo.url);
    const rels = await this.gh(token, '/repos/' + repo.owner + '/' + repo.name + '/releases?per_page=3');
    const rel = (rels || [])[0];
    const asset = (rel && rel.assets || []).find(a => /\.apk$/i.test(a.name)) || (rel && rel.assets && rel.assets[0]);
    apk = (asset && (asset.browser_download_url || asset.url)) || (rel && rel.html_url) || '';
    if (!apk) throw new Error('El flujo terminó pero no vi el APK en Releases. Repo: ' + repo.url);
    return { ...repo, apk, release: rel && rel.html_url, run: run.html_url, ms: Date.now() - t0 };
  },
};

window.Builder = Builder;
