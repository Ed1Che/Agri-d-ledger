FROM python:3.11-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

COPY apps/ml/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY apps/ml/ .
EXPOSE 8000
CMD ["uvicorn", "main_api:app", "--host", "0.0.0.0", "--port", "8000"]
