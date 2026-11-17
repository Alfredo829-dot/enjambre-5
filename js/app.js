const App = {
  modo: 'encargo',
  ocupado: false,
  ctrl: null,
  encargos: [],
  grupo: [],
  pasosUI: {},
  estadoRol: {},
  adjunto: null,

  cargar() {
    try { this.encargos = JSON.parse(localStorage.getItem('e5_encargos') || '[]'); } catch (e) { this.encargos = []; }
    try { this.grupo = JSON.parse(localStorage.getItem('e5_grupo') || '[]'); } catch (e) { this.grupo = []; }
  },
  guardarEncargos() {
    const recorte = this.encargos.slice(-30).map(e => ({
      id: e.id, when: e.when, orden: e.orden, resultado: e.resultado,
      artefacto: e.artefacto, entrega: e.entrega, score: e.score, bloqueado: e.bloqueado,
      error: e.error, veredictos: e.veredictos,
      rondas: e.rondas, pasos: (e.pasos || []).map(p => ({
        id: p.id, rol: p.rol, estado: p.estado, titulo: p.titulo,
        resumen: p.resumen, detalle: String(p.detalle || '').slice(0, 4000),
        ronda: p.ronda, veredicto: p.veredicto,
      })),
      modelos: e.modelos, contexto: e.contexto || '',
    }));
    localStorage.setItem('e5_encargos', JSON.stringify(recorte));
  },
  guardarGrupo() {
    localStorage.setItem('e5_grupo', JSON.stringify(this.grupo.slice(-200)));
  },

  ir(modo) {
    this.modo = modo;
    document.body.classList.toggle('ajustes', modo === 'ajustes');
    $$('.vista').forEach(v => v.classList.toggle('activo', v.id === 'vista-' + modo));
    $$('.modos button').forEach(b => b.classList.toggle('activo', b.dataset.modo === modo));
    const ph = modo === 'grupo' ? 'Mensaje al grupo…  @todos' : 'Escribe tu encargo…';
    $('#cajaIn').placeholder = ph;
    this.syncMenciones();
    this.syncPromover();
    if (modo !== 'ajustes') localStorage.setItem('e5_modo', modo);
    if (modo === 'ajustes') Ajustes.pintar();
    this.alFinal();
  },

  alFinal() {
    requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
  },

  syncPromover() {
    const btn = $('#btnPromover');
    const show = this.modo === 'grupo' && this.grupo.some(m => m.rol === 'alfredo') && !this.ocupado;
    btn.hidden = !show;
  },
  syncMenciones() {
    const caja = $('#cajaMenciones');
    if (this.modo !== 'grupo') { caja.hidden = true; caja.innerHTML = ''; return; }
    caja.hidden = false;
    const chips = ['todos', ...ORDEN_ROLES];
    caja.innerHTML = chips.map(id => {
      const nom = id === 'todos' ? '@todos' : '@' + ROLES[id].nombre;
      return `<button type="button" data-men="${id}">${nom}</button>`;
    }).join('');
    $$('#cajaMenciones [data-men]').forEach(b => b.onclick = () => this.insertarMencion(b.dataset.men));
  },
  insertarMencion(id) {
    const ta = $('#cajaIn');
    const tag = id === 'todos' ? '@todos ' : '@' + rolDe(id).nombre + ' ';
    const start = ta.selectionStart || ta.value.length;
    ta.value = ta.value.slice(0, start) + tag + ta.value.slice(ta.selectionEnd || start);
    autoAlto(ta);
    ta.focus();
  },

  pintarEquipo() {
    const c = $('#equipoFoto');
    if (!c) return;
    c.innerHTML = ORDEN_ROLES.map(id => {
      const r = ROLES[id];
      const st = this.estadoRol[id] || 'listo';
      const trab = (st === 'pensando' || st === 'escribiendo') ? ' trabajando' : '';
      const stTxt = st === 'pensando' ? 'pensando…' : st === 'escribiendo' ? 'escribiendo…' : '';
      return `<button type="button" class="bot-col${trab}" data-rol="${id}" style="--c:${r.color}" aria-label="${escaparHTML(r.nombre + ', ' + r.corto)}">
        <span class="bot-frame"><img src="${r.col}" alt=""></span>
        <span class="bot-meta">
          <span class="bot-nom">${escaparHTML(r.nombreCorto || r.nombre)}</span>
          <span class="bot-linea"></span>
          <span class="bot-st" data-st="${st}">${escaparHTML(stTxt)}</span>
        </span>
      </button>`;
    }).join('');
    $$('#equipoFoto .bot-col').forEach(b => {
      b.onclick = () => this.tocarBot(b.dataset.rol);
    });
  },
  setEstadoRol(id, st) {
    id = rolDe(id).id;
    if (id && ROLES[id]) this.estadoRol[id] = st;
    const col = id && $(`#equipoFoto .bot-col[data-rol="${id}"]`);
    if (!col) return;
    const on = st === 'pensando' || st === 'escribiendo';
    col.classList.toggle('trabajando', on);
    const el = col.querySelector('.bot-st');
    if (el) {
      el.dataset.st = st;
      el.textContent = st === 'pensando' ? 'pensando…' : st === 'escribiendo' ? 'escribiendo…' : '';
    }
  },
  resetEstados() {
    ORDEN_ROLES.forEach(id => this.setEstadoRol(id, 'listo'));
  },
  tocarBot(id) {
    const r = rolDe(id);
    if (this.modo === 'grupo') this.insertarMencion(id);
    else toast(r.nombre + ' · ' + r.corto);
  },

  pintarEncargos() {
    const lista = $('#encLista');
    const vacio = $('#encVacio');
    const ideas = $('#encIdeas');
    lista.innerHTML = '';
    vacio.hidden = this.encargos.length > 0;
    ideas.hidden = this.encargos.length > 0;
    const cab = $('#encCab');
    if (cab) cab.hidden = this.encargos.length > 0;
    this.encargos.forEach(run => lista.appendChild(this.nodoEncargo(run, false)));
  },

  nodoEncargo(run, vivo) {
    const el = document.createElement('article');
    el.className = 'run';
    el.id = 'run-' + run.id;
    el.appendChild(this._ordenNodo(run));
    const pasos = document.createElement('div');
    pasos.className = 'pasos';
    pasos.id = 'pasos-' + run.id;
    (run.pasos || []).forEach(p => pasos.appendChild(this.nodoPaso(p)));
    el.appendChild(pasos);
    if (run.resultado || run.error || run.bloqueado) el.appendChild(this.nodoResultado(run));
    return el;
  },
  _ordenNodo(run) {
    const d = document.createElement('div');
    d.className = 'run-orden';
    d.innerHTML = `<div class="k">TU ENCARGO · ${escaparHTML(ahoraCorto(run.when) || '')}</div><div class="t">${escaparHTML(run.orden)}</div>`;
    return d;
  },
  nodoPaso(p) {
    const r = rolDe(p.rol);
    const d = document.createElement('details');
    d.className = 'paso ' + (p.estado || '');
    d.dataset.pid = p.id;
    d.innerHTML = `<summary>${avHTML(p.rol, 'av-sm')}<span class="punto"></span><span>${escaparHTML(p.titulo || r.nombre)}</span>${p.resumen ? `<span class="resumen">${escaparHTML(p.resumen)}</span>` : ''}</summary><div class="paso-cuerpo"><pre>${escaparHTML(p.detalle || '…')}</pre></div>`;
    return d;
  },
  actualizarPaso(runId, paso) {
    const cont = $('#pasos-' + runId);
    if (!cont) return;
    let el = cont.querySelector(`[data-pid="${paso.id}"]`);
    const nuevo = this.nodoPaso(paso);
    if (el) el.replaceWith(nuevo);
    else cont.appendChild(nuevo);
  },
  nodoResultado(run) {
    const box = document.createElement('div');
    const bloqueado = !!run.bloqueado;
    box.className = 'resultado' + ((run.error && !run.resultado) || bloqueado ? ' err' : '') + (bloqueado ? ' bloqueado' : '');
    const entrega = run.entrega || (run.artefacto && run.artefacto.tipo) || '';
    const art = run.artefacto && run.artefacto.tipo ? run.artefacto : extraerArtefacto(run.resultado || '', entrega);
    const k = bloqueado ? 'SUPERVISIÓN BLOQUEÓ EL PLAN' : (run.error && !run.resultado ? 'NO SE PUDO COMPLETAR' : 'RESULTADO');
    const esHtml = !bloqueado && art && art.tipo === 'html' && entrega !== 'texto' && art.contenido;
    const texto = bloqueado
      ? (run.error || 'El plan no se aprobó.')
      : (esHtml ? '' : ((art && art.contenido) ? art.contenido : (run.resultado || run.error || '')));
    box.innerHTML = `<div class="k">${k}</div>` + (texto ? `<div class="t">${escaparHTML(texto)}</div>` : '');
    if (esHtml) {
      const prev = document.createElement('div');
      prev.className = 'previa';
      prev.innerHTML = `<div class="previa-tit">Vista previa</div>`;
      const ifr = document.createElement('iframe');
      ifr.setAttribute('sandbox', 'allow-scripts allow-forms');
      ifr.title = 'Vista previa del resultado';
      ifr.srcdoc = art.contenido;
      prev.appendChild(ifr);
      box.appendChild(prev);
    }
    if (bloqueado) return box;
    const bts = document.createElement('div');
    bts.className = 'cm-bts';
    const bCopiar = document.createElement('button');
    bCopiar.type = 'button'; bCopiar.textContent = '📋 Copiar';
    bCopiar.onclick = () => copiar(art && art.contenido ? art.contenido : texto);
    bts.appendChild(bCopiar);
    const bDesc = document.createElement('button');
    bDesc.type = 'button';
    if (art && art.tipo === 'html' && entrega !== 'texto') {
      bDesc.textContent = '⬇ Descargar .html';
      bDesc.onclick = () => descargar(art.contenido, 'enjambre-7.html', 'text/html;charset=utf-8');
    } else if (art && art.tipo === 'python') {
      bDesc.textContent = '⬇ Descargar .py';
      bDesc.onclick = () => descargar(art.contenido, 'enjambre-7.py', 'text/x-python;charset=utf-8');
    } else {
      bDesc.textContent = '⬇ Descargar .txt';
      bDesc.onclick = () => descargar(art && art.contenido ? art.contenido : texto, 'enjambre-7.txt');
    }
    bts.appendChild(bDesc);
    box.appendChild(bts);
    return box;
  },

  pintarGrupo() {
    const lista = $('#grpLista');
    const vacio = $('#grpVacio');
    lista.innerHTML = '';
    vacio.hidden = this.grupo.length > 0;
    const cab = $('#grpCab');
    if (cab) cab.hidden = this.grupo.length > 0;
    this.grupo.forEach(m => lista.appendChild(this.nodoMsg(m)));
    this.syncPromover();
  },
  nodoMsg(m) {
    const el = document.createElement('article');
    const esYo = m.rol === 'alfredo';
    const r = esYo ? null : rolDe(m.rol);
    el.className = 'cm ' + (esYo ? 'yo r-alfredo' : 'r-' + (r.id || m.rol)) + (m.temp ? ' trabajando' : '');
    el.dataset.mid = m.id || '';
    const nom = esYo ? 'Alfredo' : (r && r.nombre) || m.rol;
    const rol = esYo ? 'tú' : ((r && r.corto) || '');
    const badge = (!esYo && !m.temp && (m.modelo || (r && r.modeloPref))) ? `<span class="cm-badge">${escaparHTML(modeloCorto(m.rol))}</span>` : '';
    const cuerpo = m.temp
      ? `<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>pensando…`
      : pintarMenciones(m.texto || '');
    el.innerHTML = `<div class="cm-meta">${avHTML(esYo ? 'alfredo' : m.rol)}<span class="cm-nom">${escaparHTML(nom)}</span><span class="cm-rol">${escaparHTML(rol)}${badge ? '<br>' + badge : ''}</span></div><div class="cm-t">${cuerpo}</div>`;
    return el;
  },

  ideas() {
    const items = [
      'Escribe un haiku en español sobre el café. Solo el haiku, nada más.',
      'App web de una sola página: un botón grande que cuenta clics y muestra el número. Un solo HTML, autónomo, móvil, fondo oscuro.',
      'Plan de marketing de 7 días para una taquería en CDMX que vende por WhatsApp. Con mensajes listos.',
      'Script de Python que cuente palabras, líneas y las 10 palabras más usadas de un texto. Sin librerías externas.',
    ];
    const c = $('#encIdeas');
    c.innerHTML = items.map(() => `<button type="button"></button>`).join('');
    $$('button', c).forEach((b, i) => {
      b.textContent = items[i].split('\n')[0];
      b.onclick = () => { $('#cajaIn').value = items[i]; autoAlto($('#cajaIn')); this.enviar(); };
    });
  },

  asegurarLlaves() {
    if (AI.nLlaves()) return true;
    if (Llaves.hay) { Llaves.pedir(true); toast('Primero desbloquea tus llaves con el PIN'); }
    else toast('No encontré las llaves cifradas');
    return false;
  },

  textoAdjunto() {
    if (!this.adjunto) return '';
    const a = this.adjunto;
    if (a.tipo === 'texto') return 'Archivo de texto adjunto (' + a.nombre + '):\n' + a.texto;
    return 'Imagen adjunta: ' + a.nombre + (a.wh ? ' (' + a.wh + ')' : '') + '. No hay descripción automática (no se usa un modelo de visión en este enjambre). Si el encargo habla de la imagen, úsalo; si no, solo toma nota de que hay una imagen.';
  },
  limpiarAdjunto() {
    this.adjunto = null;
    const n = $('#adjuntoNom');
    if (n) { n.hidden = true; n.textContent = ''; }
    const inp = $('#inAdjunto');
    if (inp) inp.value = '';
  },

  async enviar(ev) {
    if (ev) ev.preventDefault();
    if (this.ocupado) { toast('Espera a que terminen'); return; }
    if (this.modo === 'ajustes') return;
    const ta = $('#cajaIn');
    const texto = ta.value.trim();
    if (!texto && !this.adjunto) return;
    if (!navigator.onLine) { toast('Sin internet, no puedo llamar a las IAs'); return; }
    if (!this.asegurarLlaves()) return;
    ta.value = ''; autoAlto(ta);
    if (this.modo === 'grupo') await this.enviarGrupo(texto || '(adjunto)');
    else await this.enviarEncargo(texto || 'Revisa el adjunto y entrega lo que corresponda.');
  },

  async enviarEncargo(texto, contexto) {
    this.ocupado = true;
    this.ctrl = new AbortController();
    $('#cajaEnviar').disabled = true;
    this.resetEstados();
    const profundo = !!( $('#chkProfundo') && $('#chkProfundo').checked );
    const adjunto = this.textoAdjunto();
    this.limpiarAdjunto();
    const run = {
      id: uid(), when: Date.now(), orden: texto, contexto: contexto || '',
      pasos: [], resultado: '', artefacto: null, error: null, veredictos: [], rondas: 0, modelos: {},
      entrega: '', score: null, bloqueado: false, profundo,
    };
    this.encargos.push(run);
    $('#encVacio').hidden = true;
    $('#encIdeas').hidden = true;
    const cab = $('#encCab');
    if (cab) cab.hidden = true;
    const lista = $('#encLista');
    lista.appendChild(this.nodoEncargo(run, true));
    this.alFinal();
    const mapa = {};
    try {
      const hist = await Swarm.correr(texto, {
        signal: this.ctrl.signal,
        contexto,
        profundo,
        adjunto,
        onPaso: (paso) => {
          const prev = mapa[paso.id];
          mapa[paso.id] = paso;
          if (prev) {
            const i = run.pasos.findIndex(p => p.id === paso.id);
            if (i >= 0) run.pasos[i] = paso;
          } else run.pasos.push(paso);
          this.actualizarPaso(run.id, paso);
          if (paso.estado === 'run') this.setEstadoRol(paso.rol, 'pensando');
          else this.setEstadoRol(paso.rol, 'listo');
          this.alFinal();
        },
      });
      Object.assign(run, {
        resultado: hist.resultado, artefacto: hist.artefacto, entrega: hist.entrega, error: hist.error,
        veredictos: hist.veredictos, rondas: hist.rondas, modelos: hist.modelos, pasos: hist.pasos, ms: hist.ms,
        score: hist.score, bloqueado: hist.bloqueado, profundo: hist.profundo,
      });
      window.__e5ultimoEncargo = {
        id: run.id, rondas: run.rondas,
        veredictos: (run.veredictos || []).map(v => v.pass ? 'PASS' : 'FAIL'),
        scores: (run.veredictos || []).map(v => v.score),
        fallos: run.veredictos, tipo: (run.artefacto || {}).tipo, entrega: run.entrega,
        error: run.error, modelos: run.modelos, tieneResultado: !!run.resultado,
        ms: run.ms, score: run.score, bloqueado: !!run.bloqueado,
        preview: String((run.artefacto && run.artefacto.contenido) || run.resultado || run.error || '').slice(0, 400),
      };
    } catch (e) {
      run.error = e.message || String(e);
      window.__e5ultimoEncargo = { error: run.error };
    }
    this.resetEstados();
    const card = $('#run-' + run.id);
    const viejo = card && card.querySelector('.resultado');
    if (viejo) viejo.remove();
    if (card) card.appendChild(this.nodoResultado(run));
    this.guardarEncargos();
    this.ocupado = false;
    this.ctrl = null;
    $('#cajaEnviar').disabled = false;
    this.syncPromover();
    Ajustes.pintarMetricas();
    this.alFinal();
  },

  async enviarGrupo(texto) {
    this.ocupado = true;
    this.ctrl = new AbortController();
    $('#cajaEnviar').disabled = true;
    this.resetEstados();
    const yo = { id: uid(), when: Date.now(), rol: 'alfredo', texto };
    this.grupo.push(yo);
    $('#grpVacio').hidden = true;
    const cab = $('#grpCab');
    if (cab) cab.hidden = true;
    $('#grpLista').appendChild(this.nodoMsg(yo));
    this.alFinal();
    const temps = {};
    const destinos = Grupo.destinos(texto);
    window.__e5ultimoGrupo = { destinos, respuestas: [] };
    try {
      await Grupo.responder(texto, this.grupo.filter(m => !m.temp), {
        signal: this.ctrl.signal,
        onInicio: (id) => {
          this.setEstadoRol(id, 'pensando');
          const tmp = { id: 'tmp-' + id, rol: id, texto: '', temp: true };
          temps[id] = tmp;
          $('#grpLista').appendChild(this.nodoMsg(tmp));
          this.alFinal();
        },
        onListo: (item) => {
          this.setEstadoRol(item.rol, 'listo');
          const tmp = temps[item.rol];
          if (tmp) {
            const n = $('#grpLista').querySelector(`[data-mid="${tmp.id}"]`);
            if (n) n.remove();
          }
          const msg = { id: uid(), when: Date.now(), rol: item.rol, texto: item.texto, modelo: item.modelo };
          this.grupo.push(msg);
          $('#grpLista').appendChild(this.nodoMsg(msg));
          window.__e5ultimoGrupo.respuestas.push({ rol: item.rol, ok: true, chars: (item.texto || '').length });
          this.guardarGrupo();
          this.alFinal();
        },
        onError: (item) => {
          this.setEstadoRol(item.rol, 'listo');
          const tmp = temps[item.rol];
          if (tmp) {
            const n = $('#grpLista').querySelector(`[data-mid="${tmp.id}"]`);
            if (n) n.remove();
          }
          const msg = { id: uid(), when: Date.now(), rol: item.rol, texto: item.texto, error: true };
          this.grupo.push(msg);
          $('#grpLista').appendChild(this.nodoMsg(msg));
          window.__e5ultimoGrupo.respuestas.push({ rol: item.rol, ok: false });
          this.guardarGrupo();
          this.alFinal();
        },
      });
    } catch (e) {
      toast(e.message || 'Error en el grupo');
    }
    this.resetEstados();
    this.ocupado = false;
    this.ctrl = null;
    $('#cajaEnviar').disabled = false;
    this.syncPromover();
    Ajustes.pintarMetricas();
  },

  async promover() {
    if (this.ocupado) return;
    const { orden, contexto } = Grupo.resumenParaEncargo(this.grupo.filter(m => !m.temp));
    if (!orden) { toast('Aún no hay nada que convertir'); return; }
    this.ir('encargo');
    toast('Lo paso a Encargo…');
    await this.enviarEncargo(orden, contexto);
  },

  nueva() {
    if (this.ocupado) { toast('Espera a que terminen'); return; }
    if (this.modo === 'grupo') {
      if (this.grupo.length) {
        const arch = JSON.parse(localStorage.getItem('e5_grupo_archivos') || '[]');
        arch.push({ when: Date.now(), msgs: this.grupo });
        localStorage.setItem('e5_grupo_archivos', JSON.stringify(arch.slice(-10)));
      }
      this.grupo = [];
      this.guardarGrupo();
      this.pintarGrupo();
      toast('Nueva charla del grupo');
    } else {
      this.pintarEncargos();
      toast('Sigue un encargo nuevo abajo');
      $('#cajaIn').focus();
    }
  },
};

const Ajustes = {
  pintarMetricas() {
    const tb = $('#ajMetricas');
    if (!tb) return;
    const filas = Metricas.filas();
    tb.innerHTML = '<thead><tr><th>Agente</th><th>Llamadas</th><th>Errores</th><th>Latencia</th><th>Tokens</th><th>Análisis</th></tr></thead><tbody>' +
      filas.map(f => `<tr><td>${escaparHTML((ROLES[f.id] || {}).nombre || f.id)}</td><td>${f.llamadas}</td><td>${f.errores}</td><td>${f.latencia ? f.latencia + ' ms' : '—'}</td><td>${f.tokens || '—'}</td><td>${f.iteraciones || '—'}</td></tr>`).join('') +
      '</tbody>';
  },
  pintarFallos() {
    const panel = $('#panelFallos');
    const lista = $('#fallosLista');
    const n = $('#fallosN');
    if (!panel) return;
    const items = FallosLog.items || [];
    n.textContent = items.length;
    panel.hidden = items.length === 0;
    lista.innerHTML = items.slice().reverse().map(it => {
      const nom = it.rol ? (rolDe(it.rol).nombre || it.rol) : 'Sistema';
      return `<div class="fallo-item"><b>${escaparHTML(nom)}</b> · ${escaparHTML(it.tipo)} · ${escaparHTML(ahoraCorto(it.when))}<br>${escaparHTML(it.detalle)}${it.accion ? '<br><span class="muted">' + escaparHTML(it.accion) + '</span>' : ''}</div>`;
    }).join('');
  },
  pintar() {
    const caja = $('#ajPinCaja');
    caja.innerHTML = '';
    if (Llaves.hay && !AI.nLlaves()) {
      const b = document.createElement('button');
      b.className = 'ancho primario';
      b.textContent = '🔑 Desbloquear mis llaves con el PIN';
      b.onclick = () => Llaves.pedir(true);
      caja.appendChild(b);
    } else if (AI.nLlaves()) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'Llaves activas en este teléfono: ' + AI.nLlaves() + ' de Groq.';
      caja.appendChild(p);
    }
    const est = $('#ajEstado');
    const filas = [
      ...['groq', 'groq2', 'groq3'].map((id, i) => ({
        id, nom: 'Groq ' + (i + 1), ok: !!AI.claves()[id],
      })),
      { id: 'pollinations', nom: 'Pollinations (respaldo)', ok: true },
    ];
    est.innerHTML = filas.map(f => {
      const st = AI.estado[f.id];
      const luz = st || (f.ok ? 'lista' : 'err');
      const txt = st === 'ok' ? 'funciona' : st === 'err' ? 'falló' : st === 'prob' ? 'en espera' : (f.ok ? 'lista' : 'sin llave');
      return `<div class="est-fila"><span class="luz ${luz}"></span><b>${escaparHTML(f.nom)}</b><span>${txt}</span></div>`;
    }).join('');
    const ul = $('#ajRoles');
    ul.innerHTML = ORDEN_ROLES.map(id => {
      const r = ROLES[id];
      const mod = AI.modeloDe[id] || r.modeloPref;
      const nom = r.nombreLargo || r.nombre;
      return `<li>${avHTML(id)}<div><b>${escaparHTML(nom)}</b> · ${escaparHTML(r.corto)}<br><span class="muted">${escaparHTML(mod)}</span></div></li>`;
    }).join('');
    this.pintarMetricas();
  },
};

function red() { $('#avisoRed').hidden = navigator.onLine; }

function syncCompacto() {
  const bar = $('#equipoBar');
  if (!bar || document.body.classList.contains('ajustes')) return;
  bar.classList.toggle('compacto', window.scrollY > 40);
}

window.addEventListener('DOMContentLoaded', async () => {
  Metricas.reset();
  App.cargar();
  App.ideas();
  App.pintarEquipo();
  App.pintarEncargos();
  App.pintarGrupo();
  Ajustes.pintarFallos();
  $$('.modos button').forEach(b => b.onclick = () => App.ir(b.dataset.modo));
  $('#btnAjustes').onclick = () => App.ir(App.modo === 'ajustes' ? (localStorage.getItem('e5_modo') || 'encargo') : 'ajustes');
  $('#ajVolver').onclick = () => App.ir(localStorage.getItem('e5_modo') || 'encargo');
  $('#btnNuevo').onclick = () => App.nueva();
  $('#btnPromover').onclick = () => App.promover();
  $('#cajaForm').onsubmit = e => App.enviar(e);
  const ta = $('#cajaIn');
  ta.addEventListener('input', () => autoAlto(ta));
  ta.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); App.enviar(); }
  });
  const chk = $('#chkProfundo');
  if (chk) {
    chk.checked = localStorage.getItem('e5_profundo') === '1';
    chk.onchange = () => localStorage.setItem('e5_profundo', chk.checked ? '1' : '0');
  }
  $('#btnAdjunto').onclick = () => $('#inAdjunto').click();
  $('#inAdjunto').onchange = async ev => {
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    if (f.type.startsWith('image/')) {
      const url = URL.createObjectURL(f);
      const img = new Image();
      img.onload = () => {
        App.adjunto = { tipo: 'imagen', nombre: f.name, wh: img.naturalWidth + '×' + img.naturalHeight };
        URL.revokeObjectURL(url);
        const n = $('#adjuntoNom');
        n.hidden = false;
        n.textContent = '📎 ' + f.name + ' (' + App.adjunto.wh + ') — se envía como descripción, no hay visión automática.';
      };
      img.src = url;
    } else {
      const txt = (await f.text()).slice(0, 8000);
      App.adjunto = { tipo: 'texto', nombre: f.name, texto: txt };
      const n = $('#adjuntoNom');
      n.hidden = false;
      n.textContent = '📎 ' + f.name + ' (' + txt.length + ' caracteres)';
    }
  };
  $('#btnFallosCab').onclick = () => {
    const l = $('#fallosLista');
    const open = l.hidden;
    l.hidden = !open;
    $('#btnFallosCab').setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  document.addEventListener('e5-fallos', () => Ajustes.pintarFallos());
  $('#ajCsv').onclick = () => descargar(Metricas.csv(), 'enjambre-7-metricas.csv', 'text/csv;charset=utf-8');
  $('#ajBorrar').onclick = () => {
    if (!confirm('¿Borrar encargos y el chat del grupo de este teléfono?')) return;
    App.encargos = []; App.grupo = [];
    localStorage.removeItem('e5_encargos');
    localStorage.removeItem('e5_grupo');
    FallosLog.reset();
    Metricas.reset();
    App.pintarEncargos(); App.pintarGrupo();
    Ajustes.pintar();
    Ajustes.pintarFallos();
    toast('Historial borrado');
  };
  $('#ajProbar').onclick = async () => {
    const est = $('#ajProbarEst');
    if (!App.asegurarLlaves()) return;
    est.textContent = 'Probando…'; est.className = 'estado';
    try { const t = await AI.probar(); est.textContent = '✅ ' + t; est.className = 'estado ok'; }
    catch (e) { est.textContent = '❌ ' + e.message; est.className = 'estado err'; }
    Ajustes.pintar();
  };
  window.addEventListener('online', red);
  window.addEventListener('offline', red);
  window.addEventListener('scroll', syncCompacto, { passive: true });
  red();
  document.addEventListener('e5-llaves', async () => {
    Ajustes.pintar();
    await AI.verificarModelos();
    Ajustes.pintar();
  });
  const modo = localStorage.getItem('e5_modo') || 'encargo';
  App.ir(modo);
  await Llaves.iniciar();
  if (AI.nLlaves()) await AI.verificarModelos();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === '127.0.0.1' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  window.__e5 = { App, AI, ROLES, ORDEN_ROLES, Swarm, Grupo, Llaves, Metricas, FallosLog };
});
