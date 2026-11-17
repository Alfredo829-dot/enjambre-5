const ROLES = {
  percepcion: {
    id: 'percepcion',
    nombre: 'Percepción',
    corto: 'Entiende y normaliza el pedido',
    inicial: 'Pe',
    mention: ['percepción', 'percepcion', 'perception'],
    modeloPref: 'openai/gpt-oss-20b',
    respaldo: 'openai/gpt-oss-120b',
    keyPref: ['groq', 'groq3', 'groq2'],
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
    keyPref: ['groq2', 'groq', 'groq3'],
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
    keyPref: ['groq3', 'groq', 'groq2'],
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
    keyPref: ['groq2', 'groq3', 'groq'],
    razonamiento: 'none',
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
    keyPref: ['groq', 'groq3', 'groq2'],
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
    keyPref: ['groq3', 'groq2', 'groq'],
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
    keyPref: ['groq3', 'groq', 'groq2'],
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
  timeoutMs: 45000,

  nLlaves() {
    const k = this.claves();
    return ['groq', 'groq2', 'groq3'].filter(id => !!k[id]).length;
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

  _limpia(j) {
    const msg = (j.choices && j.choices[0] && j.choices[0].message) || {};
    let c = msg.content;
    if (Array.isArray(c)) c = c.map(x => x.text || x.content || '').join('');
    c = String(c || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    if (!c && msg.reasoning) c = String(msg.reasoning).trim();
    return c;
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

  async _groq({ key, modelo, mensajes, maxTokens, temp, signal, razonamiento }) {
    const body = { model: modelo, messages: mensajes, temperature: temp ?? 0.3 };
    if (maxTokens) body.max_tokens = maxTokens;
    if (razonamiento) body.reasoning_effort = razonamiento;
    const j = await this._json('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key, 'User-Agent': 'Mozilla/5.0' },
      body: JSON.stringify(body),
    }, signal);
    const txt = this._limpia(j);
    if (!txt) throw new Error('Respuesta vacía');
    return { texto: txt, tokens: this._tokens(j) };
  },

  async _pollinations(mensajes, signal, maxTokens = 1200) {
    const j = await this._json('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'openai', messages: mensajes, max_tokens: maxTokens }),
    }, signal);
    const txt = this._limpia(j);
    if (!txt) throw new Error('Respuesta vacía');
    return { texto: txt, modelo: 'pollinations', via: 'pollinations', tokens: this._tokens(j) };
  },

  async completar({ rol, mensajes, maxTokens = 1200, temp = 0.3, signal, modeloForzar, timeout }) {
    const meta = typeof rol === 'string' ? (ROLES[rol] || ROLES[ALIAS_ROL[rol]]) : rol;
    if (!meta) throw new Error('Rol desconocido');
    let modelo = modeloForzar || this.modeloDe[meta.id] || meta.modeloPref;
    const ids = [...meta.keyPref];
    const k = this.claves();
    const errores = [];
    const to = timeout || this.timeoutMs;
    const env = senalConTimeout(signal, to);
    const t0 = Date.now();
    let tokens = 0;
    try {
      const intentar = async (mod, razonamiento) => {
        for (let vuelta = 0; vuelta < 4; vuelta++) {
          let algunaPausa = false;
          for (const id of ids) {
            if (!k[id]) continue;
            if ((this.pausa[id] || 0) > Date.now()) { algunaPausa = true; continue; }
            try {
              if (typeof window !== 'undefined' && window.__e5forzar && window.__e5forzar.fallarLlamada) {
                window.__e5forzar.fallarLlamada = false;
                FallosLog.registrar({ rol: meta.id, tipo: 'forzado', detalle: 'Fallo forzado de prueba', accion: 'reintento con otra llave o respaldo' });
                const err = new Error('Fallo forzado de prueba');
                err.status = 599;
                throw err;
              }
              const r = await this._groq({
                key: k[id], modelo: mod, mensajes, maxTokens, temp, signal: env.signal, razonamiento,
              });
              this.estado[id] = 'ok';
              this.estado[meta.id] = 'ok';
              tokens = r.tokens || 0;
              return { texto: r.texto, modelo: mod, via: id, rol: meta.id, tokens };
            } catch (e) {
              if (signal && signal.aborted) throw new Error('cancelado');
              if (env.signal.aborted && !(signal && signal.aborted)) {
                const te = new Error('tiempo agotado (' + Math.round(to / 1000) + 's)');
                te.timeout = true;
                FallosLog.registrar({ rol: meta.id, tipo: 'timeout', detalle: te.message, accion: 'reintento o respaldo' });
                errores.push(te);
                this.estado[id] = 'err';
                continue;
              }
              const msg = e.message || '';
              if (/reasoning_effort is not supported/i.test(msg) && razonamiento) {
                return intentar(mod, null);
              }
              if (e.status === 404 || /model_not_found|does not exist|not available/i.test(msg)) {
                FallosLog.registrar({ rol: meta.id, tipo: 'modelo', detalle: 'Modelo no disponible: ' + mod, accion: 'cambio a respaldo' });
                if (mod !== meta.respaldo) return intentar(meta.respaldo, meta.respaldo.includes('gpt-oss') ? 'low' : null);
                errores.push(e);
                this.estado[id] = 'err';
                continue;
              }
              if (e.status === 429 || /HTTP 429|rate limit|too many requests/i.test(msg)) {
                const ms = Math.min(20000, this._msReintento(e, 1200 * (2 ** vuelta)));
                this.pausa[id] = Date.now() + ms;
                this.estado[id] = 'prob';
                algunaPausa = true;
                FallosLog.registrar({ rol: meta.id, tipo: 'rate', detalle: 'Límite de Groq en una llave', accion: 'rotar llave y esperar ' + Math.round(ms / 1000) + 's' });
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
          const wait = waits.length ? Math.min(20000, Math.min(...waits) + 200) : Math.min(20000, 1500 * (2 ** vuelta));
          if (algunaPausa || waits.length) await esperar(wait);
          else if (vuelta < 2) await esperar(800);
          else break;
        }
        return null;
      };

      let out = await intentar(modelo, meta.razonamiento);
      if (!out && modelo !== meta.respaldo) {
        out = await intentar(meta.respaldo, meta.respaldo.includes('gpt-oss') ? 'low' : null);
      }
      if (out) {
        out.ms = Date.now() - t0;
        Metricas.rec(meta.id, { ms: out.ms, tokens: out.tokens || tokens, error: false });
        return out;
      }
      try {
        const p = await this._pollinations(mensajes, env.signal, Math.min(maxTokens, 2000));
        this.estado.pollinations = 'ok';
        p.rol = meta.id;
        p.ms = Date.now() - t0;
        FallosLog.registrar({ rol: meta.id, tipo: 'respaldo', detalle: 'Groq no respondió', accion: 'Pollinations' });
        Metricas.rec(meta.id, { ms: p.ms, tokens: p.tokens || 0, error: false });
        return p;
      } catch (e) {
        const last = errores[errores.length - 1] || e;
        Metricas.rec(meta.id, { ms: Date.now() - t0, error: true });
        throw new Error(last.message || 'Sin respuesta de las IAs');
      }
    } finally {
      env.cleanup();
    }
  },

  pareceFlojo(texto, esperadoES = true) {
    const t = String(texto || '').trim();
    if (t.length < 40) return true;
    if (esperadoES && /[\u0600-\u06FF]/.test(t) && (t.match(/[\u0600-\u06FF]/g) || []).length > 20 && !/[áéíóúñ¿¡]/i.test(t)) return true;
    return false;
  },

  async completarConRespaldo(opts) {
    const out = await this.completar(opts);
    const meta = ROLES[opts.rol] || ROLES[ALIAS_ROL[opts.rol]] || opts.rol;
    if (meta && meta.respaldo && out.modelo === meta.modeloPref && this.pareceFlojo(out.texto)) {
      try {
        const b = await this.completar({ ...opts, modeloForzar: meta.respaldo });
        if (b && b.texto && b.texto.length >= (out.texto || '').length) return b;
      } catch (e) {}
    }
    return out;
  },

  async verificarModelos(signal) {
    const k = this.claves();
    const id = ['groq', 'groq2', 'groq3'].find(x => k[x] && !((this.pausa[x] || 0) > Date.now()));
    if (!id) return;
    try {
      const j = await this._json('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: 'Bearer ' + k[id], 'User-Agent': 'Mozilla/5.0' },
      }, signal);
      const ids = new Set((j.data || []).map(m => m.id));
      this.modelosOk = ids;
      for (const rol of Object.values(ROLES)) {
        this.modeloDe[rol.id] = ids.has(rol.modeloPref) ? rol.modeloPref : rol.respaldo;
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
