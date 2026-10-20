# Puente WEB: mantiene el túnel del agente por cada usuario con opt-in.
# El contexto es la raíz de deploy/ de modo que el agente (el MISMO código
# probado en campo, deploy/navegador/agente_tunel.js) se copia tal cual:
# una sola fuente de verdad para el protocolo de túnel.
FROM node:20-alpine
WORKDIR /puente
COPY navegador/agente_tunel.js /puente/agente_tunel.js
COPY servicios/puente/puente.js /puente/puente.js
CMD ["node", "puente.js"]
