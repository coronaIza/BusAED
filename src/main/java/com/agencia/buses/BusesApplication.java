package com.agencia.buses;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

// Clase principal: aquí arranca Spring Boot.
// @SpringBootApplication busca automáticamente las clases con @RestController,
// @Service, @Repository y @Component dentro de com.agencia.buses.
@SpringBootApplication
public class BusesApplication {

    public static void main(String[] args) {
        SpringApplication.run(BusesApplication.class, args);
    }
}
