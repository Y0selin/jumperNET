# Proxy SOCKS5 de entrada. Build context ./servicios (compose).
FROM python:3.12-slim
WORKDIR /app
# Fase 8: ChaCha20-Poly1305 para el cifrado extremo a extremo de los saltos
RUN pip install --no-cache-dir cryptography
COPY _comun/ /app/_comun/
COPY entrada/entrada.py /app/entrada.py
CMD ["python", "-u", "/app/entrada.py"]
