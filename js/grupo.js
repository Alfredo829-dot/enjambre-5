const SYS_GRUPO = {
  base: `Eres un miembro del grupo "Enjambre 7" en un chat con Alfredo. Hablas en español mexicano, relajado y directo. Sin saludos, sin disculpas, sin moralina, sin disclaimers. 2 a 6 frases o una lista corta. No hables en nombre de otros. Aporta tu ángulo, no repitas lo de este turno. Si te mencionan con @, responde directo.
` + (typeof LINEAS_DURAS !== 'undefined' ? LINEAS_DURAS : ''),

  percepcion: `Tu rol: Percepción. Aclaras qué pidió Alfredo y el formato (texto, sitio web, app PWA, HTML o Python). No entregas el trabajo final.`,
  razonamiento: `Tu rol: Razonamiento (también te pueden decir Estratega). Das el plan más directo y barato, con pasos y una confianza de 0 a 1. Si falta algo esencial, 1 o 2 preguntas cortas. Si es un sitio o una app, arma secciones o pantallas. El entregable completo es de Acción.`,
  supervision: `Tu rol: Supervisión. Solo frenas si se cruzan las líneas duras (menores, delito dañino, hacerse pasar por alguien real para engañar). No frenes por gusto, estilo o porque "se ve feo". Si va bien, apruebas en una línea.`,
  accion: `Tu rol: Acción (también te pueden decir Ejecutor). Das el trabajo hecho: código, texto o un HTML usable. Si el espacio es corto, un fragmento honesto. Respetas el formato (texto, sitio, PWA, HTML o Python).`,
  feedback: `Tu rol: Feedback (también te pueden decir Crítico). Puntúas de 0 a 1 contra el pedido y el formato, no contra el gusto. Si está bajo 0.8, correcciones concretas. No pidas criterios de app cuando el formato es texto.`,
  adaptacion: `Tu rol: Adaptación. Si hay desvío, lo corriges y pules. Si va bien, 1 extra útil sin cambiar el formato. Nunca conviertas un texto en una página HTML.`,
  fallos: `Tu rol: Gestión de Fallos. Señalas riesgos, qué harías si una llamada falla (reintento, otra llave, respaldo) y un plan B breve. No cuentes toda la discusión.`,
};

const Grupo = {
  aliases: (() => {
    const m = { todos: 'todos', all: 'todos', everyone: 'todos' };
    for (const rol of Object.values(ROLES)) {
      for (const a of rol.mention) m[a.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()] = rol.id;
    }
    return m;
  })(),

  parseMentions(texto) {
    const out = new Set();
    const re = /@([A-Za-zÁÉÍÓÚáéíóúüÜñÑ]+)/g;
    let m;
    const src = String(texto || '');
    while ((m = re.exec(src))) {
      const key = m[1].normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
      if (this.aliases[key]) out.add(this.aliases[key]);
    }
    if (out.has('todos')) return ['todos'];
    return [...out];
  },

  destinos(texto) {
    const m = this.parseMentions(texto);
    if (!m.length || m.includes('todos')) return ORDEN_ROLES.slice();
    return ORDEN_ROLES.filter(id => m.includes(id));
  },

  transcripcion(msgs, limite = 18) {
    const recorte = msgs.slice(-limite);
    return recorte.map(x => {
      const nom = x.rol === 'alfredo' ? 'Alfredo' : (rolDe(x.rol).nombre || x.rol);
      return nom + ': ' + String(x.texto || '').replace(/\s+/g, ' ').trim();
    }).join('\n');
  },

  _slotLlave(id) {
    const pref = ((ROLES[id] || {}).keyPref || [])[0];
    return { groq: 0, groq2: 1, groq3: 2 }[pref] || 0;
  },

  async responder(texto, historial, { onInicio, onListo, onError, onDelta, signal } = {}) {
    const destinos = this.destinos(texto);
    const historialTxt = this.transcripcion(historial, 16) || '(vacío)';
    destinos.forEach(id => { if (onInicio) onInicio(id); });

    const porSlot = { 0: [], 1: [], 2: [] };
    destinos.forEach(id => porSlot[this._slotLlave(id)].push(id));

    const uno = async (id) => {
      const rol = ROLES[id];
      const msgs = [
        { role: 'system', content: SYS_GRUPO.base + '\n' + (SYS_GRUPO[id] || '') },
        {
          role: 'user',
          content:
            'Historial del grupo:\n' + historialTxt +
            '\n\nNuevo mensaje de Alfredo:\n' + texto +
            '\n\nResponde solo como ' + rol.nombre + '. Máximo 6 frases o un bloque corto de código si hace falta.',
        },
      ];
      try {
        const out = await AI.completar({
          rol: id,
          mensajes: msgs,
          maxTokens: 320,
          temp: 0.45,
          signal,
          onDelta: onDelta ? (d) => onDelta(id, d) : undefined,
        });
        const item = { rol: id, texto: out.texto, modelo: out.modelo, via: out.via, ms: out.ms, ttft: out.ttft };
        if (onListo) onListo(item);
        return item;
      } catch (e) {
        FallosLog.registrar({ rol: id, tipo: 'error', detalle: e.message, accion: 'se informa en el chat' });
        const item = { rol: id, texto: 'No pude responder ahora: ' + (e.message || 'error'), error: true };
        if (onError) onError(item);
        return item;
      }
    };

    const tareas = destinos.map(id => (async () => {
      const slot = this._slotLlave(id);
      const idx = porSlot[slot].indexOf(id);
      const espera = (idx * 180) + (slot * 50);
      if (espera) await esperar(espera);
      return uno(id);
    })());
    return Promise.all(tareas);
  },

  resumenParaEncargo(msgs) {
    const users = msgs.filter(m => m.rol === 'alfredo');
    const ultimo = users.length ? users[users.length - 1].texto : '';
    const ctx = this.transcripcion(msgs, 12);
    return { orden: ultimo || 'Aprovecha esta conversación del grupo y entrega un resultado listo.', contexto: ctx };
  },
};

window.Grupo = Grupo;
window.SYS_GRUPO = SYS_GRUPO;
