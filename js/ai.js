const ROLES = {
  estratega: {
    id: 'estratega',
    nombre: 'Estratega',
    corto: 'Elige el camino más corto',
    inicial: 'Es',
    mention: ['estratega', 'strategist', 'arquitecto', 'architect'],
    modeloPref: 'openai/gpt-oss-120b',
    respaldo: 'openai/gpt-oss-20b',
    keyPref: ['groq', 'groq3', 'groq2'],
    razonamiento: 'low',
    color: '#8b5cf6',
    fw: 288,
    col: 'img/col-estratega.webp',
    av: 'img/av-estratega.webp',
  },
  ejecutor: {
    id: 'ejecutor',
    nombre: 'Ejecutor',
    corto: 'Hace el trabajo, listo para usar',
    inicial: 'Ej',
    mention: ['ejecutor', 'executor'],
    modeloPref: 'qwen/qwen3.8-27b',
    respaldo: 'openai/gpt-oss-20b',
    keyPref: ['groq2', 'groq', 'groq3'],
    razonamiento: 'none',
    color: '#22c55e',
    fw: 232,
    col: 'img/col-ejecutor.webp',
    av: 'img/av-ejecutor.webp',
  },
  critico: {
    id: 'critico',
    nombre: 'Crítico',
    corto: 'Caza fallos y no suaviza',
    inicial: 'Cr',
    mention: ['crítico', 'critico', 'analista', 'qa', 'critic'],
    modeloPref: 'openai/gpt-oss-120b',
    respaldo: 'openai/gpt-oss-20b',
    keyPref: ['groq3', 'groq', 'groq2'],
    razonamiento: 'low',
    color: '#f97316',
    fw: 237,
    col: 'img/col-critico.webp',
    av: 'img/av-critico.webp',
  },
  expansor: {
    id: 'expansor',
    nombre: 'Expansor',
    corto: 'Pule y añade extras útiles',
    inicial: 'Ex',
    mention: ['expansor', 'creativo'],
    modeloPref: 'allam-2-7b',
    respaldo: 'openai/gpt-oss-20b',
    keyPref: ['groq', 'groq2', 'groq3'],
    razonamiento: null,
    color: '#ec4899',
    fw: 220,
    col: 'img/col-expansor.webp',
    av: 'img/av-expansor.webp',
  },
  controlador: {
    id: 'controlador',
    nombre: 'Controlador',
    corto: 'Coordina y te entrega el resultado',
    inicial: 'Co',
    mention: ['controlador', 'sincronizador', 'sync'],
    modeloPref: 'openai/gpt-oss-20b',
    respaldo: 'openai/gpt-oss-120b',
    keyPref: ['groq2', 'groq3', 'groq'],
    razonamiento: 'low',
    color: '#38bdf8',
    fw: 217,
    col: 'img/col-controlador.webp',
    av: 'img/av-controlador.webp',
  },
};

const ORDEN_ROLES = ['estratega', 'ejecutor', 'critico', 'expansor', 'controlador'];

const AI = {
  claves() { try { return JSON.parse(localStorage.getItem('e5_claves') || '{}'); } catch (e) { return {}; } },
  guardarClaves(o) { localStorage.setItem('e5_claves', JSON.stringify(o)); },
  pausa: {},
  modelosOk: null,
  modeloDe: {},
  estado: {},

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
    return txt;
  },

  async _pollinations(mensajes, signal, maxTokens = 1200) {
    const j = await this._json('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'openai', messages: mensajes, max_tokens: maxTokens }),
    }, signal);
    const txt = this._limpia(j);
    if (!txt) throw new Error('Respuesta vacía');
    return { texto: txt, modelo: 'pollinations', via: 'pollinations' };
  },

  async completar({ rol, mensajes, maxTokens = 1200, temp = 0.3, signal, modeloForzar }) {
    const meta = typeof rol === 'string' ? ROLES[rol] : rol;
    if (!meta) throw new Error('Rol desconocido');
    let modelo = modeloForzar || this.modeloDe[meta.id] || meta.modeloPref;
    const ids = [...meta.keyPref];
    const k = this.claves();
    const errores = [];
    const intentar = async (mod, razonamiento) => {
      for (let vuelta = 0; vuelta < 4; vuelta++) {
        let algunaPausa = false;
        for (const id of ids) {
          if (!k[id]) continue;
          if ((this.pausa[id] || 0) > Date.now()) { algunaPausa = true; continue; }
          try {
            const texto = await this._groq({
              key: k[id], modelo: mod, mensajes, maxTokens, temp, signal, razonamiento,
            });
            this.estado[id] = 'ok';
            this.estado[meta.id] = 'ok';
            return { texto, modelo: mod, via: id, rol: meta.id };
          } catch (e) {
            if (signal && signal.aborted) throw new Error('cancelado');
            const msg = e.message || '';
            if (/reasoning_effort is not supported/i.test(msg) && razonamiento) {
              return intentar(mod, null);
            }
            if (e.status === 404 || /model_not_found|does not exist|not available/i.test(msg)) {
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
              continue;
            }
            this.estado[id] = 'err';
            errores.push(e);
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
    // Si allam responde muy flojo, el llamador puede pedir respaldo; aquí solo si falló del todo.
    if (out) return out;
    try {
      const p = await this._pollinations(mensajes, signal, Math.min(maxTokens, 2000));
      this.estado.pollinations = 'ok';
      p.rol = meta.id;
      return p;
    } catch (e) {
      const last = errores[errores.length - 1] || e;
      throw new Error(last.message || 'Sin respuesta de las IAs');
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
    const meta = ROLES[opts.rol] || opts.rol;
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
      rol: 'controlador',
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
window.AI = AI;
