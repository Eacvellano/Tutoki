# Tutoki

Plataforma que pregunta en lugar de responder: el docente sube su material, Tutoki genera retos de pensamiento crítico con IA y los estudiantes los resuelven desde su dispositivo o en el proyector del aula.

Sin dependencias de instalación: Node.js 22.5+ (usa `node:sqlite` integrado).

## Iniciar

```powershell
node server.cjs
```

Abre <http://localhost:4173>. Variables opcionales en `.env` o en el entorno:

| Variable | Uso |
|---|---|
| `GEMINI_API_KEY` | Clave gratuita de <https://aistudio.google.com/apikey>. Sin ella, la app funciona con contenido de ejemplo. |
| `GEMINI_MODEL` | Por defecto `gemini-flash-latest`. |
| `TUTOKI_PORT` / `TUTOKI_HOST` | Puerto (4173) e interfaz (`127.0.0.1`; usa `0.0.0.0` para abrirlo en la red del aula). |
| `TUTOKI_DB` | Archivo de la base de datos (por defecto `data/tutoki.db`). |
| `TUTOKI_SECURE_COOKIE=1` | Actívalo al publicar con HTTPS. |

## Cómo funciona

- **Docente:** crea una cuenta, crea uno o varios grupos (cada uno con su código), sube un PDF, imagen o texto, elige el tipo de reto, revisa y edita lo que generó la IA, y publica. Revisa cada entrega con una rúbrica y deja una pregunta de seguimiento.
- **Estudiante:** entra con el código del grupo y su alias. La primera vez recibe un PIN de 4 dígitos para volver a entrar; el docente puede verlo o cambiarlo.
- **Modo aula:** cualquier actividad se puede proyectar y resolver con toda la clase; se guarda como entrega del grupo.
- **IA coherente:** en Duelo, Defiéndelo, Reto comunidad, Primero tú y Detective, la IA responde a lo que el estudiante escribió. Si escribe algo sin sentido, la IA lo dice y pide reintentar. La IA conversa en vivo solo desde 4.º de primaria.
- **Privacidad:** la clave de IA y la base de datos solo viven en el servidor. A Gemini se envían el material y las respuestas, nunca nombres ni alias. En el nivel gratuito, Google puede usar esos datos para mejorar sus productos.

## Estructura

- `server.cjs` + `server/` — HTTP, sesiones (cookie HttpOnly), SQLite y rutas `/api/*`.
- `ai/` — cliente de Gemini, esquemas de salida y prompts.
- `app/` — pantallas (público, docente, asistente de creación, revisión, estudiante) y router.
- `games/` — motor de actividades y las cinco actividades.

## Pruebas

```powershell
node --test               # IA, esquemas y API completa con base de datos en memoria
node tests/e2e/e2e.cjs    # flujo completo en Chrome headless (docente → estudiante → revisión)
```

Las animaciones Lottie se regeneran con `node assets/lottie/make-lottie.cjs`.
