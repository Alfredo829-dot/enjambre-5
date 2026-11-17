# Cáscara Android (WebView) de Enjambre 7

Plantilla mínima: un WebView carga `app/src/main/assets/index.html` (y el resto de la PWA si está en assets).
El flujo de GitHub Actions arma un APK firmado y lo publica como Release.

Los marcadores `__APPLICATION_ID__` y `__APP_NAME__` los sustituye el sitio al publicar.
