from fastapi import FastAPI
from database import db
from consumer import consumer
import threading

app = FastAPI(title="Servicio de Notificaciones")

@app.on_event("startup")
def startup_event():
    # Inicializar base de datos
    db.init_database()
    
    # Iniciar consumidor en segundo plano
    consumer.start_consuming()

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "servicio-notificaciones"}
