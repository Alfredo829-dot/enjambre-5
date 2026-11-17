# Enjambre 5

Cinco agentes de IA coordinados, pensado para usarse en el celular. Arriba ves al equipo (medio cuerpo) y abajo el chat o el encargo.

## Cómo se usa

1. Abre el sitio en el teléfono y escribe tu PIN de 6 números (el mismo de Craft Web). Solo se pide una vez en ese aparato.
2. **Encargo:** escribes una orden. El Estratega entiende lo que quieres, asume defaults si hace falta y elige el camino más rápido y barato; el Ejecutor produce, el Crítico revisa (hasta 3 rondas), el Expansor pule y el Controlador te entrega el resultado. Si sale una app HTML, ves una vista previa y puedes copiarla o descargarla.
3. **Grupo:** un chat tipo WhatsApp. Toca a un agente arriba para mencionarlo, o usa `@Estratega`, `@Ejecutor`, `@Crítico`, `@Expansor`, `@Controlador` o `@todos`. `@Arquitecto` sigue funcionando como alias del Estratega. En el grupo, el Estratega puede hacer 1 o 2 preguntas si falta algo esencial. Si la charla ya maduró, el botón ▶ la convierte en un Encargo completo.

Mientras un agente trabaja, su figura parpadea con un brillo de neón. Todo el historial se guarda en el teléfono.

## Modelos (todos gratis)

- Estratega: `openai/gpt-oss-120b`
- Ejecutor: `qwen/qwen3.8-27b`
- Crítico: `openai/gpt-oss-120b`
- Expansor: `allam-2-7b` (si viene flojo, `openai/gpt-oss-20b`)
- Controlador: `openai/gpt-oss-20b`

Corren en Groq. Si el plan gratis se satura, hay reintentos, rotación de llaves y Pollinations como respaldo (sin llave). Las llaves van cifradas en el repo; nunca en texto claro. Los filtros de seguridad de los modelos se respetan.
