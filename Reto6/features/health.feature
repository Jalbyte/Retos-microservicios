Feature: Verificar disponibilidad del servicio Reto6
  Scenario: Endpoint health responde correctamente
    Given el servicio Reto6 esta disponible
    When consulto el endpoint de salud
    Then recibo un estado 200
    And el cuerpo contiene status ok

  Scenario: Endpoint de saludo responde correctamente
    When consulto el endpoint de saludo para "Camilo"
    Then recibo un estado 200
    And el mensaje incluye "Camilo"
