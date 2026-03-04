import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv
import time

load_dotenv()

class Database:
    def __init__(self):
        self.config = {
            'host': os.getenv('DB_HOST', 'notification-db'),
            'user': os.getenv('DB_USER', 'root'),
            'password': os.getenv('DB_PASSWORD', 'rootpassword'),
            'database': os.getenv('DB_NAME', 'notifications'),
            'port': int(os.getenv('DB_PORT', 3306))
        }
        self.connection = None

    def connect(self):
        """Establece conexión con MySQL con reintentos"""
        max_retries = 5
        retry_count = 0
        
        while retry_count < max_retries:
            try:
                self.connection = mysql.connector.connect(**self.config)
                print("Conexión a MySQL establecida")
                return self.connection
            except Error as e:
                print(f"Error conectando a MySQL: {e}")
                retry_count += 1
                time.sleep(5)
        
        raise Exception("No se pudo conectar a MySQL después de varios intentos")

    def init_database(self):
        """Inicializa las tablas necesarias"""
        try:
            if not self.connection:
                self.connect()
            
            cursor = self.connection.cursor()
            
            # Crear tabla de notificaciones
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS notificaciones (
                    id VARCHAR(50) PRIMARY KEY,
                    tipo VARCHAR(20) NOT NULL,
                    destinatario VARCHAR(100) NOT NULL,
                    mensaje TEXT NOT NULL,
                    fecha_envio DATETIME NOT NULL,
                    empleado_id VARCHAR(50) NOT NULL,
                    INDEX idx_empleado (empleado_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """)
            
            self.connection.commit()
            print("Base de datos inicializada correctamente")
            
        except Error as e:
            print(f"Error inicializando base de datos: {e}")
            raise

    def insert_notificacion(self, notificacion):
        """Inserta una notificación en la base de datos"""
        cursor = self.connection.cursor()
        query = """
            INSERT INTO notificaciones (id, tipo, destinatario, mensaje, fecha_envio, empleado_id)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        cursor.execute(query, (
            notificacion['id'],
            notificacion['tipo'],
            notificacion['destinatario'],
            notificacion['mensaje'],
            notificacion['fecha_envio'],
            notificacion['empleado_id']
        ))
        self.connection.commit()
        cursor.close()

    def get_all_notificaciones(self):
        """Obtiene todas las notificaciones"""
        cursor = self.connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM notificaciones ORDER BY fecha_envio DESC")
        result = cursor.fetchall()
        cursor.close()
        return result

    def get_notificaciones_by_empleado(self, empleado_id):
        """Obtiene notificaciones por empleado"""
        cursor = self.connection.cursor(dictionary=True)
        cursor.execute(
            "SELECT * FROM notificaciones WHERE empleado_id = %s ORDER BY fecha_envio DESC",
            (empleado_id,)
        )
        result = cursor.fetchall()
        cursor.close()
        return result

db = Database()