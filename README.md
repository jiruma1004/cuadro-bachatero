# Cuadro Bachatero · El arte de escuchar

Aplicación didáctica de musicalidad en bachata. Diseño móvil de fantasía RPG con latón, azul nocturno y un observatorio original. Referencia visual: el cuadro del profesor y la dirección artística de Aventura EPIK.

**Sitio:** https://jiruma1004.github.io/cuadro-bachatero/

## Uso

1. Toca el nombre de la canción para abrir la biblioteca o cargar MP3, WAV o M4A.
2. Reproduce y pulsa **Este golpe es el 1** al escuchar el comienzo del conteo.
3. En **Editar recorrido**, coloca el cursor en el primer pulso extra y pulsa **Extensión de 4 aquí**.
4. La extensión aparece en una columna vertical en la esquina superior izquierda: **1 abajo, 4 arriba**, siguiendo la fotografía. Se ilumina de abajo hacia arriba y después continúa el recorrido.

Una extensión son **cuatro pulsos**, no cuatro segundos: a 120 BPM dura dos segundos. Después del segundo ocho, continúa en el tercer grupo; después del último ocho, comienza la siguiente vuelta. No altera el conteo anterior ni estira/modifica el audio. Puedes añadir varias y eliminar cualquiera. No pueden superponerse ni salir de la rejilla.

Las extensiones se marcan manualmente. La app no las detecta automáticamente y no se han inventado extensiones para las canciones reales.

## Biblioteca

- Bachata Bachata: 158.75 s; estimación 154.0 BPM.
- Su veneno: 241.00 s; estimación 124.0 BPM.
- 100 x hora: 200.39 s; estimación 124.1 BPM.
- Propuesta indecente: 235.45 s; estimación 123.2 BPM.
- Imitadora: 235.96 s; estimación 126.0 BPM.
- Práctica sintética: 120 BPM, primer 1 en 1.00 s; extensión de 4 en 17.00 s; termina a 19.00 s y comienza la vuelta 2.

Las pistas musicales fueron aportadas por el usuario para esta biblioteca. Las estimaciones se obtuvieron con librosa y requieren revisión auditiva. El código no implica una licencia adicional de las grabaciones. La demo sintética permite probar el sistema independientemente de las canciones.

## Interfaz y almacenamiento

La pantalla principal muestra canción, cuadro, reproductor y dos acciones. Ajustes y edición avanzada están en paneles. Incluye velocidad 0.75×–1.25×, volumen, clic con Web Audio, taps visuales, bucle de ocho/bloque/selección, BPM manual, Tap tempo, fase, desfase, edición individual de pulsos, marcas y JSON.

Las correcciones se guardan automáticamente en IndexedDB **en ese navegador y dispositivo**. La web publicada no guarda las correcciones en GitHub ni las comparte con otros usuarios. Exporta JSON para respaldarlas y selecciona el mismo audio antes de importarlas. Borrar los datos del navegador elimina sus sesiones locales. El audio subido por cada visitante se almacena localmente y nunca se envía al servidor.

La vista anterior guardaba en `backend/data` o `BACHATA_DATA`; esos proyectos se conservan. Para recuperar correcciones antiguas, exporta el JSON mediante la API local e impórtalo sobre la canción correspondiente en esta versión.

## GitHub Pages y análisis

La versión publicada es completamente estática y no requiere Python en el teléfono. Las demos tienen archivos de pulsos preanalizados. Un archivo nuevo se decodifica con Web Audio y se analiza en un Web Worker, mediante una heurística de energía y autocorrelación con ajuste local de onsets. No equivale a librosa ni garantiza precisión: verifica el primer 1 y el tempo. M4A depende de los códecs del navegador. Archivos largos pueden requerir mucha memoria en un móvil.

El backend FastAPI/librosa permanece disponible como herramienta local de análisis más completa. **GitHub Pages no ejecuta este backend.**

La interfaz obtiene el tiempo de `HTMLAudioElement.currentTime` y usa búsqueda binaria. El clic se programa con el reloj de Web Audio; la latencia del dispositivo y los bucles de HTMLAudioElement pueden requerir ajuste. La voz hablada opcional no está incluida.

## Desarrollo

Node.js 24 recomendado, Python 3.12 para el backend opcional.

```bash
cd frontend
npm install
npm run dev
npm run build
npm test
```

También se incluye `pnpm-lock.yaml`; `pnpm install --frozen-lockfile` reproduce la resolución de dependencias. El directorio `frontend/dist` se puede servir con cualquier servidor estático.

Para usar localmente la entrega compilada con FastAPI:

```bash
# Ubuntu 24.04
sudo apt install python3 python3-venv python3-pip ffmpeg
./install.sh
./start.sh
```

```bash
# macOS Apple Silicon, con Homebrew instalado
brew install python@3.12 ffmpeg
python3.12 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements-lock.txt
./start.sh
```

Abre http://127.0.0.1:8000. El arranque reconoce también el entorno de esta entrega cuando sigue junto a su carpeta `work`. La instalación macOS está documentada, pero no se ha ejecutado en Mac.

## API local

- `POST /api/analyze`: multipart `file`, MP3/WAV/M4A, 100 MB, hasta 30 minutos.
- `POST /api/demo`: demo sintética con pulsos conocidos.
- `GET /api/projects`: sesiones locales antiguas y nuevas del backend.
- `GET /api/projects/{id}`: documento JSON.
- `PATCH /api/projects/{id}`: documento completo validado, incluidas extensiones.
- `GET /api/projects/{id}/audio`: audio WAV decodificado localmente.
- `GET /api/projects/{id}/export`: JSON descargable.
- `GET /api/health`: disponibilidad de FFmpeg.

Los identificadores de API son UUID hexadecimales; no se aceptan rutas arbitrarias. Guardado JSON atómico; diseñado para un usuario local. Datos en `backend/data`, configurable con `BACHATA_DATA`.

## Pruebas

```bash
.venv/bin/python -m pytest tests -q
cd frontend
npm test
```

Cobertura: 32 posiciones inequívocas, búsqueda ante pausa/salto, fase, rejilla manual, extensión tras segundo y cuarto ocho, múltiples extensiones, serialización, solapamiento, validación de archivos y análisis sintético. Además se comprueba la interfaz en navegador a 390 px, biblioteca, carga local, guardado y transición de extensión.

## Publicación

El contenido estático compilado se publica desde `docs/` en la rama `main`. Para actualizarlo:

```bash
cd frontend
npm run build
cd ..
python3 scripts/prepare_pages.py
# Revisar, hacer commit y push de fuente y docs/.
```

`docs/` incluye las demos y `.nojekyll`. Rutas relativas permiten publicar bajo `/cuadro-bachatero/`. No incluye entornos Python, `node_modules`, credenciales ni sesiones privadas del backend.

## Arte

`frontend/src/assets/observatory.webp`: ilustración original generada con ImageGen integrado, comprimida a WebP. El prompt está en `ART_DIRECTION.md`. Aventura EPIK se utilizó como referencia de paleta, jerarquía y ambiente; no se copiaron personajes ni logotipos.


## Revisión de sincronía (análisis 2)

El análisis original usaba ventanas con salto de 512 muestras a 22.05 kHz: el tempo global tenía valores discretos (por ejemplo, 123.046875 BPM). Ahora las demos utilizan salto de 128 muestras, autocorrelación en varios segmentos, interpolación del pico y una mediana de estimaciones. Los pulsos se vuelven a rastrear a esa resolución; no se convierten todas las canciones al mismo BPM. El intervalo de búsqueda de 95–190 BPM es una preferencia para bachata, no un detector universal; siguen disponibles medio/doble tiempo.

**El primer 1 musical no se identifica automáticamente.** La entrada de los bongós es una referencia pedagógica para que el profesor lo confirme; no todos sus golpes son un 1. Las demos musicales muestran «conteo estimado» hasta la calibración, y la demo sintética tiene un 1 conocido. Pulsa «Este golpe es el 1» en el instante que corresponde: ahora modifica tanto el desfase temporal como la fase del conteo. Antes de la entrada marcada, el cuadro espera. El botón de antes solo cambiaba el número y podía conservar una rejilla adelantada o atrasada.

Las sesiones de catálogo sin calibraciones reciben el nuevo análisis automáticamente y conservan sus marcas. Si ya ajustaste la fase, el desfase o los pulsos, se preservan; en Ajustes aparece «Usar el análisis actualizado» para aplicarlo explícitamente. No se han validado auditivamente los primeros unos de las cinco canciones.
