# PERFORMANCE

Tu horario, entreno, hábitos, enfoque y lectura en un solo lugar. Es una PWA instalable que funciona sin conexión: todo se guarda primero en tu aparato (IndexedDB) y se sincroniza con tu cuenta de Supabase cuando hay internet, así que ves lo mismo en el celular y en el computador.

React 19 · TypeScript · Vite · Tailwind v4 · Dexie · Supabase · desplegada en Vercel.

## Qué incluye

| Pantalla | Para qué |
| --- | --- |
| **Hoy** | Bloque del horario, anillos del día, prioridades y cierre del día, hábitos, resumen semanal (domingo y lunes), ánimo, descubrimientos sobre tus datos |
| **Entreno** | Ciclo A → B → C, registro de series, descanso automático (más corto en aislamiento), sugerencia de peso (doble progresión), aviso de estancamiento y de cuándo subir, récords, Modo Gimnasio |
| **Hábitos** | Hábitos editables, rutina matutina guiada, rachas y consistencia del mes |
| **Datos** | Peso con meta y proyección, medidas, sueño, 1RM, volumen, MoureDev y resumen semanal |
| **Horario** | Semana editable, avisos de cada bloque |
| **Focus** | Bloques con cronómetro (pantalla completa y ventana flotante), música de YouTube por ánimo, letra sincronizada |
| **Oración** | Biblia Reina-Valera 1909, plan de lectura, versículos guardados y resaltados, repaso para memorizar, lectura en voz alta |
| **MoureDev** | Ruta de estudio por semanas; los bloques de Focus suman horas solos |
| **Perfil** | Ajustes, rutina editable, apariencia, copias de seguridad |

## Puesta en marcha

```bash
npm install
```

### 1. Supabase (login por código y sincronización)

La app pide un código de un solo uso por correo antes de mostrar nada. Necesitas un proyecto de Supabase (el plan gratis alcanza):

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **Authentication → Providers → Email**, activa el código por correo (OTP).
3. En **SQL Editor**, ejecuta en orden los archivos de [`supabase/migrations`](supabase/migrations) (`0000` a `0006`). Crean las tablas y las reglas de acceso: cada usuario solo ve sus propias filas.
4. En **Settings → API**, copia la **Project URL** y la **anon public key**.
5. Crea `.env.local` a partir de `.env.example` y pega esos dos valores:

```bash
cp .env.example .env.local
```

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

`.env.local` no se sube al repositorio. Sin él, la app muestra "Falta conectar Supabase" en vez del login.

> Si agregas una migración nueva, ejecútala también en el SQL Editor: sin sus tablas, los cambios nuevos quedan "por subir".

### 2. Correr

```bash
npm run dev
```

Abre `http://localhost:5173`. En el celular, "Agregar a pantalla de inicio" la instala como app.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compila (`tsc -b && vite build`) |
| `npm run preview` | Sirve la compilación |
| `npm test` | Pruebas con Vitest |
| `npm run lint` | Revisa el código con oxlint |
| `npm run icons` | Regenera los iconos PWA |

Antes de publicar un cambio: `npx tsc -b`, `npm run lint`, `npm test` y `npm run build` deben pasar.

## Cómo está organizado

```
src/
  data/        rutina, horario, hábitos, ruta MoureDev, Biblia (RVR1909)
  db/          esquema local (Dexie), sincronización con Supabase, cola de cambios
  lib/         lógica pura: fechas, ciclo, progresión, rachas, récords, letras, repaso…
  hooks/       consultas en vivo y estado compartido
  ui/          componentes visuales (tarjetas, hojas, gráficas SVG…)
  layout/      estructura de la app (barra superior en escritorio, inferior en móvil)
  features/    una carpeta por pantalla
public/        landing, Biblia, iconos, fuentes de la landing
supabase/      migraciones SQL
```

## Datos y copias de seguridad

- **Dónde viven:** primero en tu aparato; con sesión iniciada se sincronizan con tu cuenta. Sin conexión todo sigue funcionando y los cambios se envían después.
- **Configuración sincronizada:** rutina, horario, apariencia, plan de lectura, resaltados, repaso de versículos y ánimo viajan con tu cuenta. Las listas de música y las preferencias de voz se quedan en cada aparato.
- **Copias:** en **Perfil → Cuenta y datos** puedes exportar e importar un respaldo completo en `.json`, e importar el Excel original (`.xlsx`).

## Cosas que dependen del navegador

- **Lectura en voz alta:** usa las voces en español del aparato; en Android y en Edge suenan mejor.
- **Descanso y bloques en segundo plano:** el celular puede dormir la app; al volver, el tiempo ya está al día. Para avisos con la app cerrada haría falta un servidor de notificaciones.
- **Letras:** se buscan en [LRCLIB](https://lrclib.net) con el título y el artista de la canción.
