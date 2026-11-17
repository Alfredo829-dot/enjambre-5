const SYS = {
  percepcion: `Eres Percepción del Enjambre 7. Entiendes y normalizas el encargo de Alfredo, incluyendo texto o la descripción de una imagen adjunta si la hay.
Extraes la intención y el tipo de entrega. No pides permiso. No evades las salvaguardas del modelo.
El campo "entrega" debe coincidir con lo que se va a entregar de verdad:
- "texto": haiku, poema, copy, lista, plan, prompt, carta, nombres, mensajes. Texto plano (markdown permitido). NUNCA una página ni una app.
- "html": solo si pide una app web, una página o un HTML.
- "python": solo si pide un script de Python.
Respondes SOLO con JSON válido:
{"intencion":"...","resumen":"...","entrega":"html|python|texto","tipo":"web|codigo|plan|prompt|otro","adjuntos":"...","notas":"..."}
Español mexicano. Sé concreto y breve.`,

  razonamiento: `Eres Razonamiento del Enjambre 7 (el puesto que antes era el Estratega). Armas un plan técnico ejecutable, eliges el camino más rápido y barato, y declaras una confianza de 0 a 1.
Modo Encargo: no haces preguntas. Si falta algo, asumes defaults sensatos y los declaras en "supuestos".
"entrega" debe respetar lo que detectó Percepción, salvo que el pedido original lo contradiga con claridad. En un haiku en español, 5-7-5 es una guía, no un criterio rígido. No evades las salvaguardas.
Respondes SOLO con JSON válido:
{"objetivo":"...","supuestos":["..."],"camino":"...","tipo":"web|codigo|plan|prompt|otro","entrega":"html|python|texto","pasos":["..."],"criterios":["..."],"confianza":0.0,"notas":"..."}
confianza es un número entre 0 y 1. Español mexicano. Sé concreto y breve.`,

  supervision: `Eres Supervisión del Enjambre 7. Validas el plan antes de ejecutarlo.
Apruebas solo si: hay al menos un paso concreto, la confianza es >= 0.5, el formato de entrega es coherente, y no hay un pedido de evadir salvaguardas o de hacer daño.
Si algo no se sostiene, bloqueas con razones accionables. No suavices.
Respondes SOLO con JSON válido:
{"aprobado":true o false,"pasos_ok":true o false,"confianza_ok":true o false,"seguridad_ok":true o false,"razones":["..."]}
Español mexicano.`,

  accion: `Eres Acción del Enjambre 7. Tomas el plan aprobado y produces el entregable completo, listo para usar, en el FORMATO OBLIGATORIO.
Sin relleno, sin pedir permiso. No evades las salvaguardas del modelo.
- html: un HTML completo, autónomo, móvil, en un bloque \`\`\`html. CSS incluido. Sin librerías de pago.
- python: un script completo en \`\`\`python, solo biblioteca estándar.
- texto: SOLO el texto pedido (markdown permitido). NUNCA lo envuelvas en HTML, CSS, <!doctype> ni en una app.
Español mexicano en la UI/copy cuando aplique.`,

  feedback: `Eres Feedback del Enjambre 7. Puntúas el entregable de 0 a 1 contra el objetivo y el FORMATO exigido.
No suavices. No evades las salvaguardas. Respondes SOLO con JSON válido:
{"score":0.0,"fallos":["..."],"orden":"rehecho: ... o ok"}
Reglas:
- score < 0.8 si el formato no coincide (HTML cuando se pedía texto, o al revés), si está incompleto, con errores, o no cumple los criterios PARA ESE FORMATO.
- Si el formato es texto, un haiku, plan, copy o lista que cumple el pedido debe poder tener score >= 0.8. No pidas interfaz, CSS ni funciones de app.
- Un haiku en español de tres versos sobre el tema cumple aunque el conteo 5-7-5 sea aproximado. No bajes de 0.8 solo por sílabas de más o de menos si hay tres líneas, trata el tema y está en texto plano.
- Reserva scores < 0.8 para incumplimiento del pedido, formato equivocado (texto vs html) o errores graves.
- Si el formato es html, juzga que sea una página/app usable y completa.
Máximo 6 fallos. Español mexicano. score es un número entre 0 y 1.`,

  adaptacion: `Eres Adaptación del Enjambre 7. Tomas el mejor entregable disponible y lo dejas listo para Alfredo, respetando el FORMATO OBLIGATORIO.
- Si el score fue >= 0.8: pule un poco y, si aporta, 1 a 3 extras que no rompan el objetivo ni el formato.
- Si el score fue < 0.8: hay desvío. Corrige los fallos, alinea el resultado con el pedido original y entrega la versión completa.
- html: SOLO un bloque \`\`\`html con el documento completo. python: SOLO un bloque \`\`\`python. texto: SOLO el texto pedido.
Responde únicamente con el entregable. Sin saludo, sin "aquí tienes", sin explicar el score, sin preámbulo ni epílogo.
No evades las salvaguardas. Español mexicano en la UI/copy cuando aplique.`,
};


function suavizarPuntaje(score, fallos, entrega, orden, trabajo) {
  if (entrega !== 'texto') return { score, fallos, suavizado: false };
  if (!/\bhaiku\b/i.test(orden)) return { score, fallos, suavizado: false };
  const lineas = String(trabajo || '').trim().split(/\n/).map(l => l.trim()).filter(Boolean);
  if (lineas.length < 2 || lineas.length > 6) return { score, fallos, suavizado: false };
  const reSil = /s[ií]laba|5\s*[-–]\s*7\s*[-–]\s*5|verso tiene|l[ií]nea tiene|mora|m[eé]trica/i;
  const lista = (fallos || []).map(String);
  const soloMetrica = lista.length === 0 || lista.every(f => reSil.test(f));
  if (score < 0.8 && soloMetrica) {
    return { score: Math.max(score, 0.85), fallos: [], suavizado: true };
  }
  return { score, fallos, suavizado: false };
}

const Swarm = {
  async correr(orden, { onPaso, signal, contexto, profundo, adjunto } = {}) {
    const t0 = Date.now();
    const historial = {
      orden, veredictos: [], rondas: 0, pasos: [], resultado: '', artefacto: null,
      error: null, modelos: {}, entrega: 'texto', score: null, bloqueado: false, profundo: !!profundo,
    };
    const emitir = (paso) => {
      const i = historial.pasos.findIndex(x => x.id === paso.id);
      if (i >= 0) historial.pasos[i] = paso;
      else historial.pasos.push(paso);
      if (onPaso) onPaso(paso, historial);
    };

    historial.latencias = [];
    const pedir = async (rol, mensajes, extra = {}) => {
      const out = await AI.completar({
        rol,
        mensajes,
        maxTokens: extra.maxTokens ?? 800,
        temp: extra.temp ?? 0.3,
        signal,
        timeout: extra.timeout,
        onDelta: extra.pasoId ? (d) => {
          emitir({
            id: extra.pasoId,
            rol,
            estado: 'run',
            titulo: extra.tituloRun || ((ROLES[rol] || {}).nombre + ' · escribiendo'),
            detalle: d.texto,
            resumen: 'escribiendo…',
            ronda: extra.ronda,
            abrir: true,
            ttft: d.ttft,
          });
        } : undefined,
      });
      historial.modelos[rol] = out.modelo + (out.via === 'pollinations' ? ' (respaldo)' : '');
      historial.latencias.push({ rol, ms: out.ms, ttft: out.ttft, modelo: out.modelo, via: out.via, tokens: out.tokens });
      return out;
    };

    const ctx = contexto ? '\n\nContexto del grupo:\n' + contexto : '';
    const adj = adjunto ? '\n\nADJUNTOS:\n' + adjunto : '';

    // 1. Percepción
    emitir({ id: 'per', rol: 'percepcion', estado: 'run', titulo: 'Percepción · entendiendo el pedido', detalle: '', abrir: true });
    let perc = { intencion: orden, resumen: orden, entrega: 'texto', tipo: 'otro', adjuntos: '', notas: '' };
    try {
      const out = await pedir('percepcion', [
        { role: 'system', content: SYS.percepcion },
        { role: 'user', content: 'ENCARGO:\n' + orden + ctx + adj },
      ], { maxTokens: 320, temp: 0.15, pasoId: 'per', tituloRun: 'Percepción · entendiendo el pedido' });
      perc = extraerJSON(out.texto) || perc;
      perc.entrega = entregaDe(perc, orden);
      historial.entrega = perc.entrega;
      emitir({ id: 'per', rol: 'percepcion', estado: 'ok', titulo: 'Percepción · pedido claro', detalle: out.texto, resumen: resumir((perc.intencion || perc.resumen || '') + ' · ' + perc.entrega, 120), abrir: true });
    } catch (e) {
      FallosLog.registrar({ rol: 'percepcion', tipo: 'error', detalle: e.message, accion: 'se asume el encargo original y se muestra el fallo en la burbuja' });
      emitir({
        id: 'per', rol: 'percepcion', estado: 'fail', abrir: true,
        titulo: 'Percepción · no alcanzó a responder',
        detalle: 'No pude completar la lectura del pedido: ' + (e.message || 'error') + '\n\nSigo con el encargo original tal como lo escribiste.',
        resumen: 'Sigo con el encargo original',
      });
    }

    // 2. Razonamiento
    emitir({ id: 'raz', rol: 'razonamiento', estado: 'run', titulo: 'Razonamiento · planeando', detalle: '', abrir: true });
    let planTxt = '', plan, planDeRescate = false;
    try {
      const out = await pedir('razonamiento', [
        { role: 'system', content: SYS.razonamiento },
        { role: 'user', content: 'ENCARGO:\n' + orden + ctx + adj + '\n\nPERCEPCIÓN:\n' + JSON.stringify(perc) },
      ], { maxTokens: 700, temp: 0.2, pasoId: 'raz', tituloRun: 'Razonamiento · planeando' });
      planTxt = out.texto;
      plan = extraerJSON(planTxt) || { objetivo: orden, tipo: perc.tipo || 'otro', entrega: perc.entrega, pasos: ['Producir el entregable pedido'], criterios: ['Cumplir el formato'], supuestos: [], camino: '', confianza: 0.6, notas: planTxt };
    } catch (e) {
      FallosLog.registrar({ rol: 'razonamiento', tipo: 'error', detalle: e.message, accion: 'se continúa con un plan mínimo' });
      plan = { objetivo: orden, tipo: perc.tipo || 'otro', entrega: perc.entrega, pasos: ['Producir el entregable pedido'], criterios: ['Cumplir el formato pedido'], supuestos: ['Plan mínimo porque Razonamiento no alcanzó a responder'], camino: 'directo', confianza: 0.6, notas: '' };
      planTxt = JSON.stringify(plan);
      planDeRescate = true;
      emitir({ id: 'raz', rol: 'razonamiento', estado: 'fail', titulo: 'Razonamiento · no alcanzó a responder', detalle: (e.message || 'error') + '\n\nSigo con un plan mínimo para no dejarte sin resultado.', resumen: 'Sigo con un plan mínimo', abrir: true });
    }

    if (profundo) {
      try {
        Metricas.iterar('razonamiento', 1);
        const ref = await pedir('razonamiento', [
          { role: 'system', content: SYS.razonamiento + '\nEstás en una pasada extra de análisis profundo: mejora el plan, no lo alargues de más, ajusta la confianza con honestidad.' },
          { role: 'user', content: 'ENCARGO:\n' + orden + '\n\nPLAN A REFINAR:\n' + planTxt },
        ], { maxTokens: 700, temp: 0.2, pasoId: 'raz', tituloRun: 'Razonamiento · refinando' });
        const p2 = extraerJSON(ref.texto);
        if (p2 && Array.isArray(p2.pasos) && p2.pasos.length) {
          plan = p2;
          planTxt = ref.texto;
        }
      } catch (e) {
        FallosLog.registrar({ rol: 'razonamiento', tipo: 'error', detalle: 'Refinamiento profundo: ' + e.message, accion: 'se conserva el primer plan' });
      }
    }

    const entrega = entregaDe({ ...plan, entrega: plan.entrega || perc.entrega }, orden);
    plan.entrega = entrega;
    historial.entrega = entrega;
    const confianza = Number(plan.confianza);
    plan.confianza = Number.isFinite(confianza) ? Math.max(0, Math.min(1, confianza)) : 0;
    if (!planDeRescate) {
      emitir({
        id: 'raz', rol: 'razonamiento', estado: 'ok', titulo: 'Razonamiento · plan listo',
        detalle: planTxt, resumen: resumir('confianza ' + plan.confianza + ' · ' + (plan.objetivo || ''), 120),
      });
    }

    const formato = reglasEntrega(entrega);
    const planCompacto = JSON.stringify({
      objetivo: plan.objetivo, supuestos: plan.supuestos, camino: plan.camino,
      tipo: plan.tipo, entrega, pasos: plan.pasos, criterios: plan.criterios,
      confianza: plan.confianza, notas: plan.notas,
    });

    // 3. Supervisión
    emitir({ id: 'sup', rol: 'supervision', estado: 'run', titulo: 'Supervisión · validando el plan', detalle: '', abrir: true });
    let superv = { aprobado: true, pasos_ok: true, confianza_ok: true, seguridad_ok: true, razones: [] };
    try {
      const out = await pedir('supervision', [
        { role: 'system', content: SYS.supervision },
        { role: 'user', content: 'ENCARGO:\n' + orden + '\n\nPLAN:\n' + planCompacto },
      ], { maxTokens: 280, temp: 0.1, pasoId: 'sup', tituloRun: 'Supervisión · validando el plan' });
      superv = extraerJSON(out.texto) || superv;
      emitir({ id: 'sup', rol: 'supervision', estado: 'ok', titulo: 'Supervisión · revisión lista', detalle: out.texto, resumen: superv.aprobado === false ? 'observa problemas' : 'revisado' });
    } catch (e) {
      FallosLog.registrar({ rol: 'supervision', tipo: 'error', detalle: e.message, accion: 'se valida solo con reglas locales' });
      emitir({ id: 'sup', rol: 'supervision', estado: 'fail', titulo: 'Supervisión · no alcanzó a responder', detalle: (e.message || 'error') + '\n\nSigo con las reglas locales (pasos, confianza y seguridad).', resumen: 'Validación local', abrir: true });
    }

    const razones = [];
    const pasosOk = Array.isArray(plan.pasos) && plan.pasos.filter(Boolean).length >= 1;
    if (!pasosOk) razones.push('El plan no tiene pasos concretos.');
    if (!(plan.confianza >= 0.5)) razones.push('La confianza del plan es menor a 0.5 (' + plan.confianza + ').');
    if (superv && superv.aprobado === false) {
      (superv.razones || ['Supervisión no aprobó el plan']).forEach(r => { if (r && !razones.includes(r)) razones.push(r); });
    }
    if (superv && superv.seguridad_ok === false) {
      (superv.razones || ['El plan no pasa el filtro de seguridad']).forEach(r => { if (r && !razones.includes(r)) razones.push(r); });
    }
    if (typeof window !== 'undefined' && window.__e5forzar && window.__e5forzar.bloquearSupervision) {
      razones.push('Bloqueo forzado de prueba.');
    }
    const bloqueado = razones.length > 0;
    if (bloqueado) {
      historial.bloqueado = true;
      historial.error = 'Supervisión bloqueó el plan: ' + razones.join(' ');
      FallosLog.registrar({ rol: 'supervision', tipo: 'bloqueo', detalle: razones.join(' | '), accion: 'no se ejecuta Acción' });
      emitir({
        id: 'sup', rol: 'supervision', estado: 'fail',
        titulo: 'Supervisión · plan bloqueado',
        detalle: razones.map((r, i) => (i + 1) + '. ' + r).join('\n'),
        resumen: resumir(razones[0], 120),
      });
      historial.ms = Date.now() - t0;
      return historial;
    }
    emitir({ id: 'sup', rol: 'supervision', estado: 'ok', titulo: 'Supervisión · plan aprobado', detalle: JSON.stringify(superv), resumen: 'confianza ' + plan.confianza });

    const aplicarFormato = (txt) => {
      if (entrega === 'texto') return forzarTextoPlano(txt);
      if (entrega === 'html') return pareceHTML(txt) || String(txt || '').trim();
      if (entrega === 'python') return extraerBloque(txt, ['python', 'py']) || String(txt || '').trim();
      return String(txt || '').trim();
    };

    // 4-5. Acción + Feedback, hasta 3 rondas (umbral 0.8)
    let trabajo = '';
    let fallosPendientes = '';
    let score = 0;
    const umbral = 0.8;
    const maxRondas = 3;
    for (let r = 1; r <= maxRondas; r++) {
      historial.rondas = r;
      const eid = 'acc' + r;
      emitir({
        id: eid, rol: 'accion', estado: 'run', ronda: r,
        titulo: r === 1 ? 'Acción · produciendo' : 'Acción · corrección ronda ' + r,
        detalle: '',
      });
      try {
        const msgs = [
          { role: 'system', content: SYS.accion + '\n' + formato },
          { role: 'user', content: 'OBJETIVO ORIGINAL:\n' + orden + ctx + adj + '\n\nPLAN APROBADO:\n' + planCompacto + '\n\n' + formato },
        ];
        if (r > 1) {
          msgs.push({
            role: 'user',
            content: 'CORRECCIÓN. El score fue ' + score + ' (hace falta >= 0.8). Corrige exactamente estos fallos y entrega la versión completa, en formato ' + entrega + ':\n' + fallosPendientes,
          });
        }
        const out = await pedir('accion', msgs, { maxTokens: 2500, temp: 0.3, pasoId: eid, tituloRun: r === 1 ? 'Acción · produciendo' : 'Acción · corrección ronda ' + r, ronda: r });
        trabajo = aplicarFormato(out.texto);
        if (profundo && r === 1) {
          try {
            Metricas.iterar('accion', 1);
            const ref = await pedir('accion', [
              { role: 'system', content: SYS.accion + '\n' + formato + '\nPasada extra de análisis profundo: revisa tu entregable y mejora lo que falle, sin cambiar el formato.' },
              { role: 'user', content: 'OBJETIVO:\n' + orden + '\n\nTU ENTREGABLE:\n' + trabajo },
            ], { maxTokens: 2500, temp: 0.25, pasoId: eid, tituloRun: 'Acción · refinando', ronda: r });
            trabajo = aplicarFormato(ref.texto || trabajo);
          } catch (e) {
            FallosLog.registrar({ rol: 'accion', tipo: 'error', detalle: 'Refinamiento: ' + e.message, accion: 'se conserva la primera versión' });
          }
        }
        emitir({
          id: eid, rol: 'accion', estado: 'ok', ronda: r,
          titulo: r === 1 ? 'Acción · entregable listo' : 'Acción · ronda ' + r + ' lista',
          detalle: trabajo, resumen: resumir(trabajo, 120),
        });
      } catch (e) {
        emitir({ id: eid, rol: 'accion', estado: 'fail', titulo: 'Acción · falló', detalle: e.message, resumen: e.message, ronda: r });
        historial.error = e.message;
        break;
      }

      const fid = 'fb' + r;
      emitir({ id: fid, rol: 'feedback', estado: 'run', titulo: 'Feedback · puntuando ronda ' + r, detalle: '', ronda: r });
      try {
        const out = await pedir('feedback', [
          { role: 'system', content: SYS.feedback + '\n' + formato },
          { role: 'user', content: 'OBJETIVO:\n' + orden + '\n\nFORMATO EXIGIDO: ' + entrega + '\n' + formato + '\n\nCRITERIOS:\n' + JSON.stringify(plan.criterios || []) + '\n\nENTREGABLE:\n' + trabajo },
        ], { maxTokens: 400, temp: 0.15, pasoId: fid, tituloRun: 'Feedback · puntuando ronda ' + r, ronda: r });
        const j = extraerJSON(out.texto) || {};
        let s = Number(j.score);
        if (!Number.isFinite(s)) s = String(j.veredicto || '').toUpperCase() === 'PASS' ? 0.85 : 0.4;
        s = Math.max(0, Math.min(1, s));
        let fallos = (j.fallos || []).filter(Boolean);
        const suave = suavizarPuntaje(s, fallos, entrega, orden, trabajo);
        if (suave.suavizado) {
          s = suave.score;
          fallos = suave.fallos;
        }
        score = s;
        historial.score = s;
        fallosPendientes = fallos.map((f, i) => (i + 1) + '. ' + f).join('\n') || (suave.suavizado ? '' : out.texto);
        historial.veredictos.push({ ronda: r, score: s, pass: s >= umbral, fallos, raw: out.texto, suavizado: !!suave.suavizado });
        emitir({
          id: fid, rol: 'feedback', estado: s >= umbral ? 'ok' : 'fail', ronda: r, veredicto: s >= umbral ? 'PASS' : 'FAIL',
          titulo: s >= umbral ? ('Feedback · ' + s.toFixed(2) + ' PASS') : ('Feedback · ' + s.toFixed(2) + ' · ronda ' + r),
          detalle: out.texto,
          resumen: s >= umbral ? 'Cumple el pedido y el formato' : resumir((fallos[0] || 'Hay que corregir'), 120),
        });
        if (s >= umbral) break;
      } catch (e) {
        score = 0.8;
        historial.score = score;
        historial.veredictos.push({ ronda: r, score, pass: true, fallos: [], raw: 'feedback no disponible: ' + e.message, omitido: true });
        FallosLog.registrar({ rol: 'feedback', tipo: 'error', detalle: e.message, accion: 'se continúa con el entregable actual' });
        emitir({
          id: fid, rol: 'feedback', estado: 'fail', titulo: 'Feedback · no alcanzó a responder', detalle: (e.message || 'error') + '\n\nSigo con el entregable actual.',
          resumen: 'Sigo con el entregable actual', ronda: r, abrir: true,
        });
        break;
      }
    }

    if (!trabajo) {
      historial.error = historial.error || 'Acción no produjo un entregable';
      historial.ms = Date.now() - t0;
      return historial;
    }

    // 6. Adaptación (empaqueta el resultado final)
    emitir({ id: 'ada', rol: 'adaptacion', estado: 'run', titulo: score < umbral ? 'Adaptación · corrigiendo desvío' : 'Adaptación · puliendo', detalle: '' });
    let finalTxt = trabajo;
    try {
      const extra = score < umbral
        ? '\nHay DESVÍO (score ' + score + ' < 0.8). Corrige los fallos y alinea el resultado con el pedido, sin cambiar el formato.\nFALLOS:\n' + fallosPendientes
        : '\nEl score fue ' + score + '. Pule sin desviarte.';
      const out = await pedir('adaptacion', [
        { role: 'system', content: SYS.adaptacion + '\n' + formato },
        { role: 'user', content: 'OBJETIVO:\n' + orden + ctx + '\n\nFORMATO EXIGIDO: ' + entrega + '\n' + formato + '\n\nENTREGABLE:\n' + trabajo + extra },
      ], { maxTokens: 2500, temp: score < umbral ? 0.3 : 0.55, pasoId: 'ada', tituloRun: score < umbral ? 'Adaptación · corrigiendo desvío' : 'Adaptación · puliendo' });
      finalTxt = aplicarFormato(out.texto || trabajo);
      emitir({ id: 'ada', rol: 'adaptacion', estado: 'ok', titulo: 'Adaptación · resultado listo', detalle: finalTxt, resumen: resumir(finalTxt, 120) });
    } catch (e) {
      FallosLog.registrar({ rol: 'adaptacion', tipo: 'error', detalle: e.message, accion: 'se entrega la versión de Acción' });
      finalTxt = aplicarFormato(trabajo);
      emitir({ id: 'ada', rol: 'adaptacion', estado: 'ok', titulo: 'Adaptación · se omite', detalle: e.message, resumen: 'Se entrega la versión de Acción' });
    }

    historial.resultado = finalTxt;
    historial.entrega = entrega;
    historial.artefacto = extraerArtefacto(finalTxt, entrega);
    historial.ms = Date.now() - t0;
    return historial;
  },
};

window.Swarm = Swarm;
window.SYS_ENJAMBRE = SYS;
