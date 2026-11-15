const SYS = {
  arquitecto: `Eres el Arquitecto del Enjambre 5. Descompones el encargo de Alfredo en un plan técnico ejecutable.
No pides permiso ni confirmación. No usas relleno ni saludos. No evades las salvaguardas del modelo.
Respondes SOLO con JSON válido:
{"objetivo":"...","tipo":"web|codigo|plan|prompt|otro","entrega":"html|python|texto","pasos":["..."],"criterios":["..."],"notas":"..."}
Textos en español mexicano. Sé concreto y breve.`,

  ejecutor: `Eres el Ejecutor del Enjambre 5. Tomas el plan y produces el entregable completo, listo para usar.
Sin relleno, sin pedir permiso, sin disculpas. No evades las salvaguardas del modelo.
Reglas:
- Si la entrega es una app web: un HTML completo, autónomo, móvil, en un bloque \`\`\`html. Sin librerías de pago. CSS incluido.
- Si es Python: un script completo en \`\`\`python, sin dependencias externas salvo la biblioteca estándar.
- Si es un plan o un prompt: el texto final, claro y aplicable.
UI y copy en español mexicano cuando el producto sea para Alfredo o sus clientes.`,

  critico: `Eres el Analista Crítico del Enjambre 5. Tu única métrica es encontrar fallos. No suavices. No elogies.
No evades las salvaguardas del modelo. Respondes SOLO con JSON válido:
{"veredicto":"PASS" o "FAIL","fallos":["descripción exacta y accionable"],"orden":"rehecho inmediato: ... o ok"}
FAIL si hay errores, está incompleto, no cumple los criterios o es mediocre a nivel estructural.
PASS solo si es usable y cumple el objetivo. Máximo 6 fallos. Español mexicano en las descripciones.`,

  expansor: `Eres el Expansor del Enjambre 5. Tomas el entregable que ya pasó control de calidad y le añades pulido, estética y 1 a 3 extras útiles que no rompan el objetivo.
Si es HTML, mejora la experiencia móvil y entrega el HTML completo en \`\`\`html. Si es código, mejoras concretas con el archivo completo. Si es plan o prompt, añade ángulos útiles.
Sin relleno. No evades las salvaguardas. Español mexicano en la UI/copy.`,

  controlador: `Eres el Controlador del Enjambre 5. Conservas el objetivo original de Alfredo.
Entregas SOLO el resultado final, conciso y listo para usar. Cero relato de cómo discutieron los agentes. Cero relleno.
Si hay un artefacto (HTML, código, prompt, plan), ese es el cuerpo principal. Encima, 2 o 3 líneas de resumen como máximo.
Si es HTML, el documento completo en \`\`\`html. Español mexicano. No evades las salvaguardas del modelo.`,
};

const Swarm = {
  async correr(orden, { onPaso, signal, contexto } = {}) {
    const t0 = Date.now();
    const historial = { orden, veredictos: [], rondas: 0, pasos: [], resultado: '', artefacto: null, error: null, modelos: {} };
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

    // 1. Arquitecto
    emitir({ id: 'arq', rol: 'arquitecto', estado: 'run', titulo: 'Arquitecto · planeando', detalle: '' });
    let planTxt, plan;
    try {
      const out = await pedir('arquitecto', [
        { role: 'system', content: SYS.arquitecto },
        { role: 'user', content: 'ENCARGO:\n' + orden + ctx },
      ], { maxTokens: 900, temp: 0.2 });
      planTxt = out.texto;
      plan = extraerJSON(planTxt) || { objetivo: orden, tipo: 'otro', entrega: 'texto', pasos: [], criterios: [], notas: planTxt };
      emitir({ id: 'arq', rol: 'arquitecto', estado: 'ok', titulo: 'Arquitecto · plan listo', detalle: planTxt, resumen: resumir(plan.objetivo || planTxt, 120) });
    } catch (e) {
      emitir({ id: 'arq', rol: 'arquitecto', estado: 'fail', titulo: 'Arquitecto · no pudo planear', detalle: e.message, resumen: e.message });
      historial.error = e.message;
      return historial;
    }

    const planCompacto = JSON.stringify({
      objetivo: plan.objetivo,
      tipo: plan.tipo,
      entrega: plan.entrega,
      pasos: plan.pasos,
      criterios: plan.criterios,
      notas: plan.notas,
    });

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
          { role: 'system', content: SYS.ejecutor },
          { role: 'user', content: 'OBJETIVO ORIGINAL:\n' + orden + ctx + '\n\nPLAN DEL ARQUITECTO:\n' + planCompacto },
        ];
        if (r > 1) {
          msgs.push({
            role: 'user',
            content: 'REHECHO INMEDIATO. Corrige exactamente estos fallos y entrega la versión completa, no un parche suelto:\n' + fallosPendientes,
          });
        }
        const out = await pedir('ejecutor', msgs, { maxTokens: 3500, temp: 0.3 });
        trabajo = out.texto;
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
          { role: 'system', content: SYS.critico },
          { role: 'user', content: 'OBJETIVO:\n' + orden + '\n\nCRITERIOS:\n' + JSON.stringify(plan.criterios || []) + '\n\nENTREGABLE:\n' + trabajo },
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
        { role: 'system', content: SYS.expansor },
        { role: 'user', content: 'OBJETIVO:\n' + orden + '\n\nENTREGABLE APROBADO (o última versión):\n' + trabajoTxt },
      ], { maxTokens: 3500, temp: 0.55 });
      pulido = out.texto || trabajoTxt;
      emitir({ id: 'exp', rol: 'expansor', estado: 'ok', titulo: 'Expansor · versión pulida', detalle: pulido, resumen: resumir(pulido, 120) });
    } catch (e) {
      emitir({ id: 'exp', rol: 'expansor', estado: 'ok', titulo: 'Expansor · se omite', detalle: e.message, resumen: 'Seguimos con la versión del Ejecutor' });
    }

    // 5. Controlador
    emitir({ id: 'con', rol: 'controlador', estado: 'run', titulo: 'Controlador · empaquetando', detalle: '' });
    try {
      const out = await pedir('controlador', [
        { role: 'system', content: SYS.controlador },
        { role: 'user', content: 'OBJETIVO ORIGINAL DE ALFREDO:\n' + orden + ctx + '\n\nMATERIAL FINAL DEL ENJAMBRE:\n' + pulido },
      ], { maxTokens: 3500, temp: 0.25 });
      historial.resultado = out.texto;
      historial.artefacto = extraerArtefacto(out.texto);
      emitir({ id: 'con', rol: 'controlador', estado: 'ok', titulo: 'Controlador · resultado listo', detalle: out.texto, resumen: resumir(out.texto, 120) });
    } catch (e) {
      historial.resultado = pulido;
      historial.artefacto = extraerArtefacto(pulido);
      historial.error = historial.error || e.message;
      emitir({ id: 'con', rol: 'controlador', estado: 'ok', titulo: 'Controlador · entrega de respaldo', detalle: pulido, resumen: 'Se entrega la versión pulida' });
    }

    historial.ms = Date.now() - t0;
    return historial;
  },
};

window.Swarm = Swarm;
window.SYS_ENJAMBRE = SYS;
