import pika
import json
import threading
import time
from datetime import datetime
from database import db
import uuid

class NotificationConsumer:
    def __init__(self, rabbitmq_url, exchange_name):
        self.rabbitmq_url = rabbitmq_url
        self.exchange_name = exchange_name
        self.connection = None
        self.channel = None

    def connect(self):
        """Establece conexión con RabbitMQ"""
        try:
            self.connection = pika.BlockingConnection(
                pika.URLParameters(self.rabbitmq_url)
            )
            self.channel = self.connection.channel()
            
            # Declarar exchange fanout
            self.channel.exchange_declare(
                exchange=self.exchange_name,
                exchange_type='fanout',
                durable=True
            )
            
            # Crear cola exclusiva
            result = self.channel.queue_declare(queue='', exclusive=True)
            queue_name = result.method.queue
            
            # Vincular cola al exchange
            self.channel.queue_bind(
                exchange=self.exchange_name,
                queue=queue_name
            )
            
            print("Conectado a RabbitMQ. Esperando eventos...")
            
            return queue_name
            
        except Exception as e:
            print(f"Error conectando a RabbitMQ: {e}")
            return None

    def start_consuming(self):
        """Inicia el consumo de eventos"""
        def callback(ch, method, properties, body):
            try:
                evento = json.loads(body)
                print(f"Evento recibido: {evento.get('tipo')}")
                self.process_event(evento)
            except Exception as e:
                print(f"Error procesando evento: {e}")

        def reconnect():
            while True:
                try:
                    queue_name = self.connect()
                    if queue_name:
                        self.channel.basic_consume(
                            queue=queue_name,
                            on_message_callback=callback,
                            auto_ack=True
                        )
                        print("Consumidor iniciado")
                        self.channel.start_consuming()
                except Exception as e:
                    print(f"Error en consumidor: {e}")
                    time.sleep(5)

        # Iniciar en un hilo separado
        thread = threading.Thread(target=reconnect, daemon=True)
        thread.start()

    def process_event(self, evento):
        """Procesa los eventos recibidos"""
        tipo_evento = evento.get('tipo')
        datos = evento.get('datos', {})
        
        if tipo_evento == 'empleado.creado':
            self.handle_empleado_creado(datos)
        elif tipo_evento == 'empleado.eliminado':
            self.handle_empleado_eliminado(datos)

    def handle_empleado_creado(self, datos):
        """Maneja evento de empleado creado"""
        mensaje = f"Bienvenido {datos.get('nombre')} a la empresa! Tu cuenta ha sido creada exitosamente."
        
        self.crear_notificacion(
            tipo='BIENVENIDA',
            destinatario=datos.get('email'),
            mensaje=mensaje,
            empleado_id=datos.get('id')
        )
        
        # Log de simulación
        print(f"""
        [NOTIFICACIÓN] 
        Tipo: BIENVENIDA
        Para: {datos.get('email')}
        Mensaje: "{mensaje}"
        Empleado: {datos.get('nombre')}
        Timestamp: {datetime.now().isoformat()}
        """)

    def handle_empleado_eliminado(self, datos):
        """Maneja evento de empleado eliminado"""
        mensaje = f"Estimado {datos.get('nombre')}, tu cuenta ha sido desvinculada de la empresa."
        
        self.crear_notificacion(
            tipo='DESVINCULACION',
            destinatario=datos.get('email'),
            mensaje=mensaje,
            empleado_id=datos.get('id')
        )
        
        # Log de simulación
        print(f"""
        [NOTIFICACIÓN] 
        Tipo: DESVINCULACION
        Para: {datos.get('email')}
        Mensaje: "{mensaje}"
        Empleado: {datos.get('nombre')}
        Timestamp: {datetime.now().isoformat()}
        """)

    def crear_notificacion(self, tipo, destinatario, mensaje, empleado_id):
        """Guarda notificación en base de datos"""
        notificacion = {
            'id': f"NOT-{uuid.uuid4()}",
            'tipo': tipo,
            'destinatario': destinatario,
            'mensaje': mensaje,
            'fecha_envio': datetime.now(),
            'empleado_id': empleado_id
        }
        
        try:
            db.insert_notificacion(notificacion)
            print(f"Notificación guardada: {notificacion['id']}")
        except Exception as e:
            print(f"Error guardando notificación: {e}")

consumer = NotificationConsumer(
    rabbitmq_url='amqp://admin:admin@message-broker:5672',
    exchange_name='empleados.events'
)