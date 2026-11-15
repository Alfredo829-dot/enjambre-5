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
    if (this.hay && localStorage.getItem('e5_llaves') !== '1' && localStorage.getItem('e5_llaves_omitir') !== '1') {
      this.pedir(false);
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
    (j.groq || []).forEach((g, i) => {
      const id = ['groq', 'groq2', 'groq3'][i];
      if (id && g && !k[id]) k[id] = g;
    });
    AI.guardarClaves(k);
    localStorage.setItem('e5_llaves', '1');
    return (j.groq || []).length;
  },
  pedir(desdeAjustes) {
    if ($('#pinModal')) return;
    const m = document.createElement('div');
    m.className = 'visor centrado';
    m.id = 'pinModal';
    m.innerHTML = `<div class="visor-caja panel"><div class="titulo">🔑 Escribe tu PIN</div>
      <p class="hint">Con tu PIN de 6 números activas tus llaves de Groq en este teléfono. Es el mismo de Craft Web. Solo te lo pido una vez.</p>
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
        m.remove();
        toast(`🔓 Listo: ${n} llaves de Groq activadas`);
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
      m.remove();
      if (!desdeAjustes) toast('Puedes activarlas después en ⚙ Ajustes');
    };
    setTimeout(() => $('#pinInput') && $('#pinInput').focus(), 80);
  },
};
