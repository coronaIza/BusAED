# Buses - Primer avance (Backend)

Backend en Spring Boot para una empresa de transporte de pasajeros en bus.
En este avance: CRUD completo de **Bus**, un endpoint de ejemplo de **viajes** y una demo de estructuras de datos.

## Tecnologías
Java 17, Spring Boot 3, Maven, PostgreSQL (Aiven), JDBC con PreparedStatement, REST, Postman, Visual Studio Code.

## Arquitectura (3 capas)
```
Postman -> Controlador -> Negocio -> DAO -> JDBC (PreparedStatement) -> PostgreSQL
```
- **Controlador**: recibe HTTP y responde (200, 201, 204, 400, 404, 500).
- **Negocio**: validaciones y reglas.
- **DAO**: consultas SQL con JDBC.

## Estructura
```
src/main/java/com/agencia/buses/
├── modelo/        Bus.java, Reserva.java
├── dao/           IBusDAO.java, BusDAO.java
├── negocio/       IBusNegocio.java, BusNegocio.java
├── controlador/   BusControlador.java, ViajeControlador.java, DemoControlador.java
├── config/        DatabaseConfig.java
└── BusesApplication.java
src/main/resources/application.properties
```

## Cómo abrirlo en VS Code
1. Instalar "Extension Pack for Java" y "Spring Boot Extension Pack".
2. `Archivo > Abrir carpeta` y elegir la carpeta `buses`.

## Configurar PostgreSQL
La base de datos ya existe (Aiven). Solo abre `src/main/resources/application.properties`

## Ejecutar
```
mvn spring-boot:run
```
o ejecutar `BusesApplication` desde VS Code (botón Run). Corre en `http://localhost:8080`.

## Endpoints
| Método | URL | Descripción |
|---|---|---|
| GET | /api/buses | Listar buses |
| GET | /api/buses/{id} | Buscar bus |
| POST | /api/buses | Registrar bus |
| PUT | /api/buses/{id} | Actualizar bus |
| DELETE | /api/buses/{id} | Eliminar bus |
| GET | /api/viajes | Viajes de ejemplo (temporal) |
| GET | /api/demo/estructuras | Demo de Queue y matriz |

## Probar con Postman
Para POST y PUT: Body > raw > JSON.

```json
{
  "placa": "ABC-123",
  "modelo": "Mercedes Benz",
  "capacidad": 45,
  "estado": "ACTIVO"
}
```

## Dependencias
- **spring-boot-starter-web**: API REST.
- **postgresql**: driver JDBC.
- **spring-boot-devtools**: reinicio automático al guardar.
