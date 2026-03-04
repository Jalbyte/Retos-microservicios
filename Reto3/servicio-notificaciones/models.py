from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class Notificacion(BaseModel):
    id: str
    tipo: str  # BIENVENIDA o DESVINCULACION
    destinatario: str
    mensaje: str
    fecha_envio: datetime
    empleado_id: str

class NotificacionCreate(BaseModel):
    tipo: str
    destinatario: str
    mensaje: str
    empleado_id: str

class NotificacionResponse(BaseModel):
    id: str
    tipo: str
    destinatario: str
    mensaje: str
    fecha_envio: datetime
    empleado_id: str

    class Config:
        from_attributes = True