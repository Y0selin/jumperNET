# Agente de salida de JumperNET — manual paso a paso

El agente corre **en TU equipo** y mantiene una única conexión TCP **saliente**
hacia el broker de la red. Por ella llegan los circuitos de otros usuarios y tu
equipo ejecuta el salto con su propia conexión a internet:

- la IP que ven los destinos es **LA DE TU CASA** (así lo etiqueta el panel:
  «salida desde tu casa»);
- **no se abre ningún puerto** en tu router (conexión saliente, como un relay
  de Tor);
- solo salen destinos web concretos (puertos 80/443, nada de redes privadas:
  mismas reglas que la infraestructura del servidor);
- puedes pararlo en cualquier momento y tu nodo deja de ser salida al instante.

## Requisito previo

1. Entra en el panel (pestaña **Nodos** → «Mi equipo como salto»).
2. Pulsa **«✓ acepto ser salto»**.
3. Copia tu **comando** con el botón «⧉ copiar TU comando»: lleva tu token y el
   nombre de tu nodo (`peer_u<N>`). Sin el opt-in aceptado el servidor te
   contesta `NOOPTIN` y el agente se apaga.

## Windows

1. Descarga **JumperNET-Agent.exe** (botón de la pestaña Nodos).
2. Abre una consola en la carpeta de descarga (escribe `cmd` en la barra del
   Explorador) y pega tu comando:
   ```
   JumperNET-Agent.exe TU_TOKEN peer_u<N>
   ```
   Verás «túnel de peer_u<N> aceptado (conexión saliente, cero puertos abiertos)».
3. **Dejarlo en 2.º plano (recomendado):** crea una **Tarea Programada**
   (Administrador de tareas → Programador → «Crear tarea»):
   - Desencadenador: «Al iniciar sesión».
   - Acción: iniciar programa `C:\...\JumperNET-Agent.exe` con argumentos
     `TU_TOKEN peer_u<N>` (los de tu comando).
   - Marca «Ejecutar con los privilegios más altos» si quieres que siga tras cerrar sesión.
4. **PARARLO:**
   ```
   taskkill /F /IM JumperNET-Agent.exe
   ```
   (o `Ctrl+C` si lo tienes en primer plano). Al pararlo tu nodo deja de ser
   salida: el panel lo muestra en segundos.
5. **DESINSTALAR:** borra el .exe y desactiva la tarea programada. Nada más:
   el agente no instala servicios ni toca la red del sistema.

## Linux / macOS

1. Descarga **agente_salida.py** y pega tu comando:
   ```
   python3 agente_salida.py TU_TOKEN peer_u<N>
   ```
2. **En 2.º plano rápido** (sin systemd):
   ```
   python3 agente_salida.py -d TU_TOKEN peer_u<N>   # log en jn_agente.log
   ```
3. **systemd (recomendado en Linux):** crea `/etc/systemd/system/jn-agente.service`:
   ```ini
   [Unit]
   Description=Agente de salida JumperNET
   After=network-online.target
   Wants=network-online.target

   [Service]
   User=TU_USUARIO
   ExecStart=/usr/bin/python3 /ruta/a/agente_salida.py TU_TOKEN peer_u<N>
   Restart=on-failure
   RestartSec=10

   [Install]
   WantedBy=default.target
   ```
   (pondré TU_TOKEN y peer_u<N> de tu comando). Luego:
   ```
   systemctl --user daemon-reload && systemctl --user enable --now jn-agente
   ```
4. **PARARLO:**
   ```
   python3 agente_salida.py --stop peer_u<N>     # para el plugin en marcha
   # o: pkill -f agente_salida.py
   # con systemd: systemctl --user stop jn-agente
   ```
5. **DESINSTALAR:** borra el .py (y el `.service` de systemd si lo creaste).
   El pidfile queda en `~/.jn_agente_peer_u<N>.pid` — bórralo si sobra.

## ¿Cómo sé que está funcionando?

- El agente imprime `túnel de peer_u<N> aceptado` y se queda quieto (solo hay
  tráfico cuando la red te usa).
- En el panel, tu nodo `peer_u<N>` pasa a «vivo» y con el chip
  **«🏠 salida desde su casa»** en la lista de nodos.
- Para dejar de colaborar: para el agente (arriba) y, si quieres, revoca el
  opt-in en el panel («⨯ no ser salto») — la revocación es inmediata aunque el
  agente siga corriendo (el broker le contesta NOOPTIN).

## Privacidad del agente

- No descifra el tráfico de nadie si la red no te entrega la clave de saltos
  (esa clave solo la da el servidor a TU usuario con tu sesión). Sin clave, tu
  equipo reenvía a ciegas o ejecuta salidas sin cifrar — jamás ve el contenido
  de nadie ni guarda historiales.
- Reglas de salida duras: solo puertos 80/443 y jamás direcciones privadas
  (127.x, 10.x, 192.168.x…). El exit a internet de verdad, nunca a tu LAN.
