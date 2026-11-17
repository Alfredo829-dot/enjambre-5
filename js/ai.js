const ROLES = {
  percepcion: {
    id: 'percepcion',
    nombre: 'Percepción',
    corto: 'Entiende y normaliza el pedido',
    inicial: 'Pe',
    mention: ['percepción', 'percepcion', 'perception'],
    modeloPref: 'openai/gpt-oss-20b',
    respaldo: 'openai/gpt-oss-120b',
    keyPref: ['groq', 'groq8', 'groq2', 'groq3', 'groq4', 'groq5', 'groq6', 'groq7'],
    razonamiento: 'low',
    color: '#22d3ee',
    fw: 223,
    col: 'img/col-percepcion.webp',
    av: 'img/av-percepcion.webp',
  },
  razonamiento: {
    id: 'razonamiento',
    nombre: 'Razonamiento', nombreCorto: 'Razón',
    corto: 'Arma el plan y la confianza',
    inicial: 'Ra',
    mention: ['razonamiento', 'razón', 'razon', 'estratega', 'strategist', 'arquitecto', 'architect'],
    modeloPref: 'openai/gpt-oss-120b',
    respaldo: 'openai/gpt-oss-20b',
    keyPref: ['groq2', 'groq8', 'groq3', 'groq4', 'groq5', 'groq6', 'groq7', 'groq'],
    razonamiento: 'low',
    color: '#8b5cf6',
    fw: 145,
    col: 'img/col-razonamiento.webp',
    av: 'img/av-razonamiento.webp',
  },
  supervision: {
    id: 'supervision',
    nombre: 'Supervisión',
    corto: 'Valida o bloquea el plan',
    inicial: 'Su',
    mention: ['supervisión', 'supervision', 'supervisor'],
    modeloPref: 'openai/gpt-oss-20b',
    respaldo: 'openai/gpt-oss-120b',
    keyPref: ['groq3', 'groq8', 'groq4', 'groq5', 'groq6', 'groq7', 'groq', 'groq2'],
    razonamiento: 'low',
    color: '#eab308',
    fw: 173,
    col: 'img/col-supervision.webp',
    av: 'img/av-supervision.webp',
  },
  accion: {
    id: 'accion',
    nombre: 'Acción',
    corto: 'Produce el entregable',
    inicial: 'Ac',
    mention: ['acción', 'accion', 'action', 'ejecutor', 'executor'],
    modeloPref: 'qwen/qwen3.8-27b',
    respaldo: 'openai/gpt-oss-20b',
    keyPref: ['groq4', 'groq8', 'groq5', 'groq6', 'groq7', 'groq', 'groq2', 'groq3'],
    razonamiento: null,
    color: '#22c55e',
    fw: 207,
    col: 'img/col-accion.webp',
    av: 'img/av-accion.webp',
  },
  feedback: {
    id: 'feedback',
    nombre: 'Feedback',
    corto: 'Puntúa y pide correcciones',
    inicial: 'Fb',
    mention: ['feedback', 'crítico', 'critico', 'analista', 'qa', 'critic'],
    modeloPref: 'openai/gpt-oss-120b',
    respaldo: 'openai/gpt-oss-20b',
    keyPref: ['groq5', 'groq8', 'groq6', 'groq7', 'groq', 'groq2', 'groq3', 'groq4'],
    razonamiento: 'low',
    color: '#f97316',
    fw: 169,
    col: 'img/col-feedback.webp',
    av: 'img/av-feedback.webp',
  },
  adaptacion: {
    id: 'adaptacion',
    nombre: 'Adaptación',
    corto: 'Pule y corrige el desvío',
    inicial: 'Ad',
    mention: ['adaptación', 'adaptacion', 'expansor', 'creativo'],
    modeloPref: 'allam-2-7b',
    respaldo: 'openai/gpt-oss-20b',
    keyPref: ['groq6', 'groq8', 'groq7', 'groq', 'groq2', 'groq3', 'groq4', 'groq5'],
    razonamiento: null,
    color: '#ec4899',
    fw: 173,
    col: 'img/col-adaptacion.webp',
    av: 'img/av-adaptacion.webp',
  },
  fallos: {
    id: 'fallos',
    nombre: 'Fallos',
    nombreLargo: 'Gestión de Fallos',
    corto: 'Rescata errores y deja el registro',
    inicial: 'Fa',
    mention: ['fallos', 'fallas', 'gestión', 'gestion', 'controlador', 'sincronizador', 'sync'],
    modeloPref: 'openai/gpt-oss-20b',
    respaldo: 'openai/gpt-oss-120b',
    keyPref: ['groq7', 'groq8', 'groq', 'groq2', 'groq3', 'groq4', 'groq5', 'groq6'],
    razonamiento: 'low',
    color: '#f43f5e',
    fw: 172,
    col: 'img/col-fallos.webp',
    av: 'img/av-fallos.webp',
  },
};

const ORDEN_ROLES = ['percepcion', 'razonamiento', 'supervision', 'accion', 'feedback', 'adaptacion', 'fallos'];

const ALIAS_ROL = {
  arquitecto: 'razonamiento', estratega: 'razonamiento',
  ejecutor: 'accion', critico: 'feedback', expansor: 'adaptacion', controlador: 'fallos',
};

const Metricas = {
  agentes: {},
  asegurar(id) {
    id = (ALIAS_ROL[id] || id);
    if (!this.agentes[id]) this.agentes[id] = { llamadas: 0, errores: 0, msTotal: 0, tokens: 0, iteraciones: 0 };
    return this.agentes[id];
  },
  reset() {
    this.agentes = {};
    ORDEN_ROLES.forEach(id => this.asegurar(id));
  },
  rec(id, { ms = 0, error = false, tokens = 0, iter = 0 } = {}) {
    const a = this.asegurar(id);
    a.llamadas += 1;
    if (error) a.errores += 1;
    a.msTotal += Math.max(0, ms || 0);
    a.tokens += Math.max(0, tokens || 0);
    if (iter) a.iteraciones += iter;
  },
  iterar(id, n = 1) { this.asegurar(id).iteraciones += n; },
  fila(id) {
    const a = this.asegurar(id);
    return {
      id,
      llamadas: a.llamadas,
      errores: a.errores,
      latencia: a.llamadas ? Math.round(a.msTotal / a.llamadas) : 0,
      tokens: a.tokens,
      iteraciones: a.iteraciones,
    };
  },
  filas() { return ORDEN_ROLES.map(id => this.fila(id)); },
  csv() {
    const lines = ['agente,nombre,llamadas,errores,latencia_promedio_ms,tokens,iteraciones_analisis'];
    this.filas().forEach(f => {
      const nom = (ROLES[f.id] || {}).nombre || f.id;
      lines.push([f.id, nom, f.llamadas, f.errores, f.latencia, f.tokens, f.iteraciones].join(','));
    });
    return lines.join('\n') + '\n';
  },
};

const FallosLog = {
  items: [],
  registrar(ev) {
    const item = {
      when: Date.now(),
      rol: ev.rol || '',
      tipo: ev.tipo || 'error',
      detalle: String(ev.detalle || ev.message || '').slice(0, 400),
      accion: ev.accion || '',
    };
    this.items.push(item);
    if (this.items.length > 80) this.items = this.items.slice(-80);
    try { document.dispatchEvent(new CustomEvent('e5-fallos', { detail: item })); } catch (e) {}
    return item;
  },
  reset() { this.items = []; try { document.dispatchEvent(new Event('e5-fallos')); } catch (e) {} },
};

function senalConTimeout(signal, ms) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort('timeout'), ms);
  if (signal) {
    if (signal.aborted) c.abort();
    else signal.addEventListener('abort', () => c.abort(), { once: true });
  }
  return { signal: c.signal, cleanup: () => clearTimeout(t) };
}

const AI = {
  claves() { try { return JSON.parse(localStorage.getItem('e5_claves') || '{}'); } catch (e) { return {}; } },
  guardarClaves(o) { localStorage.setItem('e5_claves', JSON.stringify(o)); },
  pausa: {},
  modelosOk: null,
  modeloDe: {},
  estado: {},
  timeoutMs: 16000,
  timeoutRespaldoMs: 12000,
  timeoutPollMs: 10000,
  timeoutPuenteMs: 20000,
  timeoutPuentePingMs: 2500,
  puenteUrl: '',
  puenteVivo: false,
  puenteHasta: 0,


  idsGroq() {
    const k = this.claves();
    return ['groq', 'groq2', 'groq3', 'groq4', 'groq5', 'groq6', 'groq7', 'groq8'].filter(id => !!k[id]);
  },

  nLlaves() {
    return this.idsGroq().length;
  },

  async _json(url, opts, signal) {
    const r = await fetch(url, { ...opts, signal });
    let t = '';
    try { t = await r.text(); } catch (e) {}
    if (!r.ok) {
      const err = new Error('HTTP ' + r.status + ' ' + t.slice(0, 220));
      err.status = r.status;
      err.body = t.slice(0, 500);
      const ra = r.headers.get('retry-after');
      if (ra) err.retryAfter = ra;
      throw err;
    }
    try { return t ? JSON.parse(t) : {}; } catch (e) { throw new Error('Respuesta no JSON'); }
  },

  _esOss(modelo) { return /gpt-oss/i.test(String(modelo || '')); },

  _limpia(j) {
    const msg = (j.choices && j.choices[0] && j.choices[0].message) || {};
    let c = msg.content;
    if (Array.isArray(c)) c = c.map(x => x.text || x.content || '').join('');
    c = String(c || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    return c;
  },

  _limpiaTexto(c) {
    return String(c || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  },

  _msReintento(e, base) {
    if (e && e.retryAfter && /^\d+$/.test(e.retryAfter)) return (Number(e.retryAfter) + 1) * 1000;
    const m = /retry(?:\s*after)?[^\d]*(\d+)/i.exec((e && (e.body || e.message)) || '');
    if (m) return (Number(m[1]) + 1) * 1000;
    return base;
  },

  _tokens(j) {
    const u = (j && j.usage) || {};
    return Number(u.total_tokens || 0) || (Number(u.prompt_tokens || 0) + Number(u.completion_tokens || 0));
  },

  modeloDisponible(mod) {
    if (!mod) return false;
    if (!this.modelosOk) return !/^llama-3\.1-8b-instant$/i.test(mod);
    return this.modelosOk.has(mod);
  },

  cadenaModelos(meta, forzar) {
    const out = [];
    const add = (m) => { if (m && !out.includes(m) && this.modeloDisponible(m)) out.push(m); };
    add(forzar);
    add(this.modeloDe[meta.id]);
    add(meta.modeloPref);
    add(meta.respaldo);
    add('openai/gpt-oss-20b');
    add('qwen/qwen3.8-27b');
    add('llama-3.1-8b-instant');
    return out;
  },

  async _leerSse(resp, { signal, onDelta }) {
    const reader = resp.body.getReader();
    const dec = new TextDecoder();
    let buf = '', texto = '', tokens = 0, ttft = null;
    const t0 = Date.now();
    const aplicar = (j) => {
      const d = (j.choices && j.choices[0] && j.choices[0].delta) || {};
      const pieza = typeof d.content === 'string' ? d.content
        : Array.isArray(d.content) ? d.content.map(x => x.text || x.content || '').join('') : '';
      if (pieza) {
        if (ttft == null) ttft = Date.now() - t0;
        texto += pieza;
        if (onDelta) onDelta({ texto, pieza, ttft });
      }
      if (j.usage) tokens = this._tokens(j);
    };
    while (true) {
      if (signal && signal.aborted) {
        try { await reader.cancel(); } catch (e) {}
        const te = new Error('tiempo agotado');
        te.timeout = true;
        throw te;
      }
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lineas = buf.split('\n');
      buf = lineas.pop();
      for (const line of lineas) {
        const s = line.trim();
        if (!s.startsWith('data:')) continue;
        const payload = s.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try { aplicar(JSON.parse(payload)); } catch (e) {}
      }
    }
    if (buf.trim().startsWith('data:')) {
      const payload = buf.trim().slice(5).trim();
      if (payload && payload !== '[DONE]') {
        try { aplicar(JSON.parse(payload)); } catch (e) {}
      }
    }
    texto = this._limpiaTexto(texto);
    if (!texto) {
      const err = new Error('Respuesta vacía');
      err.vacia = true;
      throw err;
    }
    return { texto, tokens, ttft: ttft == null ? Date.now() - t0 : ttft };
  },

  async _groq({ key, modelo, mensajes, maxTokens, temp, signal, razonamiento, onDelta }) {
    const body = { model: modelo, messages: mensajes, temperature: temp ?? 0.3, stream: true };
    if (maxTokens) body.max_tokens = maxTokens;
    if (this._esOss(modelo)) {
      body.reasoning_effort = razonamiento || 'low';
      body.include_reasoning = false;
    }
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key, 'User-Agent': 'Mozilla/5.0' },
      body: JSON.stringify(body),
      signal,
    });
    if (!r.ok) {
      let t = '';
      try { t = await r.text(); } catch (e) {}
      const err = new Error('HTTP ' + r.status + ' ' + t.slice(0, 220));
      err.status = r.status;
      err.body = t.slice(0, 500);
      const ra = r.headers.get('retry-after');
      if (ra) err.retryAfter = ra;
      throw err;
    }
    return this._leerSse(r, { signal, onDelta });
  },

  async _pollinations(mensajes, signal, maxTokens = 800, onDelta) {
    const r = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'openai', messages: mensajes, max_tokens: maxTokens, stream: true }),
      signal,
    });
    if (!r.ok) {
      let t = '';
      try { t = await r.text(); } catch (e) {}
      // some Pollinations paths don't stream; retry once without stream
      if (r.status >= 400) {
        const j = await this._json('https://text.pollinations.ai/openai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'openai', messages: mensajes, max_tokens: maxTokens }),
        }, signal);
        const txt = this._limpia(j);
        if (!txt) throw new Error('Respuesta vacía');
        if (onDelta) onDelta({ texto: txt, pieza: txt });
        return { texto: txt, modelo: 'pollinations', via: 'pollinations', tokens: this._tokens(j) };
      }
      throw new Error('HTTP ' + r.status + ' ' + t.slice(0, 180));
    }
    const ctype = (r.headers.get('content-type') || '').toLowerCase();
    if (ctype.includes('text/event-stream') || ctype.includes('text/plain')) {
      try {
        const out = await this._leerSse(r, { signal, onDelta });
        return { texto: out.texto, modelo: 'pollinations', via: 'pollinations', tokens: out.tokens, ttft: out.ttft };
      } catch (e) {
        if (e.vacia || e.timeout) throw e;
      }
    }
    const raw = await r.text();
    let j;
    try { j = JSON.parse(raw); } catch (e) { throw new Error('Respuesta no JSON'); }
    const txt = this._limpia(j);
    if (!txt) throw new Error('Respuesta vacía');
    if (onDelta) onDelta({ texto: txt, pieza: txt });
    return { texto: txt, modelo: 'pollinations', via: 'pollinations', tokens: this._tokens(j) };
  },

  async descubrirPuente() {
    const candidatos = [];
    if (typeof location !== 'undefined' && (location.hostname === '127.0.0.1' || location.hostname === 'localhost')) {
      candidatos.push({ url: 'http://127.0.0.1:18892', local: true });
    }
    try {
      const r = await fetch('bridge-url.json?t=' + Date.now(), { cache: 'no-store' });
      if (r.ok) {
        const j = await r.json();
        if (j && j.status === 'down') { /* sigue al gist por si acaso */ }
        else if (j && j.url) candidatos.push({ url: String(j.url).replace(/\/$/, '') });
      }
    } catch (e) {}
    try {
      const r = await fetch('bridge-src.txt', { cache: 'no-store' });
      if (r.ok) {
        const src = (await r.text()).trim().split(/\s+/)[0];
        if (src) {
          const g = await fetch(src + (src.includes('?') ? '&' : '?') + 't=' + Date.now(), { cache: 'no-store' });
          if (g.ok) {
            const j = await g.json();
            if (j && j.url && j.status !== 'down') candidatos.push({ url: String(j.url).replace(/\/$/, '') });
          }
        }
      }
    } catch (e) {}
    this.puenteUrl = (candidatos[0] && candidatos[0].url) || '';
    this.puenteVivo = false;
    this.puenteHasta = 0;
    return this.puenteUrl;
  },

  async pingPuente(base) {
    const url = (base || this.puenteUrl || '').replace(/\/$/, '');
    if (!url) return false;
    const env = senalConTimeout(null, this.timeoutPuentePingMs);
    try {
      const r = await fetch(url + '/ping', { signal: env.signal, cache: 'no-store' });
      return r.ok;
    } catch (e) {
      return false;
    } finally {
      env.cleanup();
    }
  },

  async _puente({ dest, mensajes, signal, onDelta, timeout, secret }) {
    if (!secret) throw new Error('falta el secreto del puente (desbloquea con tu PIN)');
    if (!this.puenteUrl) await this.descubrirPuente();
    if (!this.puenteUrl) throw new Error('puente no publicado');
    if (this.puenteHasta < Date.now()) {
      const ok = await this.pingPuente();
      this.puenteVivo = ok;
      this.puenteHasta = Date.now() + (ok ? 30000 : 20000);
      if (!ok) throw new Error('puente no alcanza');
    } else if (!this.puenteVivo) {
      throw new Error('puente no alcanza');
    }
    const env = senalConTimeout(signal, timeout || this.timeoutPuenteMs);
    try {
      const r = await fetch(this.puenteUrl.replace(/\/$/, '') + '/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + secret },
        body: JSON.stringify({ model: dest, messages: mensajes }),
        signal: env.signal,
      });
      const raw = await r.text();
      if (r.status === 401) throw new Error('puente no autorizado');
      if (!r.ok) {
        let msg = 'puente HTTP ' + r.status;
        try { msg = (JSON.parse(raw).error) || msg; } catch (e) {}
        throw new Error(msg);
      }
      const j = JSON.parse(raw);
      const txt = this._limpia(j);
      if (!txt) throw new Error('puente vacío');
      if (onDelta) onDelta({ texto: txt, pieza: txt, ttft: 0 });
      return {
        texto: txt,
        modelo: dest === 'clow' ? 'Clow' : 'Hermes',
        via: dest,
        tokens: this._tokens(j),
        ttft: (j.enjambre && j.enjambre.ms) || undefined,
      };
    } finally {
      env.cleanup();
    }
  },

  async completar({ rol, mensajes, maxTokens = 800, temp = 0.3, signal, modeloForzar, timeout, onDelta }) {
    const meta = typeof rol === 'string' ? (ROLES[rol] || ROLES[ALIAS_ROL[rol]]) : rol;
    if (!meta) throw new Error('Rol desconocido');
    const ids = [...meta.keyPref];
    const k = this.claves();
    const errores = [];
    const modelos = this.cadenaModelos(meta, modeloForzar);
    const t0 = Date.now();
    let tokens = 0;

    if (!modeloForzar && (meta.id === 'accion' || meta.id === 'razonamiento')) {
      const dest = meta.id === 'accion' ? 'clow' : 'hermes';
      try {
        const out = await this._puente({
          dest, mensajes, signal, onDelta,
          timeout: timeout || this.timeoutPuenteMs,
          secret: k.puente,
        });
        if (out && out.texto) {
          out.ms = Date.now() - t0;
          out.rol = meta.id;
          this.estado[dest] = 'ok';
          Metricas.rec(meta.id, { ms: out.ms, tokens: out.tokens || 0, error: false });
          return out;
        }
      } catch (e) {
        if (signal && signal.aborted) throw new Error('cancelado');
        FallosLog.registrar({
          rol: meta.id, tipo: 'puente',
          detalle: (e && e.message) || 'Clow/Hermes no alcanzaron',
          accion: 'respaldo Groq',
        });
      }
    }

    const unIntento = async (mod, keyId, to) => {
      const env = senalConTimeout(signal, to);
      try {
        if (typeof window !== 'undefined' && window.__e5forzar && window.__e5forzar.fallarLlamada) {
          window.__e5forzar.fallarLlamada = false;
          FallosLog.registrar({ rol: meta.id, tipo: 'forzado', detalle: 'Fallo forzado de prueba', accion: 'reintento con otra llave o respaldo' });
          const err = new Error('Fallo forzado de prueba');
          err.status = 599;
          throw err;
        }
        const r = await this._groq({
          key: k[keyId], modelo: mod, mensajes, maxTokens, temp,
          signal: env.signal,
          razonamiento: this._esOss(mod) ? (meta.razonamiento || 'low') : null,
          onDelta,
        });
        this.estado[keyId] = 'ok';
        this.estado[meta.id] = 'ok';
        tokens = r.tokens || 0;
        return { texto: r.texto, modelo: mod, via: keyId, rol: meta.id, tokens, ttft: r.ttft };
      } finally {
        env.cleanup();
      }
    };

    try {
      for (let mi = 0; mi < modelos.length; mi++) {
        const mod = modelos[mi];
        const to = mi === 0 ? (timeout || this.timeoutMs) : this.timeoutRespaldoMs;
        const keysVivas = ids.filter(id => k[id] && !((this.pausa[id] || 0) > Date.now()));
        const keysTodas = ids.filter(id => k[id]);
        const orden = keysVivas.length ? keysVivas.concat(keysTodas.filter(id => !keysVivas.includes(id))) : keysTodas;
        for (const id of orden) {
          if (signal && signal.aborted) throw new Error('cancelado');
          try {
            const out = await unIntento(mod, id, to);
            if (out) {
              out.ms = Date.now() - t0;
              Metricas.rec(meta.id, { ms: out.ms, tokens: out.tokens || tokens, error: false });
              return out;
            }
          } catch (e) {
            if (signal && signal.aborted) throw new Error('cancelado');
            const msg = e.message || '';
            if (e.status === 429 || /HTTP 429|rate limit|too many requests/i.test(msg)) {
              const ms = Math.min(2000, this._msReintento(e, 800));
              this.pausa[id] = Date.now() + ms;
              this.estado[id] = 'prob';
              FallosLog.registrar({ rol: meta.id, tipo: 'rate', detalle: 'Límite de Groq en una llave', accion: 'rotar llave de inmediato' });
              continue;
            }
            if (e.timeout || /tiempo agotado/i.test(msg)) {
              FallosLog.registrar({ rol: meta.id, tipo: 'timeout', detalle: 'Tiempo agotado (' + Math.round(to / 1000) + 's) en ' + mod, accion: 'sigo con otra llave o modelo más rápido' });
              this.estado[id] = 'err';
              errores.push(e);
              break; // don't burn 16s on every key of a hanging model; switch model
            }
            if (e.status === 404 || /model_not_found|does not exist|not available/i.test(msg)) {
              FallosLog.registrar({ rol: meta.id, tipo: 'modelo', detalle: 'Modelo no disponible: ' + mod, accion: 'cambio a respaldo rápido' });
              errores.push(e);
              this.estado[id] = 'err';
              break;
            }
            if (e.vacia || /Respuesta vacía/i.test(msg)) {
              FallosLog.registrar({ rol: meta.id, tipo: 'vacio', detalle: 'El modelo no devolvió texto visible (' + mod + ')', accion: 'reintento con respaldo' });
              errores.push(e);
              this.estado[id] = 'err';
              continue;
            }
            if (e.status === 599 || /Fallo forzado/i.test(msg)) {
              errores.push(e);
              this.estado[id] = 'prob';
              continue;
            }
            this.estado[id] = 'err';
            errores.push(e);
            FallosLog.registrar({ rol: meta.id, tipo: 'error', detalle: msg.slice(0, 220), accion: 'probar otra llave o respaldo' });
          }
        }
        const waits = ids.map(id => (this.pausa[id] || 0) - Date.now()).filter(x => x > 0);
        if (waits.length && waits.length === ids.filter(id => k[id]).length) {
          await esperar(Math.min(1500, Math.min(...waits) + 50));
        }
      }

      try {
        const envP = senalConTimeout(signal, this.timeoutPollMs);
        try {
          const p = await this._pollinations(mensajes, envP.signal, Math.min(maxTokens, 1200), onDelta);
          this.estado.pollinations = 'ok';
          p.rol = meta.id;
          p.ms = Date.now() - t0;
          FallosLog.registrar({ rol: meta.id, tipo: 'respaldo', detalle: 'Groq no respondió a tiempo', accion: 'Pollinations' });
          Metricas.rec(meta.id, { ms: p.ms, tokens: p.tokens || 0, error: false });
          return p;
        } finally {
          envP.cleanup();
        }
      } catch (e) {
        const last = errores[errores.length - 1] || e;
        Metricas.rec(meta.id, { ms: Date.now() - t0, error: true });
        const msg = (last && last.message) || 'Sin respuesta de las IAs';
        const err = new Error(/tiempo agotado/i.test(msg) ? 'No alcanzaron a responder a tiempo. Revisa la red e inténtalo otra vez.' : msg);
        err.causa = last;
        throw err;
      }
    } finally {
      /* per-attempt controllers already cleaned */
    }
  },

  pareceFlojo(texto, esperadoES = true) {
    const t = String(texto || '').trim();
    if (/^\s*\{/.test(t) && t.length >= 15) return false;
    if (t.length < 24) return true;
    if (esperadoES && /[\u0600-\u06FF]/.test(t) && (t.match(/[\u0600-\u06FF]/g) || []).length > 20 && !/[áéíóúñ¿¡]/i.test(t)) return true;
    return false;
  },

  async completarConRespaldo(opts) {
    const out = await this.completar(opts);
    const meta = ROLES[opts.rol] || ROLES[ALIAS_ROL[opts.rol]] || opts.rol;
    if (meta && meta.respaldo && out.modelo === meta.modeloPref && this.pareceFlojo(out.texto)) {
      try {
        const b = await this.completar({ ...opts, modeloForzar: meta.respaldo, timeout: this.timeoutRespaldoMs });
        if (b && b.texto && b.texto.length >= (out.texto || '').length) return b;
      } catch (e) {}
    }
    return out;
  },

  async verificarModelos(signal) {
    const k = this.claves();
    const id = this.idsGroq().find(x => !((this.pausa[x] || 0) > Date.now())) || this.idsGroq()[0];
    if (!id) return;
    try {
      const j = await this._json('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: 'Bearer ' + k[id], 'User-Agent': 'Mozilla/5.0' },
      }, signal);
      const ids = new Set((j.data || []).map(m => m.id));
      this.modelosOk = ids;
      for (const rol of Object.values(ROLES)) {
        this.modeloDe[rol.id] = ids.has(rol.modeloPref) ? rol.modeloPref : (ids.has(rol.respaldo) ? rol.respaldo : 'openai/gpt-oss-20b');
      }
    } catch (e) {
      for (const rol of Object.values(ROLES)) this.modeloDe[rol.id] = rol.modeloPref;
    }
  },

  async probar() {
    const out = await this.completar({
      rol: 'fallos',
      mensajes: [
        { role: 'system', content: 'Responde exactamente: ok' },
        { role: 'user', content: 'ping' },
      ],
      maxTokens: 16,
      temp: 0,
    });
    return resumir(out.texto, 80);
  },
};


window.ROLES = ROLES;
window.ORDEN_ROLES = ORDEN_ROLES;
window.ALIAS_ROL = ALIAS_ROL;
window.AI = AI;
window.Metricas = Metricas;
window.FallosLog = FallosLog;
