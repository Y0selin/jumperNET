# Imagen de base compatible con ARM (aarch64)
FROM python:3.12-slim
WORKDIR /app
COPY nodo.py .
# -u para que los logs salgan sin buffer y podamos verlos con docker logs
CMD ["python", "-u", "nodo.py"]
