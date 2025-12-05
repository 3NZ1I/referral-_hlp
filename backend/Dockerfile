# Dockerfile for FastAPI backend
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt /app/
COPY requirements.txt /app/
RUN pip install --upgrade pip && \
    pip install -r requirements.txt
COPY . /app/backend
COPY entrypoint.sh /app/backend/entrypoint.sh
RUN chmod +x /app/backend/entrypoint.sh
ENV PYTHONPATH=/app
EXPOSE 8000
ENTRYPOINT ["/app/backend/entrypoint.sh"]
