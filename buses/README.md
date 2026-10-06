# Sistema de transporte de pasajeros en bus

Este repositorio contiene el backend en Spring Boot. ; el resto está indicado como pendiente en la tabla de funcionalidades.

## 1. Qué hace el sistema
Plataforma para una empresa de buses: gestionar buses, rutas, viajes, pasajeros y reservas de asientos. El módulo de Buses ya permite registrar, listar, editar y eliminar buses guardados en PostgreSQL, tanto por API (Postman) como desde un frontend web sencillo.

## 2. Arquitectura
```
Frontend (HTML + JS) / Postman
        ↓
BusControlador   (recibe HTTP, responde 200/201/204/400/404/500)
        ↓
BusNegocio       (reglas y validaciones)
        ↓
BusDAO           (JDBC + PreparedStatement)
        ↓
PostgreSQL (Aiven)
```

## 3. Funcionalidades del sistema y estado real
| # | Funcionalidad | Estado |
|---|---|---|
| 1 | Login / autenticación | **Pendiente.** Existen `Usuario` y `UsuarioRepositorio` (JPA), pero no hay login ni Spring Security configurado |
| 2 | Gestión de buses (registrar, consultar, editar, eliminar) | **Implementada** (Integrante 1) |
| 3 | Gestión de rutas | Pendiente |
| 4 | Gestión de viajes | Pendiente |
| 5 | Gestión de pasajeros | Pendiente |
| 6 | Reserva de pasajes / selección de asiento | Pendiente. `ReservaNegocio` tiene una cola en memoria y un mapa de asientos simulado, sin persistencia ni controlador |
| 7 | Consulta de disponibilidad de asientos | Pendiente |
| 8 | Cancelación de reservas | Pendiente |

Nota: `GET /api/buses` es parte de la funcionalidad "gestión de buses", no una funcionalidad aparte.

## 4. Actores
- **Administrador:** gestionar buses (implementado), rutas y viajes, consultar reservas (pendientes).
- **Pasajero:** consultar viajes y disponibilidad, reservar, consultar y cancelar reservas (pendientes).

## 5. Tecnologías
Java 17, Spring Boot 3.3.5, Maven, PostgreSQL (Aiven), JDBC, JPA, HTML/JavaScript, Postman, Visual Studio Code.

## 6. Dependencias (pom.xml)
| Dependencia | Para qué se usa |
|---|---|
| spring-boot-starter-web | API REST y servir el frontend estático |
| spring-boot-starter-data-jpa | JPA: entidad `Usuario` y `UsuarioRepositorio` (módulo de otro integrante) |
| postgresql | Driver JDBC de PostgreSQL |
| spring-boot-devtools | Reinicio automático al guardar |

No están agregadas todavía: `spring-boot-starter-security` y una librería JWT (las agregará quien haga el login; si se agrega Security sin configurarla, bloquea todos los endpoints).

## 7. JPA y JDBC conviven
- **JDBC:** módulo de Buses (`BusDAO`) con SQL y `PreparedStatement` directos.
- **JPA:** `Usuario` / `UsuarioRepositorio` (módulo de login, otro integrante).
- Ambos usan la misma base PostgreSQL.

## 8. Base de datos
PostgreSQL en Aiven, ya existente. No se crea ni se borra nada automáticamente (`ddl-auto=none`).
Tabla del módulo: `bus`, con las columnas `id`, `placa`, `modelo`, `capacidad_total`, `estado`.
En Java y en el JSON el campo se llama `capacidad`; el DAO lo guarda en la columna `capacidad_total`.

## 9. Variables de entorno
1. Copia `.env.example` como `.env`.
2. Completa `DB_URL`, `DB_USUARIO` y `DB_PASSWORD`.
3. `.env` está en `.gitignore`: **no lo subas a Git**.

`application.properties` usa `${DB_URL}`, `${DB_USUARIO}` y `${DB_PASSWORD}`, y carga `.env` con `spring.config.import`. También sirven variables de entorno del sistema.

## 10. Cómo ejecutar
```
mvn spring-boot:run
```
o ejecutar `BusesApplication` desde VS Code (ejecutar desde la carpeta raíz para que encuentre `.env`).
- Frontend: http://localhost:8080
- API: http://localhost:8080/api/buses

## 11. Cómo probar la API (Postman)
Importa `docs/buses.postman_collection.json`. Para POST y PUT: Body > raw > JSON.

| Método | URL | Respuesta |
|---|---|---|
| GET | /api/buses | 200 |
| GET | /api/buses/{id} | 200 / 404 |
| POST | /api/buses | 201 / 400 |
| PUT | /api/buses/{id} | 200 / 400 / 404 |
| DELETE | /api/buses/{id} | 204 / 400 (tiene viajes) / 404 |

```json
{
  "placa": "ABC-123",
  "modelo": "Mercedes Benz",
  "capacidad": 45,
  "estado": "ACTIVO"
}
```
Los errores responden con `{"error": "mensaje"}`.

---

## Parte del Integrante 1 — Gestión de Buses + JDBC

| Pieza | Archivo | Qué hace |
|---|---|---|
| Modelo | `modelo/Bus.java` | Clase normal (sin JPA) con id, placa, modelo, capacidad, estado |
| Controlador | `controlador/BusControlador.java` | Define los 5 endpoints, delega al negocio y traduce errores a 400/404/500 |
| Negocio | `negocio/BusNegocio.java` | Validaciones, placa duplicada, existencia antes de editar/eliminar, estado por defecto |
| DAO | `dao/BusDAO.java` | Todo el SQL con `Connection`, `PreparedStatement`, `ResultSet`, `SQLException` y try-with-resources |
| Conexión | `config/DatabaseConfig.java` | Abre conexiones JDBC con los datos de `application.properties` |
| Frontend | `static/index.html`, `static/buses.js` | Formulario y tabla que consumen `/api/buses` con `fetch` |

Reglas de negocio (en `BusNegocio`): bus no nulo; placa obligatoria y máximo 10 caracteres; modelo obligatorio; capacidad > 0; estado ACTIVO por defecto y solo ACTIVO, INACTIVO o MANTENIMIENTO; placa no duplicada; el bus debe existir para editar o eliminar; un bus con viajes asociados no se elimina.

### Flujo de buses (registrar)
1. El usuario llena el formulario y el navegador envía `POST /api/buses` con JSON.
2. `BusControlador.registrar` recibe el JSON convertido en `Bus`.
3. `BusNegocio.registrar` valida los datos y consulta si la placa ya existe.
4. `BusDAO.insertar` abre la conexión JDBC y prepara `INSERT INTO bus (...) VALUES (?, ?, ?, ?)`.
5. PostgreSQL guarda el bus y genera el id.
6. El DAO devuelve el bus, el negocio lo devuelve al controlador y este responde 201.
7. `buses.js` vuelve a pedir `GET /api/buses` y la tabla se actualiza con lo que hay en la base.

Listar, editar y eliminar siguen el mismo camino con `SELECT`, `UPDATE` y `DELETE`.

### Qué NO incluye este módulo
Login, Spring Security, JWT, rutas, viajes, pasajeros y reservas (son de otros integrantes).

La guía para la exposición está en `docs/GUIA_DEFENSA.md`.
