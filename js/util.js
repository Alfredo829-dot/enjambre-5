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
  const t = String(s || '').trim();
  if (/<!doctype html|<html[\s>]/i.test(t)) return t;
  const b = extraerBloque(s, ['html', 'htm', 'xml']);
  if (b && /<(?:html|body|div|main|section|header|form|button|input)\b/i.test(b)) return b;
  return null;
}

function envolverHTML(frag) {
  let t = String(frag || '').trim();
  if (/<!doctype html|<html[\s>]/i.test(t)) return t;
  return `<!doctype html><html lang="es-MX"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Enjambre 5</title><style>body{font-family:system-ui,sans-serif;margin:16px;background:#111;color:#eee}</style></head><body>${t}</body></html>`;
}

function extraerArtefacto(texto) {
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
  if (id === 'arquitecto') id = 'estratega';
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

function modeloCorto(rol) {
  const r = rolDe(rol);
  const m = ((typeof AI !== 'undefined' && AI.modeloDe && AI.modeloDe[r.id]) || r.modeloPref || '');
  return String(m).split('/').pop();
}

window.Util = { toast, escaparHTML, uid, esperar, descargar, copiar, autoAlto, extraerJSON, extraerBloque, pareceHTML, envolverHTML, extraerArtefacto, resumir, ahoraCorto, pintarMenciones, rolDe, avHTML, modeloCorto };
