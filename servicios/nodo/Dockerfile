# Imagen de base compatible con ARM (aarch64).
# El build context es ./servicios (compose), por eso se copian rutas relativas.
FROM python:3.12-slim
WORKDIR /app
# Fase 8: ChaCha20-Poly1305 para el cifrado extremo a extremo de los saltos
RUN pip install --no-cache-dir cryptography
COPY _comun/ /app/_comun/
COPY nodo/nodo.py .
# -u para que los logs salgan sin buffer y podamos verlos con docker logs
CMD ["python", "-u", "nodo.py"]
