# Proxy HTTP de entrada (para la extension del navegador). Build context ./servicios.
FROM python:3.12-slim
WORKDIR /app
# JENC (Fase 8): ChaCha20-Poly1305 extremo a extremo
RUN pip install --no-cache-dir cryptography
COPY _comun/ /app/_comun/
COPY entrada-http/entrada_http.py /app/entrada_http.py
CMD ["python", "-u", "/app/entrada_http.py"]
