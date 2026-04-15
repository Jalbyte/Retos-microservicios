# language: es

Característica: Verificación del sistema
  Para confirmar que el sistema está operativo
  Como suite de pruebas
  Quiero verificar que el API Gateway responde

  Escenario: El sistema responde correctamente
    Dado que el sistema está desplegado y operativo
    Cuando consulto la URL base
    Entonces la respuesta debe tener código 200
    Y el gateway devuelve 200 si no hay ruta, pero confirma que está vivo
