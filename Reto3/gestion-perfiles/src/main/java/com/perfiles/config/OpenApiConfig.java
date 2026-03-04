package com.perfiles.config;

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

    @Value("${server.port:8085}")
    private String port;

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("API Gestión de Perfiles")
                        .version("1.0.0")
                        .description("""
                                Microservicio de Gestión de Perfiles — Reto 3.
                                
                                **Responsabilidades:**
                                - Consume el evento `empleado.creado` desde RabbitMQ y crea automáticamente un perfil por defecto
                                - Expone endpoints REST para consultar y actualizar perfiles de empleados
                                - Persiste los perfiles en PostgreSQL
                                
                                **Evento consumido:**
                                | Evento | Acción |
                                |--------|--------|
                                | `empleado.creado` | Crea un perfil vacío con nombre y email del evento |
                                
                                **Perfil por defecto creado automáticamente:**
                                - `telefono`, `direccion`, `ciudad`, `biografia` → vacíos, pueden actualizarse vía `PUT /perfiles/{empleadoId}`
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
