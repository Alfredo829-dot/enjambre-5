const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

function toast(msg, ms = 2600) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.hidden = true; }, ms);
}

function escaparHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function esperar(ms) { return new Promise(r => setTimeout(r, ms)); }

function descargar(data, nombre, tipo = 'text/plain;charset=utf-8') {
  const blob = data instanceof Blob ? data : new Blob([data], { type: tipo });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

async function copiar(texto) {
  try { await navigator.clipboard.writeText(texto); toast('📋 Copiado'); }
  catch (e) {
    const ta = document.createElement('textarea');
    ta.value = texto; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('📋 Copiado'); } catch (err) { toast('No pude copiar'); }
    ta.remove();
  }
}

function autoAlto(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 140) + 'px';
}

function extraerJSON(t) {
  const s = String(t || '').trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fence ? fence[1] : s;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  const slice = raw.slice(start, end + 1);
  try { return JSON.parse(slice); }
  catch (e) {
    try { return JSON.parse(slice.replace(/,\s*([}\]])/g, '$1')); }
    catch (e2) { return null; }
  }
}

function extraerBloque(t, langs = []) {
  const s = String(t || '');
  if (langs.length) {
    const re = new RegExp('```(?:' + langs.join('|') + ')\\s*\\n([\\s\\S]*?)```', 'i');
    const m = s.match(re);
    return m ? m[1].trim() : null;
  }
  const any = s.match(/```[a-z0-9]*\s*\n([\s\S]*?)```/i);
  return any ? any[1].trim() : null;
}

function pareceHTML(s) {
  const raw = String(s || '');
  const b = extraerBloque(raw, ['html', 'htm', 'xml']);
  if (b && /<(?:!doctype\s+html|html|body|div|main|section|header|form|button|input)\b/i.test(b)) return b.trim();
  const t = raw.trim();
  const doc = t.match(/<!doctype\s+html[\s\S]*$/i) || t.match(/<html[\s>][\s\S]*$/i);
  if (doc) {
    let h = doc[0].trim();
    const close = h.match(/([\s\S]*<\/html>)\s*[\s\S]*/i);
    if (close) h = close[1].trim();
    return h;
  }
  return null;
}

function envolverHTML(frag) {
  let t = String(frag || '').trim();
  if (/<!doctype html|<html[\s>]/i.test(t)) return t;
  return `<!doctype html><html lang="es-MX"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Enjambre 7</title><style>body{font-family:system-ui,sans-serif;margin:16px;background:#111;color:#eee}</style></head><body>${t}</body></html>`;
}

function entregaDe(plan, orden) {
  const raw = String((plan && (plan.entrega || plan.tipo)) || '').toLowerCase().trim();
  let e = raw;
  if (['htm', 'web', 'webpage', 'pagina', 'página', 'app', 'sitio'].includes(e)) e = 'html';
  if (e === 'py') e = 'python';
  if (e === 'plan' || e === 'prompt' || e === 'copy' || e === 'otro') e = 'texto';
  if (e !== 'html' && e !== 'python' && e !== 'texto') e = 'texto';
  const o = String(orden || '');
  const pideApp = /\b(html|css|app web|página web|pagina web|sitio web|web app|aplicación web|aplicacion web|interfaz|localStorage)\b/i.test(o);
  const pidePy = /\b(python|\.py\b|script de python)\b/i.test(o);
  const pideTexto = /\b(haiku|poema|poesía|poesia|copy\b|eslogan|slogan|lista de|nombres para|prompt\b|plan de|guion|guión|mensaje[s]? listo|carta\b)\b/i.test(o);
  if (pideTexto && !pideApp && !pidePy) return 'texto';
  if (e === 'html' || e === 'python') return e;
  if (pideApp) return 'html';
  if (pidePy) return 'python';
  return e;
}

function reglasEntrega(entrega) {
  if (entrega === 'html') {
    return 'FORMATO OBLIGATORIO: app o página web. Entrega un HTML completo, autónomo, móvil, en un bloque ```html. CSS incluido. Sin librerías de pago.';
  }
  if (entrega === 'python') {
    return 'FORMATO OBLIGATORIO: un script de Python completo en un bloque ```python, solo con la biblioteca estándar.';
  }
  return 'FORMATO OBLIGATORIO: texto plano (se permite markdown). NUNCA lo envuelvas en HTML, CSS ni en una página o app. NUNCA agregues <!doctype>, <html>, <style> ni una interfaz. Entrega solo el texto pedido, listo para copiar.';
}

function extraerTextoDeHTML(html) {
  const raw = String(html || '');
  try {
    const doc = new DOMParser().parseFromString(raw, 'text/html');
    const pref = doc.querySelector('pre, blockquote, [data-poema], .haiku, .poema, .texto, article');
    let t = pref ? pref.textContent : ((doc.body && doc.body.innerText) || '');
    t = String(t || '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    if (t.length >= 8) return t;
  } catch (e) {}
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function forzarTextoPlano(texto) {
  let s = String(texto || '').trim();
  if (!s) return s;
  const fencedHtml = extraerBloque(s, ['html', 'htm', 'xml']);
  if (fencedHtml && /<\/?[a-z][\s\S]*>/i.test(fencedHtml)) {
    const extra = extraerTextoDeHTML(fencedHtml);
    if (extra.length >= 8) return extra;
  }
  const html = pareceHTML(s);
  if (html) {
    const extra = extraerTextoDeHTML(html);
    if (extra.length >= 8) return extra;
  }
  // Quita una cerca de markdown genérica si envuelve TODO el texto (poema o lista).
  const onlyFence = s.match(/^```[a-z0-9]*\s*\n([\s\S]*?)\n```$/i);
  if (onlyFence) s = onlyFence[1].trim();
  return s;
}

function extraerArtefacto(texto, entrega) {
  const e = String(entrega || '').toLowerCase();
  if (e === 'texto' || e === 'plan' || e === 'prompt' || e === 'copy') {
    const plano = forzarTextoPlano(texto);
    return { tipo: 'texto', contenido: plano, texto: plano };
  }
  if (e === 'python') {
    const py = extraerBloque(texto, ['python', 'py']);
    return { tipo: 'python', contenido: py || String(texto || '').trim(), texto };
  }
  if (e === 'html') {
    const html = pareceHTML(texto);
    if (html) return { tipo: 'html', contenido: envolverHTML(html), texto };
    return { tipo: 'html', contenido: envolverHTML(String(texto || '').trim()), texto };
  }
  const html = pareceHTML(texto);
  if (html) return { tipo: 'html', contenido: envolverHTML(html), texto };
  const py = extraerBloque(texto, ['python', 'py']);
  if (py) return { tipo: 'python', contenido: py, texto };
  const js = extraerBloque(texto, ['javascript', 'js']);
  if (js && js.length > 40) return { tipo: 'js', contenido: js, texto };
  return { tipo: 'texto', contenido: String(texto || '').trim(), texto };
}

function resumir(t, n = 140) {
  const s = String(t || '').replace(/\s+/g, ' ').trim();
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}

function ahoraCorto(ts) {
  try {
    return new Date(ts).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });
  } catch (e) { return ''; }
}

function pintarMenciones(texto) {
  return escaparHTML(texto).replace(/@([A-Za-zÁÉÍÓÚáéíóúüÜñÑ]+)/g, '<span class="menc">@$1</span>');
}


function rolDe(id) {
  if (typeof ALIAS_ROL !== 'undefined' && ALIAS_ROL[id]) id = ALIAS_ROL[id];
  if (id === 'arquitecto' || id === 'estratega') id = 'razonamiento';
  return (typeof ROLES !== 'undefined' && ROLES[id]) ? ROLES[id] : { id: id || '?', nombre: id || '?', inicial: '?', corto: '', color: '#888' };
}

function avHTML(rol, extraCls) {
  const extra = extraCls ? ' ' + extraCls : '';
  if (rol === 'alfredo') {
    return '<span class="av av-alfredo' + extra + '">Al</span>';
  }
  const r = rolDe(rol);
  const cls = ('av av-' + r.id + extra).trim();
  if (r.av) return '<span class="' + cls + '" style="--c:' + r.color + '"><img src="' + r.av + '" alt=""></span>';
  return '<span class="' + cls + '" style="--c:' + r.color + '">' + escaparHTML(r.inicial || '?') + '</span>';
}

function modeloCorto(rol, modelo, via) {
  const v = String(via || '').toLowerCase();
  if (v === 'clow') return 'Clow';
  if (v === 'hermes') return 'Hermes';
  const id = (rolDe(rol).id || rol);
  if ((id === 'accion' || id === 'razonamiento') && (v.startsWith('groq') || v === 'pollinations')) {
    return v === 'pollinations' ? 'Pollinations (respaldo)' : 'Groq (respaldo)';
  }
  const r = rolDe(rol);
  const m = modelo || ((typeof AI !== 'undefined' && AI.modeloDe && AI.modeloDe[r.id]) || r.modeloPref || '');
  return String(m).split('/').pop();
}

window.Util = { toast, escaparHTML, uid, esperar, descargar, copiar, autoAlto, extraerJSON, extraerBloque, pareceHTML, envolverHTML, extraerArtefacto, entregaDe, reglasEntrega, extraerTextoDeHTML, forzarTextoPlano, resumir, ahoraCorto, pintarMenciones, rolDe, avHTML, modeloCorto };
