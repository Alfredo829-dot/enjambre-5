/* Llaves de Alfredo cifradas (AES-GCM + PBKDF2). En el repo solo está el cifrado. */
const Llaves = {
  hay: false,
  datos: null,
  b64(s) { return Uint8Array.from(atob(s), c => c.charCodeAt(0)); },
  async iniciar() {
    try {
      const r = await fetch('keys.enc.json', { cache: 'no-store' });
      if (r.ok) { this.datos = await r.json(); this.hay = true; }
    } catch (e) {}
    if (this.hay) {
      const k = (typeof AI !== 'undefined' && AI.claves) ? AI.claves() : {};
      const nGroq = (typeof AI !== 'undefined' && AI.nLlaves) ? AI.nLlaves() : 0;
      const faltaPuente = !k.puente;
      const faltaLlaves = nGroq < 12;
      const desbloqueado = localStorage.getItem('e5_llaves') === '1';
      const falta = faltaPuente || faltaLlaves;
      if ((!desbloqueado && localStorage.getItem('e5_llaves_omitir') !== '1') || (desbloqueado && falta && localStorage.getItem('e5_llaves_act_omitir') !== '1')) {
        this.pedir(false, { actualizacion: !!(desbloqueado && falta) });
      }
    }
  },
  async descifrar(pin) {
    const d = this.datos;
    const enc = new TextEncoder();
    const base = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']);
    const clave = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: this.b64(d.salt), iterations: d.iter, hash: 'SHA-256' },
      base,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: this.b64(d.iv) }, clave, this.b64(d.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  },
  aplicar(j) {
    const k = AI.claves();
    const ids = ['groq', 'groq2', 'groq3', 'groq4', 'groq5', 'groq6', 'groq7', 'groq8', 'groq9', 'groq10', 'groq11', 'groq12'];
    ids.forEach(id => { delete k[id]; });
    (j.groq || []).forEach((g, i) => {
      const id = ids[i];
      if (id && g) k[id] = g;
    });
    if (j.puente) k.puente = j.puente;
    AI.guardarClaves(k);
    localStorage.setItem('e5_llaves', '1');
    localStorage.removeItem('e5_puente_omitir');
    localStorage.removeItem('e5_llaves_act_omitir');
    return (j.groq || []).length;
  },
  pedir(desdeAjustes, extra = {}) {
    if ($('#pinModal')) return;
    const m = document.createElement('div');
    m.className = 'visor centrado';
    m.id = 'pinModal';
    m.innerHTML = `<div class="visor-caja panel"><div class="titulo">🔑 Escribe tu PIN</div>
      <p class="hint">${extra.actualizacion ? 'Hay una actualización de llaves: más llaves de Groq y el puente privado a Clow y Hermes. Es el mismo PIN de 6 números de Craft Web.' : 'Con tu PIN de 6 números activas tus llaves de Groq y el puente a Clow/Hermes en este teléfono. Es el mismo de Craft Web. Solo se pide una vez.'}</p>
      <input type="password" id="pinInput" inputmode="numeric" maxlength="6" placeholder="••••••" autocomplete="off" style="font-size:26px;text-align:center;letter-spacing:10px">
      <div class="estado" id="pinEstado"></div>
      <div class="grid2"><button class="primario" id="pinOk" type="button">Desbloquear</button><button id="pinNo" type="button">Ahora no</button></div></div>`;
    document.body.appendChild(m);
    let intentos = 0;
    const ok = async () => {
      const pin = $('#pinInput').value.trim();
      const est = $('#pinEstado');
      if (!/^\d{6}$/.test(pin)) { est.textContent = 'Son 6 números'; est.className = 'estado err'; return; }
      est.textContent = 'Revisando…'; est.className = 'estado'; $('#pinOk').disabled = true;
      try {
        const j = await this.descifrar(pin);
        const n = this.aplicar(j);
        await this.cargarGithub(pin);
        m.remove();
        toast('🔓 Listo: ' + n + ' llaves de Groq' + (j.puente ? ' y puente Clow/Hermes' : ''));
        document.dispatchEvent(new Event('e5-llaves'));
      } catch (e) {
        intentos++;
        $('#pinOk').disabled = false;
        est.textContent = intentos >= 3 ? '❌ PIN incorrecto. Revisa el número que te pasaron.' : '❌ PIN incorrecto, intenta otra vez';
        est.className = 'estado err';
        $('#pinInput').select();
      }
    };
    $('#pinOk').onclick = ok;
    $('#pinInput').onkeydown = e => { if (e.key === 'Enter') ok(); };
    $('#pinInput').oninput = e => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
      if (e.target.value.length === 6) ok();
    };
    $('#pinNo').onclick = () => {
      localStorage.setItem('e5_llaves_omitir', '1');
      if (extra.actualizacion) {
        localStorage.setItem('e5_puente_omitir', '1');
        localStorage.setItem('e5_llaves_act_omitir', '1');
      }
      m.remove();
      if (!desdeAjustes) toast('Puedes activarlas después en ⚙ Ajustes');
    };
    setTimeout(() => $('#pinInput') && $('#pinInput').focus(), 80);
  },

  async cifrarConPin(pin, obj) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const base = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']);
    const clave = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']
    );
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, clave, enc.encode(JSON.stringify(obj)));
    const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
    return { v: 1, alg: 'AES-256-GCM', kdf: 'PBKDF2-SHA256', iter: 250000, salt: b64(salt), iv: b64(iv), ct: b64(ct) };
  },
  async descifrarBlob(pin, d) {
    const enc = new TextEncoder();
    const base = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']);
    const clave = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: this.b64(d.salt), iterations: d.iter, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
    );
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: this.b64(d.iv) }, clave, this.b64(d.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  },
  async cargarGithub(pin) {
    const raw = localStorage.getItem('e5_gh.enc');
    if (!raw) return false;
    try {
      const j = await this.descifrarBlob(pin, JSON.parse(raw));
      if (j && j.github) {
        const k = AI.claves();
        k.github = j.github;
        AI.guardarClaves(k);
        return true;
      }
    } catch (e) {}
    return false;
  },
  async guardarGithub(pin, token) {
    const tok = String(token || '').trim();
    if (!tok) throw new Error('Falta el token');
    const blob = await this.cifrarConPin(pin, { github: tok });
    localStorage.setItem('e5_gh.enc', JSON.stringify(blob));
    const k = AI.claves();
    k.github = tok;
    AI.guardarClaves(k);
  },
  borrarGithub() {
    localStorage.removeItem('e5_gh.enc');
    const k = AI.claves();
    delete k.github;
    AI.guardarClaves(k);
  },
  pedirGithub(alGuardar) {
    if ($('#ghModal')) return;
    const m = document.createElement('div');
    m.className = 'visor centrado';
    m.id = 'ghModal';
    m.innerHTML = `<div class="visor-caja panel"><div class="titulo">Token de GitHub</div>
      <p class="hint">Se guarda cifrado en este teléfono con tu PIN, nunca en el repo. Debe poder crear repos, subir archivos y disparar Actions (alcances <code>repo</code> y <code>workflow</code>). No lo compartas.</p>
      <input type="password" id="ghToken" placeholder="ghp_… o github_pat_…" autocomplete="off" style="width:100%;margin:8px 0">
      <input type="password" id="ghPin" inputmode="numeric" maxlength="6" placeholder="PIN de 6 números" autocomplete="off" style="width:100%;margin:8px 0;letter-spacing:8px;text-align:center">
      <div class="estado" id="ghEstado"></div>
      <div class="grid2"><button class="primario" id="ghOk" type="button">Guardar</button><button id="ghNo" type="button">Cancelar</button></div></div>`;
    document.body.appendChild(m);
    $('#ghNo').onclick = () => m.remove();
    $('#ghOk').onclick = async () => {
      const tok = $('#ghToken').value.trim();
      const pin = $('#ghPin').value.trim();
      const est = $('#ghEstado');
      if (!tok) { est.textContent = 'Pega el token'; est.className = 'estado err'; return; }
      if (!/^\d{6}$/.test(pin)) { est.textContent = 'El PIN son 6 números'; est.className = 'estado err'; return; }
      $('#ghOk').disabled = true;
      est.textContent = 'Cifrando…'; est.className = 'estado';
      try {
        await this.guardarGithub(pin, tok);
        m.remove();
        toast('Token de GitHub guardado en este teléfono');
        if (alGuardar) alGuardar();
        document.dispatchEvent(new Event('e5-llaves'));
      } catch (e) {
        $('#ghOk').disabled = false;
        est.textContent = e.message || 'No se pudo guardar';
        est.className = 'estado err';
      }
    };
    setTimeout(() => $('#ghToken') && $('#ghToken').focus(), 80);
  },

};
