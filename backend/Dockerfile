# Dockerfile for FastAPI backend
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt /app/
RUN pip install --upgrade pip && \
    pip install -r requirements.txt
COPY . /app/backend
EXPOSE 8000
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
