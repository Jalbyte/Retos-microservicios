# language: es

Característica: Seguridad y control de acceso
  Como sistema de autenticación
  Quiero controlar el acceso a los recursos
  Para garantizar que solo los usuarios autorizados realicen operaciones

  Antecedentes:
    Dado que el sistema está desplegado y operativo

  Escenario: Acceso denegado sin token de autenticación
    Cuando consulto la lista de empleados sin token
    Entonces la respuesta debe tener código 401

  Escenario: Acceso denegado con token inválido
    Cuando consulto la lista de empleados con token inválido "token.falso.123"
    Entonces la respuesta debe tener código 401

  Escenario: Usuario USER puede consultar empleados pero no puede crear
    Dado que estoy autenticado como "USER"
    Cuando consulto la lista de empleados
    Entonces la respuesta debe tener código 200
    Cuando intento crear un empleado con datos válidos
    Entonces la respuesta debe tener código 403

  Escenario: Usuario ADMIN puede crear un empleado
    Dado que estoy autenticado como "ADMIN"
    Cuando creo un empleado con datos válidos
    Entonces la respuesta debe tener código 201