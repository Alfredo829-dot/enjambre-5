# Enjambre 5

Cinco agentes de IA coordinados, pensado para usarse en el celular.

## Cómo se usa

1. Abre el sitio en el teléfono y escribe tu PIN de 6 números (el mismo de Craft Web). Solo se pide una vez en ese aparato.
2. **Encargo:** escribes una orden. El Arquitecto planea, el Ejecutor produce, el Crítico revisa (hasta 3 rondas), el Expansor pule y el Controlador te entrega el resultado. Si sale una app HTML, ves una vista previa y puedes copiarla o descargarla.
3. **Grupo:** un chat tipo WhatsApp. Cada agente responde con su nombre y su rol. Puedes mencionar a uno o a varios con `@Arquitecto`, `@Ejecutor`, `@Crítico`, `@Expansor`, `@Controlador` o `@todos`. Si la charla ya maduró, el botón ▶ la convierte en un Encargo completo.

Todo el historial se guarda en el teléfono.

## Modelos (todos gratis)

- Arquitecto: `openai/gpt-oss-120b`
- Ejecutor: `qwen/qwen3.8-27b`
- Crítico: `openai/gpt-oss-120b`
- Expansor: `allam-2-7b` (si viene flojo, `openai/gpt-oss-20b`)
- Controlador: `openai/gpt-oss-20b`

Corren en Groq. Si el plan gratis se satura, hay reintentos, rotación de llaves y Pollinations como respaldo (sin llave). Las llaves van cifradas en el repo; nunca en texto claro. Los filtros de seguridad de los modelos se respetan.
