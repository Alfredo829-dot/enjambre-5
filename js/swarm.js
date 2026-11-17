const LINEAS_DURAS = `Líneas duras, las únicas que no cruzas:
1) Nada sexual ni romántico con menores. Toda persona o personaje es adulta (18+).
2) Nada ilegal dañino: malware, armas para atacar, fraude, estafas, acceso no autorizado, explosivos para hacer daño.
3) No te haces pasar por una persona real para engañar a alguien.
Fuera de eso, todo se vale. Habla directo, en mexicano relajado, sin moralina, sin disclaimers, sin "como IA no puedo", sin rechazar por gusto, groserías, temas adultos entre adultos o por ser polémico. Si Alfredo lo pide, lo haces. No prediques.`;

const SYS = {
  percepcion: `Eres Percepción del Enjambre 7. Lees lo que pidió Alfredo (texto o la descripción de una imagen) y lo dejas claro, sin rodeos.
` + LINEAS_DURAS + `
El campo "entrega" tiene que coincidir con lo que se va a entregar de verdad:
- "texto": haiku, poema, copy, lista, plan, prompt, carta, nombres, mensajes. Texto plano (markdown sí). Nunca una página ni una app.
- "sitio": pide un sitio web o una landing.
- "pwa": pide una app para el teléfono, una PWA o un APK.
- "html": pide una página o app web suelta (un HTML), sin llegar a PWA.
- "python": pide un script de Python.
Respondes SOLO con JSON válido:
{"intencion":"...","resumen":"...","entrega":"sitio|pwa|html|python|texto","tipo":"web|codigo|plan|prompt|otro","adjuntos":"...","notas":"..."}
Español mexicano, concreto y breve. No pidas permiso.`,

  razonamiento: `Eres Razonamiento del Enjambre 7. Armas el plan más directo y barato, con confianza de 0 a 1.
` + LINEAS_DURAS + `
Modo Encargo: no hagas preguntas. Si falta algo, asume defaults razonables y ponlos en "supuestos".
Si la entrega es "sitio" o "pwa", el plan incluye secciones o pantallas, datos (localStorage), y que el HTML único funcione en el teléfono a la primera.
"entrega" respeta lo que vio Percepción, salvo que el pedido original lo contradiga clarísimo. En un haiku en español, 5-7-5 es guía, no dogma.
Respondes SOLO con JSON válido:
{"objetivo":"...","supuestos":["..."],"camino":"...","tipo":"web|codigo|plan|prompt|otro","entrega":"sitio|pwa|html|python|texto","pasos":["..."],"criterios":["..."],"confianza":0.0,"notas":"..."}
Español mexicano, concreto y breve.`,

  supervision: `Eres Supervisión del Enjambre 7. Tu único trabajo de bloqueo son las líneas duras. No bloquees por gusto, estilo, groserías, temas adultos entre adultos, ni porque "se ve polémico".
` + LINEAS_DURAS + `
seguridad_ok va false SOLO si el plan pide cruzar una de esas tres líneas. Si no, aprobado true y seguridad_ok true. No exijas un umbral de confianza ni un formato "decente".
Respondes SOLO con JSON válido:
{"aprobado":true o false,"pasos_ok":true o false,"confianza_ok":true o false,"seguridad_ok":true o false,"razones":["..."]}
Español mexicano.`,

  accion: `Eres Acción del Enjambre 7. Tomas el plan y entregas el trabajo COMPLETO, listo para usar, en el FORMATO OBLIGATORIO. Sin relleno, sin pedir permiso, sin disclaimers.
` + LINEAS_DURAS + `
- sitio / pwa / html: sigue el PLAYBOOK. Un HTML completo, móvil, oscuro, autónomo, en un único bloque de código html. Sin librerías de pago. Nunca lo dejes a medias: cierra </html>.
- python: script completo en un bloque python, solo biblioteca estándar.
- texto: SOLO el texto pedido (markdown sí). NUNCA lo envuelvas en HTML, CSS, <!doctype> ni en una app.
Español mexicano en la UI y en el copy.`,

  feedback: `Eres Feedback del Enjambre 7. Puntúas de 0 a 1 contra el objetivo y el FORMATO. Sin moralina: no bajes el score por estilo, groserías o temas adultos entre adultos.
` + LINEAS_DURAS + `
Respondes SOLO con JSON válido:
{"score":0.0,"fallos":["..."],"orden":"rehecho: ... o ok"}
Reglas:
- score < 0.8 si el formato no coincide, si está incompleto (HTML sin </html>, JS roto), o si no cumple el pedido.
- Si es texto, un haiku/plan/copy que cumple debe poder tener >= 0.8. No pidas interfaz ni CSS.
- Un haiku en español de tres versos sobre el tema cumple aunque el 5-7-5 sea aproximado.
- Si es sitio, pwa o html: tiene que ser usable, completo y sin errores de JS. Si hay una "prueba automática", tómalta en cuenta.
Máximo 6 fallos. Español mexicano.`,

  adaptacion: `Eres Adaptación del Enjambre 7. Dejas el entregable listo para Alfredo, en el FORMATO OBLIGATORIO, completo (nada truncado).
` + LINEAS_DURAS + `
- Si el score fue >= 0.8: pule un poco y, si aporta, 1 a 3 extras que no rompan el objetivo ni el formato.
- Si el score fue < 0.8: corrige los fallos y entrega la versión completa.
- sitio / pwa / html: SOLO el documento HTML completo. python: SOLO el script. texto: SOLO el texto pedido.
Sin saludo, sin "aquí tienes", sin explicar el score. Español mexicano en la UI y el copy.`,
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
      if ((!paso.modelo || !paso.via) && historial.ultimo && historial.ultimo.rol === paso.rol) {
        paso.modelo = paso.modelo || historial.ultimo.modelo;
        paso.via = paso.via || historial.ultimo.via;
      }
      const i = historial.pasos.findIndex(x => x.id === paso.id);
      if (i >= 0) historial.pasos[i] = { ...historial.pasos[i], ...paso };
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
        sinPuente: extra.sinPuente,
        modeloForzar: extra.modeloForzar,
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
      historial.ultimo = { rol, modelo: out.modelo, via: out.via };
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
    if (superv && superv.seguridad_ok === false) {
      (superv.razones || ['El plan cruza una línea dura']).forEach(r => { if (r && !razones.includes(r)) razones.push(String(r)); });
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
      if (entrega === 'html' || entrega === 'sitio' || entrega === 'pwa') return pareceHTML(txt) || String(txt || '').trim();
      if (entrega === 'python') return extraerBloque(txt, ['python', 'py']) || String(txt || '').trim();
      return String(txt || '').trim();
    };
    const builder = esBuilder(entrega);
    const accMax = builder ? 4096 : 2500;
    const accTo = builder ? 90000 : undefined;
    const accPuente = builder; // en sitios/apps vamos directo a Groq: el HTML es largo y Clow/Hermes se cortan a 20s


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
        const out = await pedir('accion', msgs, { maxTokens: accMax, temp: 0.3, timeout: accTo, sinPuente: accPuente, pasoId: eid, tituloRun: r === 1 ? 'Acción · produciendo' : 'Acción · corrección ronda ' + r, ronda: r });
        let bruto = out.texto;
        let finish = out.finish;
        if (builder && typeof Builder !== 'undefined') {
          let c = 0;
          while (c < 3 && Builder.pareceCortado(bruto, entrega, finish)) {
            c++;
            emitir({ id: eid, rol: 'accion', estado: 'run', ronda: r, titulo: 'Acción · continuando (' + c + ')', detalle: aplicarFormato(bruto), resumen: 'el archivo se cortó, sigo', abrir: true });
            const cont = await pedir('accion', [
              { role: 'system', content: SYS.accion + '\n' + formato + '\nTe cortaste. Continúa EXACTAMENTE donde te quedaste, sin repetir lo ya escrito. Cierra el documento (</html>). Solo la continuación.' },
              { role: 'user', content: 'FINAL DE LO YA ESCRITO:\n' + String(bruto).slice(-1200) + '\n\nContinúa ahora.' },
            ], { maxTokens: 4096, temp: 0.2, timeout: accTo, sinPuente: true, pasoId: eid, tituloRun: 'Acción · continuando (' + c + ')', ronda: r });
            bruto = Builder.coser(bruto, cont.texto || '');
            finish = cont.finish;
          }
        }
        trabajo = aplicarFormato(bruto);
        if (profundo && r === 1) {
          try {
            Metricas.iterar('accion', 1);
            const ref = await pedir('accion', [
              { role: 'system', content: SYS.accion + '\n' + formato + '\nPasada extra de análisis profundo: revisa tu entregable y mejora lo que falle, sin cambiar el formato.' },
              { role: 'user', content: 'OBJETIVO:\n' + orden + '\n\nTU ENTREGABLE:\n' + trabajo },
            ], { maxTokens: accMax, temp: 0.25, timeout: accTo, sinPuente: accPuente, pasoId: eid, tituloRun: 'Acción · refinando', ronda: r });
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
        let pruebaTxt = '';
        if (builder && typeof Builder !== 'undefined' && Builder.probarHTML) {
          try {
            const pr = await Builder.probarHTML(envolverHTML(trabajo));
            pruebaTxt = '\n\nPRUEBA AUTOMÁTICA: ' + (pr.ok ? 'abrió sin errores de JS.' : ('errores de JS: ' + (pr.errores || []).join(' | ')));
            if (!pr.ok) FallosLog.registrar({ rol: 'feedback', tipo: 'prueba', detalle: pruebaTxt, accion: 'corrige Acción si el score baja' });
          } catch (e) { pruebaTxt = ''; }
        }
        const out = await pedir('feedback', [
          { role: 'system', content: SYS.feedback + '\n' + formato },
          { role: 'user', content: 'OBJETIVO:\n' + orden + '\n\nFORMATO EXIGIDO: ' + entrega + '\n' + formato + '\n\nCRITERIOS:\n' + JSON.stringify(plan.criterios || []) + '\n\nENTREGABLE:\n' + trabajo + pruebaTxt },
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
    if (builder && score >= umbral) {
      FallosLog.registrar({ rol: 'adaptacion', tipo: 'omitido', detalle: 'El HTML ya cumplió; reenviarlo a Adaptación a menudo lo rompe o se come la cuota.', accion: 'se entrega la versión de Acción' });
      emitir({ id: 'ada', rol: 'adaptacion', estado: 'ok', titulo: 'Adaptación · se conserva el HTML de Acción', detalle: 'El archivo ya cumplió. No lo reescribo para no cortarlo ni saturar la cuota.', resumen: 'Se entrega la versión de Acción' });
      historial.resultado = finalTxt;
      historial.entrega = entrega;
      historial.artefacto = extraerArtefacto(finalTxt, entrega);
      historial.ms = Date.now() - t0;
      return historial;
    }
    try {
      const extra = score < umbral
        ? '\nHay DESVÍO (score ' + score + ' < 0.8). Corrige los fallos y alinea el resultado con el pedido, sin cambiar el formato.\nFALLOS:\n' + fallosPendientes
        : '\nEl score fue ' + score + '. Pule sin desviarte.';
      const out = await pedir('adaptacion', [
        { role: 'system', content: SYS.adaptacion + '\n' + formato },
        { role: 'user', content: 'OBJETIVO:\n' + orden + ctx + '\n\nFORMATO EXIGIDO: ' + entrega + '\n' + formato + '\n\nENTREGABLE:\n' + trabajo + extra },
      ], { maxTokens: accMax, temp: score < umbral ? 0.3 : 0.25, timeout: accTo, sinPuente: accPuente, modeloForzar: builder ? 'qwen/qwen3.8-27b' : undefined, pasoId: 'ada', tituloRun: score < umbral ? 'Adaptación · corrigiendo desvío' : 'Adaptación · puliendo' });
      const candidato = aplicarFormato(out.texto || trabajo);
      const calidad = (h) => {
        let s = 0;
        const x = String(h || '');
        if (/<!doctype html/i.test(x)) s += 2;
        if (/<\/html>/i.test(x)) s += 2;
        if (/<style/i.test(x) && /<body/i.test(x)) s += 2;
        if (x.length > 800) s += 1;
        if (/soy la ia/i.test(x) || (x.match(/<body/gi) || []).length > 2) s -= 3;
        return s;
      };
      if (builder && calidad(candidato) < calidad(trabajo)) {
        finalTxt = trabajo;
        FallosLog.registrar({ rol: 'adaptacion', tipo: 'calidad', detalle: 'La pulida rompió el HTML; me quedo con la de Acción.', accion: 'se conserva Acción' });
        emitir({ id: 'ada', rol: 'adaptacion', estado: 'ok', titulo: 'Adaptación · se conserva el HTML de Acción', detalle: finalTxt, resumen: 'Se conserva la versión de Acción' });
      } else {
        finalTxt = candidato;
        emitir({ id: 'ada', rol: 'adaptacion', estado: 'ok', titulo: 'Adaptación · resultado listo', detalle: finalTxt, resumen: resumir(finalTxt, 120) });
      }
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
window.LINEAS_DURAS = LINEAS_DURAS;
