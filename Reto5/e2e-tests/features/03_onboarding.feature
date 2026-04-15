# language: es

Característica: Onboarding de empleados
  Como administrador
  Quiero registrar nuevos empleados
  Para que el sistema genere automáticamente sus credenciales y notificaciones

  Antecedentes:
    Dado que estoy autenticado como "ADMIN"

  Escenario: Registro exitoso de un empleado
    Cuando registro un empleado con email único y departamento existente
    Entonces la respuesta debe tener código 201
    Y eventualmente el servicio de autenticación debe haber creado un usuario para ese email
    Y eventualmente debe existir una notificación de tipo BIENVENIDA para ese email

  Escenario: El nuevo empleado puede establecer su contraseña y hacer login
    Dado que he registrado un empleado con email "onboarding@empresa.com"
    Cuando establezco su contraseña usando el token de recuperación
    Entonces la respuesta debe tener código 200
    Cuando hago login con "onboarding@empresa.com" y la nueva contraseña
    Entonces la respuesta debe tener código 200 y un token válido

  Escenario: Registro con datos inválidos
    Cuando registro un empleado con departamento inexistente
    # CORRECCIÓN: el servicio devuelve 400, no 404, para departamento inválido
    Entonces la respuesta debe tener código 400
    Cuando registro un empleado sin email
    Entonces la respuesta debe tener código 400
