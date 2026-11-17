# Enjambre 7

Siete agentes de IA coordinados, pensado para usarse en el celular. Arriba ves al equipo (medio cuerpo) y abajo el chat o el encargo. La dirección del sitio se mantiene.

## Cómo se usa

1. Abre el sitio en el teléfono y escribe tu PIN de 6 números (el mismo de Craft Web). Solo se pide una vez en ese aparato.
2. **Encargo:** escribes una orden. La cadena es Percepción → Razonamiento → Supervisión → Acción → Feedback → Adaptación. Gestión de Fallos está activa todo el tiempo (tiempos de espera, reintentos, otra llave o Pollinations, y un registro visible).
   - Percepción entiende el pedido y el formato (`texto`, `sitio`, `pwa`, `html` o `python`).
   - Razonamiento arma el plan con pasos y una confianza de 0 a 1. `@Estratega` y `@Arquitecto` siguen apuntando aquí.
   - Supervisión valida el plan (pasos, confianza ≥ 0.5, seguridad). Si no se sostiene, lo bloquea con razones y no se ejecuta.
   - Acción produce el entregable en el formato acordado.
   - Feedback puntúa de 0 a 1; si queda bajo 0.8, Acción corrige, hasta 3 rondas.
   - Adaptación pule el resultado y, si hubo desvío, lo alinea con el pedido.
3. **Análisis profundo** (opcional): agrega una pasada extra de refinamiento en el plan y en el entregable. Tarda más y hace más llamadas. No es un “análisis ×5” automático.
4. **Grupo:** chat con los 7. Puedes mencionar a uno o a `@todos`. Los alias anteriores (`@Estratega`, `@Ejecutor`, `@Crítico`, `@Expansor`, `@Controlador`) siguen funcionando.
5. En Ajustes ves métricas por agente (llamadas, errores, latencia promedio, tokens, iteraciones de análisis) y puedes exportarlas a CSV.

Si el formato es texto (haiku, copy, plan), el resultado se queda en texto plano. Si es una app, se entrega HTML con vista previa.

## Modelos (todos gratis, repartidos en 3 llaves de Groq)

- Percepción: `openai/gpt-oss-20b`
- Razonamiento: `openai/gpt-oss-120b`
- Supervisión: `openai/gpt-oss-20b`
- Acción: `qwen/qwen3.8-27b`
- Feedback: `openai/gpt-oss-120b`
- Adaptación: `allam-2-7b` (si viene flojo, `openai/gpt-oss-20b`)
- Gestión de Fallos: orquestación (timeout, reintentos, respaldo) y, en el grupo, `openai/gpt-oss-20b`

Si Groq se satura hay reintentos, rotación de llaves y Pollinations como respaldo. Las llaves van cifradas en el repo; nunca en texto claro. Los filtros de seguridad de los modelos se respetan.

## Clow y Hermes (en la computadora de Alfredo)

Acción intenta primero **Clow** (OpenClaw en la caja) y Razonamiento intenta primero **Hermes**. Si no contestan en unos 20 s, o el puente no está publicado, el sitio usa Groq de respaldo. El secreto del puente va cifrado con el mismo PIN; la URL pública se descubre sola (sin el secreto). En la interfaz verás la etiqueta *Clow*, *Hermes* o *Groq (respaldo)*.


## Sitio web y App (PWA)

Si pides un sitio o una app, Acción entrega un HTML único, móvil y oscuro, con vista previa a pantalla completa, descarga `.html`, copia y, en PWA, un `.zip` (index, manifest, service worker e íconos). También puedes publicar en GitHub Pages o pulsar **Hacer APK**: el token de GitHub se cifra con tu PIN solo en el teléfono, se sube un repo con una cáscara Android (WebView) y un flujo de Actions arma un APK firmado (clave de sideload, no de Play Store) y lo deja en Releases. Tarda varios minutos. El enjambre solo frena en tres líneas duras: menores, delito dañino y hacerse pasar por alguien real para engañar.
