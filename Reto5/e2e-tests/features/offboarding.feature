# language: es

Característica: Offboarding de empleados
  Como administrador
  Quiero desvincular empleados
  Para que el sistema los inhabilite y notifique

  Antecedentes:
    Dado que estoy autenticado como "ADMIN"
    Y que existe un empleado activo con credenciales configuradas

  Escenario: Desvinculación completa
    Cuando elimino al empleado existente
    Entonces la respuesta debe tener código 200
    Y eventualmente debe existir una notificación de tipo DESVINCULACION para ese email

  Escenario: El empleado desvinculado no puede hacer login
    Dado que el empleado ha sido desvinculado
    Cuando intento hacer login con sus credenciales
    Entonces la respuesta debe tener código 401

  Escenario: La recuperación de contraseña falla para un empleado desvinculado
    Dado que el empleado ha sido desvinculado
    Cuando solicito recuperar contraseña para su email
    Entonces la respuesta debe tener código 404 o 401