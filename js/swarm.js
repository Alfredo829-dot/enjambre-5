const SYS = {
  estratega: `Eres el Estratega del Enjambre 5. Antes de planear, entiendes bien lo que quiere Alfredo, eliges el camino más rápido y barato, y dejas un plan concreto para el Ejecutor.

Modo Encargo (este es tu modo ahora): no haces preguntas. Si falta algo esencial, asumes defaults sensatos y los declaras en "supuestos". No pides permiso ni confirmación.

El campo "entrega" es obligatorio y debe coincidir con lo que se va a entregar de verdad:
- "texto": haiku, poema, copy, lista, plan, prompt, carta, nombres, mensajes. El resultado es texto plano (markdown permitido). NUNCA una página ni una app.
- "html": solo si pide una app web, una página o un HTML.
- "python": solo si pide un script de Python.

No usas relleno ni saludos. No evades las salvaguardas del modelo.
Respondes SOLO con JSON válido:
{"objetivo":"...","supuestos":["..."],"camino":"por qué este es el camino más rápido y barato","tipo":"web|codigo|plan|prompt|otro","entrega":"html|python|texto","pasos":["..."],"criterios":["..."],"notas":"..."}
Textos en español mexicano. Sé concreto y breve.`,

  ejecutor: `Eres el Ejecutor del Enjambre 5. Tomas el plan y produces el entregable completo, listo para usar, en el FORMATO OBLIGATORIO que se te indica.
Sin relleno, sin pedir permiso, sin disculpas. No evades las salvaguardas del modelo.
Reglas de formato (obedécelas al pie de la letra):
- Si la entrega es html: un HTML completo, autónomo, móvil, en un bloque \`\`\`html. Sin librerías de pago. CSS incluido.
- Si la entrega es python: un script completo en \`\`\`python, sin dependencias externas salvo la biblioteca estándar.
- Si la entrega es texto: SOLO el texto pedido (markdown permitido). NUNCA lo envuelvas en HTML, CSS, <!doctype> ni en una app o página. No inventes una interfaz para "presentarlo".
UI y copy en español mexicano cuando el producto sea para Alfredo o sus clientes.`,

  critico: `Eres el Analista Crítico del Enjambre 5. Tu única métrica es encontrar fallos respecto al objetivo y al FORMATO exigido. No suavices. No elogies.
No evades las salvaguardas del modelo. Respondes SOLO con JSON válido:
{"veredicto":"PASS" o "FAIL","fallos":["descripción exacta y accionable"],"orden":"rehecho inmediato: ... o ok"}
Reglas de veredicto:
- FAIL si el formato no coincide (ejemplo: entregaron HTML o una app cuando se pedía texto; o texto cuando se pedía HTML).
- FAIL si hay errores, está incompleto, no cumple los criterios o es mediocre a nivel estructural PARA ESE FORMATO.
- Si el formato es texto, un haiku, plan, copy o lista que cumple el pedido es PASS. No pidas interfaz, CSS, botones, localStorage ni "usabilidad de app".
- Si el formato es html, ahí sí juzga que sea una página/app usable y completa.
PASS solo si cumple el objetivo Y el formato. Máximo 6 fallos. Español mexicano en las descripciones.`,

  expansor: `Eres el Expansor del Enjambre 5. Tomas el entregable que ya pasó control de calidad y le añades pulido y 1 a 3 extras útiles que no rompan el objetivo NI el FORMATO OBLIGATORIO.
- Si es HTML: mejora la experiencia móvil y entrega el HTML completo en \`\`\`html.
- Si es Python: mejoras concretas con el archivo completo en \`\`\`python.
- Si es texto: pule el wording o añade un extra breve en el mismo texto. Sigue siendo texto plano o markdown. NUNCA lo conviertas en una página, app, HTML o CSS. NUNCA lo envuelvas en <!doctype> ni en una interfaz para "presentarlo".
Sin relleno. No evades las salvaguardas. Español mexicano en la UI/copy.`,

  controlador: `Eres el Controlador del Enjambre 5. Conservas el objetivo original de Alfredo y el FORMATO OBLIGATORIO.
Entregas SOLO el resultado final, conciso y listo para usar. Cero relato de cómo discutieron los agentes. Cero relleno.
- Si el formato es html: el documento completo en \`\`\`html. Encima, 2 o 3 líneas de resumen como máximo.
- Si el formato es python: el script completo en \`\`\`python, con un resumen breve si hace falta.
- Si el formato es texto: entrega SOLO el texto final (markdown permitido). NUNCA lo envuelvas en HTML, CSS, una app o una página de presentación. No agregues un marco visual.
Español mexicano. No evades las salvaguardas del modelo.`,
};

const Swarm = {
  async correr(orden, { onPaso, signal, contexto } = {}) {
    const t0 = Date.now();
    const historial = { orden, veredictos: [], rondas: 0, pasos: [], resultado: '', artefacto: null, error: null, modelos: {}, entrega: 'texto' };
    const emitir = (paso) => {
      const i = historial.pasos.findIndex(x => x.id === paso.id);
      if (i >= 0) historial.pasos[i] = paso;
      else historial.pasos.push(paso);
      if (onPaso) onPaso(paso, historial);
    };

    const pedir = async (rol, mensajes, extra = {}) => {
      const out = await AI.completarConRespaldo({
        rol,
        mensajes,
        maxTokens: extra.maxTokens ?? 1400,
        temp: extra.temp ?? 0.3,
        signal,
      });
      historial.modelos[rol] = out.modelo + (out.via === 'pollinations' ? ' (respaldo)' : '');
      return out;
    };

    const ctx = contexto ? `\n\nContexto del grupo:\n${contexto}` : '';

    // 1. Estratega
    emitir({ id: 'est', rol: 'estratega', estado: 'run', titulo: 'Estratega · entendiendo y planeando', detalle: '' });
    let planTxt, plan, entrega;
    try {
      const out = await pedir('estratega', [
        { role: 'system', content: SYS.estratega },
        { role: 'user', content: 'ENCARGO:\n' + orden + ctx },
      ], { maxTokens: 900, temp: 0.2 });
      planTxt = out.texto;
      plan = extraerJSON(planTxt) || { objetivo: orden, tipo: 'otro', entrega: 'texto', pasos: [], criterios: [], supuestos: [], camino: '', notas: planTxt };
      entrega = entregaDe(plan, orden);
      plan.entrega = entrega;
      historial.entrega = entrega;
      const resumenEst = resumir((plan.camino ? plan.camino + ' · ' : '') + (plan.objetivo || planTxt), 120);
      emitir({ id: 'est', rol: 'estratega', estado: 'ok', titulo: 'Estratega · plan listo', detalle: planTxt, resumen: resumenEst });
    } catch (e) {
      emitir({ id: 'est', rol: 'estratega', estado: 'fail', titulo: 'Estratega · no pudo planear', detalle: e.message, resumen: e.message });
      historial.error = e.message;
      return historial;
    }

    const formato = reglasEntrega(entrega);
    const planCompacto = JSON.stringify({
      objetivo: plan.objetivo,
      supuestos: plan.supuestos,
      camino: plan.camino,
      tipo: plan.tipo,
      entrega,
      pasos: plan.pasos,
      criterios: plan.criterios,
      notas: plan.notas,
    });

    const aplicarFormato = (txt) => (entrega === 'texto' ? forzarTextoPlano(txt) : txt);

    // 2-3. Ejecutor + Crítico, hasta 3 rondas
    let trabajo = '';
    let fallosPendientes = '';
    let veredicto = 'FAIL';
    const maxRondas = 3;
    for (let r = 1; r <= maxRondas; r++) {
      historial.rondas = r;
      const eid = 'eje' + r;
      emitir({
        id: eid,
        rol: 'ejecutor',
        estado: 'run',
        titulo: r === 1 ? 'Ejecutor · produciendo' : 'Ejecutor · rehecho ronda ' + r,
        detalle: '',
        ronda: r,
      });
      try {
        const msgs = [
          { role: 'system', content: SYS.ejecutor + '\n' + formato },
          { role: 'user', content: 'OBJETIVO ORIGINAL:\n' + orden + ctx + '\n\nPLAN DEL ESTRATEGA:\n' + planCompacto + '\n\n' + formato },
        ];
        if (r > 1) {
          msgs.push({
            role: 'user',
            content: 'REHECHO INMEDIATO. Corrige exactamente estos fallos y entrega la versión completa, no un parche suelto. Respeta el formato obligatorio (' + entrega + '):\n' + fallosPendientes,
          });
        }
        const out = await pedir('ejecutor', msgs, { maxTokens: 3500, temp: 0.3 });
        trabajo = aplicarFormato(out.texto);
        emitir({
          id: eid,
          rol: 'ejecutor',
          estado: 'ok',
          titulo: r === 1 ? 'Ejecutor · entregable listo' : 'Ejecutor · ronda ' + r + ' lista',
          detalle: trabajo,
          resumen: resumir(trabajo, 120),
          ronda: r,
        });
      } catch (e) {
        emitir({ id: eid, rol: 'ejecutor', estado: 'fail', titulo: 'Ejecutor · falló', detalle: e.message, resumen: e.message, ronda: r });
        historial.error = e.message;
        break;
      }

      const cid = 'cri' + r;
      emitir({ id: cid, rol: 'critico', estado: 'run', titulo: 'Crítico · revisando ronda ' + r, detalle: '', ronda: r });
      try {
        const out = await pedir('critico', [
          { role: 'system', content: SYS.critico + '\n' + formato },
          { role: 'user', content: 'OBJETIVO:\n' + orden + '\n\nFORMATO EXIGIDO: ' + entrega + '\n' + formato + '\n\nCRITERIOS:\n' + JSON.stringify(plan.criterios || []) + '\n\nENTREGABLE:\n' + trabajo },
        ], { maxTokens: 800, temp: 0.15 });
        const j = extraerJSON(out.texto) || {};
        const v = String(j.veredicto || '').toUpperCase() === 'PASS' ? 'PASS' : 'FAIL';
        veredicto = v;
        historial.veredictos.push({ ronda: r, veredicto: v, fallos: j.fallos || [], raw: out.texto });
        const fallos = (j.fallos || []).filter(Boolean);
        fallosPendientes = fallos.map((f, i) => (i + 1) + '. ' + f).join('\n') || out.texto;
        emitir({
          id: cid,
          rol: 'critico',
          estado: v === 'PASS' ? 'ok' : 'fail',
          titulo: v === 'PASS' ? 'Crítico · PASS' : 'Crítico · FAIL · ronda ' + r,
          detalle: out.texto,
          resumen: v === 'PASS' ? 'Sin fallos bloqueantes' : resumir((fallos[0] || 'Hay que rehacer'), 120),
          ronda: r,
          veredicto: v,
        });
        if (v === 'PASS') break;
      } catch (e) {
        // Si el crítico no responde, no bloqueamos el flujo: seguimos con lo que hay.
        veredicto = 'PASS';
        historial.veredictos.push({ ronda: r, veredicto: 'PASS', fallos: [], raw: 'crítico no disponible: ' + e.message, omitido: true });
        emitir({
          id: cid,
          rol: 'critico',
          estado: 'ok',
          titulo: 'Crítico · no respondió; seguimos',
          detalle: e.message,
          resumen: 'Se continúa con el entregable actual',
          ronda: r,
        });
        break;
      }
    }

    if (!trabajo) {
      historial.error = historial.error || 'El Ejecutor no produjo un entregable';
      return historial;
    }
    const trabajoTxt = typeof trabajo === 'string' ? trabajo : String(trabajo);

    // 4. Expansor
    emitir({ id: 'exp', rol: 'expansor', estado: 'run', titulo: 'Expansor · puliendo', detalle: '' });
    let pulido = trabajoTxt;
    try {
      const out = await pedir('expansor', [
        { role: 'system', content: SYS.expansor + '\n' + formato },
        { role: 'user', content: 'OBJETIVO:\n' + orden + '\n\nFORMATO EXIGIDO: ' + entrega + '\n' + formato + '\n\nENTREGABLE APROBADO (o última versión):\n' + trabajoTxt },
      ], { maxTokens: 3500, temp: 0.55 });
      pulido = aplicarFormato(out.texto || trabajoTxt);
      emitir({ id: 'exp', rol: 'expansor', estado: 'ok', titulo: 'Expansor · versión pulida', detalle: pulido, resumen: resumir(pulido, 120) });
    } catch (e) {
      emitir({ id: 'exp', rol: 'expansor', estado: 'ok', titulo: 'Expansor · se omite', detalle: e.message, resumen: 'Seguimos con la versión del Ejecutor' });
    }

    // 5. Controlador
    emitir({ id: 'con', rol: 'controlador', estado: 'run', titulo: 'Controlador · empaquetando', detalle: '' });
    try {
      const out = await pedir('controlador', [
        { role: 'system', content: SYS.controlador + '\n' + formato },
        { role: 'user', content: 'OBJETIVO ORIGINAL DE ALFREDO:\n' + orden + ctx + '\n\nFORMATO EXIGIDO: ' + entrega + '\n' + formato + '\n\nMATERIAL FINAL DEL ENJAMBRE:\n' + pulido },
      ], { maxTokens: 3500, temp: 0.25 });
      const finalTxt = aplicarFormato(out.texto);
      historial.resultado = finalTxt;
      historial.entrega = entrega;
      historial.artefacto = extraerArtefacto(finalTxt, entrega);
      emitir({ id: 'con', rol: 'controlador', estado: 'ok', titulo: 'Controlador · resultado listo', detalle: finalTxt, resumen: resumir(finalTxt, 120) });
    } catch (e) {
      const finalTxt = aplicarFormato(pulido);
      historial.resultado = finalTxt;
      historial.entrega = entrega;
      historial.artefacto = extraerArtefacto(finalTxt, entrega);
      historial.error = historial.error || e.message;
      emitir({ id: 'con', rol: 'controlador', estado: 'ok', titulo: 'Controlador · entrega de respaldo', detalle: finalTxt, resumen: 'Se entrega la versión pulida' });
    }

    historial.ms = Date.now() - t0;
    return historial;
  },
};

window.Swarm = Swarm;
window.SYS_ENJAMBRE = SYS;
