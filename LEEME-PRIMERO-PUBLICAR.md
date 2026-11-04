# JumperNET — nueva portada premium + panel original

## Cómo queda

- La portada está hecha directamente en React, sin iframe.
- Inicio de sesión y creación de cuenta: al final de la MISMA página.
- Los botones de la portada desplazan la página al acceso.
- Tras iniciar sesión, el panel ORIGINAL de red se muestra automáticamente y se mantienen Nodos, Cuenta, Descargas, Tarifas, Diseñador y administración.
- El acceso utiliza la API HTTPS existente de `https://jumpernet.duckdns.org`. Si esa API no responde, el inicio de sesión no puede funcionar.

## Publicar en GitHub Pages

1. Extrae el ZIP.
2. Entra en la carpeta `jumperNET-mejorado` (NO subas la carpeta contenedora como subdirectorio).
3. Copia TODO su contenido a la raíz de `Y0selin/jumperNET` conservando la estructura `.github/workflows/pages.yml`, `web/`, `servidor/`, etc.
4. En tu repositorio GitHub ve a Settings > Pages y en **Build and deployment > Source** selecciona **GitHub Actions**.
5. Envía los cambios a `main` y espera a que termine el workflow **Desplegar web en GitHub Pages** en Actions.
6. Visita https://y0selin.github.io/jumperNET/ y recarga con Ctrl+F5 si ves una versión almacenada.

**IMPORTANTE:** NO selecciones Deploy from a branch (`main / root`) en Pages: en este repositorio la página React se compila desde `web/` mediante GitHub Actions. La raíz contiene el `index.html` histórico y no es la app premium.

## Probar en Windows con Node.js instalado

```powershell
cd web
npm ci
npm run dev
```

Después visita la URL local que indique Vite (habitualmente http://localhost:5173/).

Para probar compilación:

```powershell
npm run build
```

Los componentes existentes de `Red.jsx`, `Nodos.jsx`, `Cuenta.jsx` y autenticación no se han reemplazado por simulaciones. El diagrama de la portada sí es una representación ilustrativa.
