const SYS_GRUPO = {
  base: `Eres un miembro del grupo "Enjambre 5" en un chat con Alfredo. Hablas en español mexicano, breve y profesional. Sin saludos, sin disculpas, sin relleno. 2 a 6 frases o una lista corta. No evades las salvaguardas del modelo. No hables en nombre de otros miembros. Aporta tu ángulo, no repitas lo que ya dijeron en este turno. Si te mencionan con @, responde directo a eso.`,

  arquitecto: `Tu rol: Arquitecto. Descompones lo que pide Alfredo en pasos lógicos y estructura. Si pide algo concreto, das el plan; no escribes el entregable completo (eso es del Ejecutor).`,
  ejecutor: `Tu rol: Ejecutor. Das el trabajo hecho: código, texto o prompt usable, aunque sea un fragmento corto si el espacio es poco. Si el plan ya está, ejecutas.`,
  critico: `Tu rol: Crítico. Encuentras huecos, riesgos y errores en lo que se ha dicho o propuesto. Eres directo. Si todo va bien, dilo en una línea y señala 1 mejora.`,
  expansor: `Tu rol: Expansor. Añades pulido, un extra útil, un giro estético o una función secundaria que mejore el resultado sin desviarlo.`,
  controlador: `Tu rol: Controlador. Mantienes el objetivo original. Cierras el turno con una síntesis útil para Alfredo, sin contar la discusión. Si hay un siguiente paso claro, lo indicas en una línea.`,
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
      const nom = x.rol === 'alfredo' ? 'Alfredo' : (ROLES[x.rol] || {}).nombre || x.rol;
      return nom + ': ' + String(x.texto || '').replace(/\s+/g, ' ').trim();
    }).join('\n');
  },

  async responder(texto, historial, { onInicio, onListo, onError, signal } = {}) {
    const destinos = this.destinos(texto);
    const turno = [];
    const resultados = [];
    for (const id of destinos) {
      if (onInicio) onInicio(id);
      const rol = ROLES[id];
      const msgs = [
        { role: 'system', content: SYS_GRUPO.base + '\n' + SYS_GRUPO[id] },
        {
          role: 'user',
          content:
            'Historial del grupo:\n' + (this.transcripcion(historial, 16) || '(vacío)') +
            (turno.length ? '\n\nRespuestas de este turno, ya publicadas:\n' + turno.join('\n') : '') +
            '\n\nNuevo mensaje de Alfredo:\n' + texto +
            '\n\nResponde solo como ' + rol.nombre + '. Máximo 6 frases o un bloque corto de código si hace falta.',
        },
      ];
      try {
        const out = await AI.completarConRespaldo({
          rol: id,
          mensajes: msgs,
          maxTokens: 420,
          temp: 0.45,
          signal,
        });
        const linea = rol.nombre + ': ' + out.texto;
        turno.push(linea);
        const item = { rol: id, texto: out.texto, modelo: out.modelo, via: out.via };
        resultados.push(item);
        if (onListo) onListo(item);
      } catch (e) {
        const item = { rol: id, texto: 'No pude responder ahora: ' + (e.message || 'error'), error: true };
        resultados.push(item);
        if (onError) onError(item);
      }
    }
    return resultados;
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
