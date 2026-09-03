# PERFORMANCE

Tracker personal de hábitos, gimnasio, estudio (MoureDev) y devocional (Kairos), construido como PWA instalable y offline. React + TypeScript + Vite + Tailwind, con persistencia local en IndexedDB (Dexie). El único servicio externo es Supabase, usado solo para el login por código — todos los datos de la app siguen viviendo en el navegador.

## Correr en local

```bash
npm install
```

### 1. Configurar el login (Supabase)

La app pide iniciar sesión con un código de un solo uso por email antes de mostrar cualquier pantalla. Necesita un proyecto de Supabase:

1. Creá una cuenta gratis en [supabase.com](https://supabase.com) y un proyecto nuevo.
2. En **Authentication → Providers → Email**, activá "Email OTP" (o dejá el magic link/OTP por defecto — Supabase envía un código de 6 dígitos igual).
3. En **Authentication → Settings**, revisá el rate limit de emails salientes (el plan gratis limita cuántos códigos por hora podés pedir; para uso personal alcanza de sobra).
4. En **Settings → API**, copiá la **Project URL** y la **anon public key**.
5. Copiá `.env.example` a `.env.local` y pegá esos dos valores:

```bash
cp .env.example .env.local
```

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

`.env.local` nunca se sube al repo (está en `.gitignore`). Sin este archivo, la app muestra una pantalla de "Falta conectar Supabase" en vez del login.

### 2. Correr

```bash
npm run dev
```

Abrí `http://localhost:5173`. En el celular, "Agregar a pantalla de inicio" la instala como app.

## Scripts

- `npm run dev` — servidor de desarrollo
- `npm run build` — build de producción (`tsc -b && vite build`)
- `npm run preview` — sirve el build de producción
- `npm test` — corre los tests con Vitest
- `npm run icons` — regenera los íconos PWA (`scripts/generate-icons.mjs`)

## Estructura

```
src/
  data/        rutinas, horario, hábitos, ruta MoureDev, biblia (RVR1909)
  db/          esquema Dexie + seed inicial + queries
  lib/         helpers puros (fechas, Epley 1RM, rachas, proyección de peso, ciclo A→B→C, unidades)
  ui/          primitivas visuales (Card, Tabs, Sheet, Ring, gráficas SVG a mano)
  layout/      shell responsive (sidebar en escritorio, nav inferior en móvil)
  features/
    auth/      login por código (email OTP vía Supabase)
    hoy/ entreno/ habitos/ datos/ horario/ kairos/ mouredev/ perfil/
```

## Datos

Los datos de ejemplo (rutina, hábitos, MoureDev, peso) vienen sembrados desde el Excel original. Desde **Perfil** podés:

- Exportar/importar un backup completo en `.json`.
- Reimportar el Excel original (`.xlsx`) para volver a sembrar el historial de series, pesos y semanas de MoureDev.

Todo el contenido de la app (rutina, hábitos, peso, biblia, notas) vive en el navegador (IndexedDB) — Supabase solo identifica quién sos, no guarda ni sincroniza estos datos.
