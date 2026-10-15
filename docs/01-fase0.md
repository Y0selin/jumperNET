# Fase 0 — Preparación y diagnóstico

## Objetivo
Preparar el servidor Oracle Cloud (ARM, Ubuntu 24.04) para el proyecto: diagnóstico del sistema, instalación de Docker y esqueleto del repositorio con control de versiones.

## Qué se hizo (con resultados reales)

| Paso | Comando/execución | Resultado |
|---|---|---|
| Arquitectura | `uname -m` | `aarch64` (ARM importante: todas las imágenes deben tener build arm64) |
| SO / HW | `/etc/os-release`, `free -h`, `df -h /`, `nproc` | Ubuntu 24.04.5 LTS · 4 vCPU · 23Gi RAM libres · 44GB disco libres (48 total) |
| Firewall previo | `sudo iptables -L -n` | INPUT: solo 22/TCP, 19132/UDP, 25565/TCP (servidor de Minecraft preexistente → **no tocar**). FORWARD con REJECT por defecto. |
| Puertos en escucha | `sudo ss -tulpn` | Solo SSH y rpcbind; sin puertos conflictivos para 80/443/1080 |
| Docker | `curl -fsSL https://get.docker.com \| sudo sh` | Docker 29.9.1 + Compose v5.6.0 |
| Git | clone de Y0selin/jumperNET | OK, rama `main`. Nota: el repo estaba vacío, aunque GitHub Pages estuviera activado por el usuario: para la fase 6 tendrá que crear el workflow (`build` + `deploy-pages`) dentro del repo, porque este repositorio no contiene archivos. |
| Backup firewall | `sudo iptables-save > backups/iptables-pre-docker-20261015.rules` (backup ignorado en git, contiene nuestra topología de red) | OK |
| DNS | `dig +short jumpernet.duckdns.org` desde el propio servidor | `129.213.137.20` — correcto |
| Secretos | `.env` con `JWT_SECRET=$(openssl rand -hex 32)` | Generado y protegido en `.gitignore` |

## Por qué así
- Se instala Docker oficial con su script (`get.docker.com`) para obtener la última versión compatible con ARM y no depender de la versión de Ubuntu.
- Se creó una copia de seguridad de iptables ANTES de cualquier cambio (regla 7). Docker modifica FORWARD (política DROP + cadenas DOCKER) → esto es normal y necesario.
- `.env` con secretos generados aleatoriamentes fuera de git desde el primer momento (regla 5).
- Espacio suficiente: 1 CPU por contenedor podría quedarse justa si hubiera picos, pero con 23Gi de RAM y límites por contenedor seguro.

## Problemas encontrados
- El FORWARD de Ubuntu ya tenía un REJECT que Docker necesita para su NAT: Docker resolvió el conflicto insertando sus cadenas propias primero (DOCKER-FORWARD) → la salida está garantizada sin haber tocado configuración manualmente.
- El repo de GitHub estaba vacío (se habían creado solo los ajustes de Pages). Se resolvió haciendo el primer commit en el servidor (el agente tiene accesso de escritura con deploy key).

## Cómo comprobar que funciona
```bash
ssh ubuntu@129.213.137.20 'docker --version && docker compose version && free -h && ls ~/jumpernat'
```
Debe mostrar las versiones de Docker y los directorios del proyecto.
