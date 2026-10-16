FROM python:3.12-slim
WORKDIR /app
# Sin dependencias externas: solo stdlib (asyncio, socket, ipaddress, urllib)
COPY entrada.py /app/entrada.py
CMD ["python", "-u", "/app/entrada.py"]
