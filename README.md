# PERFORMANCE

Tracker personal de hábitos, gimnasio, estudio (MoureDev) y devocional (Kairos), construido como PWA instalable y offline. React + TypeScript + Vite + Tailwind, con persistencia local en IndexedDB (Dexie) — sin backend.

## Correr en local

```bash
npm install
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
  lib/         helpers puros (fechas, Epley 1RM, rachas, proyección de peso, ciclo A→B→C)
  ui/          primitivas visuales (Card, Tabs, Sheet, Ring, gráficas SVG a mano)
  layout/      shell responsive (sidebar en escritorio, nav inferior en móvil)
  features/    un directorio por módulo (hoy, entreno, habitos, datos, horario, kairos, mouredev, perfil)
```

## Datos

Los datos de ejemplo (rutina, hábitos, MoureDev, peso) vienen sembrados desde el Excel original. Desde **Perfil** podés:

- Exportar/importar un backup completo en `.json`.
- Reimportar el Excel original (`.xlsx`) para volver a sembrar el historial de series, pesos y semanas de MoureDev.

Todo vive en el navegador (IndexedDB); no hay servidor ni cuenta.
