package com.notificaciones.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Value("${server.port:8084}")
    private String port;

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("API Servicio de Notificaciones")
                        .version("1.0.0")
                        .description("""
                                Microservicio de Notificaciones — Reto 3.
                                
                                **Responsabilidades:**
                                - Consume eventos `empleado.creado` y `empleado.eliminado` desde RabbitMQ (fanout exchange `empleados_exchange`)
                                - Simula el envío de emails mediante logs estructurados en consola
                                - Persiste el historial de notificaciones en MySQL
                                - Expone endpoints REST de consulta
                                
                                **Eventos consumidos:**
                                | Evento | Tipo generado | Acción |
                                |--------|--------------|--------|
                                | `empleado.creado` | `BIENVENIDA` | Log + registro en BD |
                                | `empleado.eliminado` | `DESVINCULACION` | Log + registro en BD |
                                """)
                        .contact(new Contact()
                                .name("Reto 3 — Microservicios")
                                .email("soporte@empresa.com"))
                        .license(new License().name("MIT")))
                .servers(List.of(
                        new Server().url("http://localhost:" + port).description("Local")
                ));
    }
}
