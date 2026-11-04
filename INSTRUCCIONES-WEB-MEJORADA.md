# JumperNET — versión integrada

Esta versión conserva el proyecto completo original (API, Docker, scripts, documentación, panel React y autenticación) y añade la experiencia visual interactiva en `web/public/experiencia/`.

## Qué cambia
- `web/src/components/Experiencia.jsx`: portada visual integrada con React.
- `web/src/App.jsx`: la pantalla Inicio utiliza la nueva experiencia.
- `web/src/styles/base.css`: barra de acciones y diseño adaptable.
- `web/public/experiencia/`: recursos originales de la web visual y un puente de navegación.

## Publicar en GitHub
1. Descomprime el ZIP. Entra en la carpeta `jumperNET-mejorado`.
2. Sube **el contenido de esa carpeta** a la raíz del repositorio `Y0selin/jumperNET`, conservando carpetas y archivos.
3. Confirma los cambios en la rama `main`.
4. En GitHub, abre **Actions** y espera a que termine el workflow `Desplegar web en GitHub Pages`.
5. Abre `https://y0selin.github.io/jumperNET/` y fuerza recarga con Ctrl+F5.

## Probar antes de publicar
```bash
cd web
npm ci
npm run build
npm run dev
```

## Inicio de sesión real
El registro y login siguen usando los endpoints `/register` y `/login` de la API definida en `web/src/lib/api.js` (`https://jumpernet.duckdns.org`). **GitHub Pages solo aloja el frontend**, no la API. Para acceder de verdad, el backend debe estar funcionando, con HTTPS y CORS permitiendo el origen de GitHub Pages. No se ha creado un login ficticio ni se han guardado contraseñas en la web estática.

## Importante
Las animaciones, el cuestionario y los paquetes de la portada son **simulaciones educativas**; las acciones reales de la red están en el panel tras iniciar sesión. La integración muestra la portada dentro de un iframe del mismo origen para mantener sus estilos y scripts aislados y evitar conflictos con React.
