# Agencia VD — Control de producción y pagos

Plataforma para registrar trabajos de edición (H, G, CBO), calcular pagos automáticamente por marca y tanda, y generar resúmenes semanales/mensuales listos para copiar. Multi-usuario: cada persona se registra con su email y ve únicamente sus propios datos.

## Stack

- React + TypeScript + Vite
- Tailwind CSS v4
- Supabase (Postgres + Auth) como backend
- React Router (HashRouter, compatible con cualquier hosting estático)

## Configuración local

1. `npm install`
2. Creá un proyecto en [supabase.com](https://supabase.com) (gratis).
3. En el **SQL Editor** de Supabase, corré el contenido de [`supabase/schema.sql`](supabase/schema.sql).
4. Copiá `.env.example` a `.env.local` y completá con los datos de tu proyecto (Settings → API):
   ```
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key-publica
   ```
5. `npm run dev`

## Despliegue en Vercel

1. Importá este repositorio en [vercel.com](https://vercel.com) (framework preset: Vite).
2. En **Project Settings → Environment Variables**, agregá `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. Deploy.

## Base de datos

El esquema (`supabase/schema.sql`) crea las tablas `brands`, `work_entries`, `rates`, `production_levels` y `app_settings`, todas con Row Level Security: cada usuario solo puede leer y escribir sus propias filas (`auth.uid() = user_id`). Al registrarse un usuario nuevo, un trigger siembra automáticamente sus tarifas, niveles de producción y marcas iniciales.
