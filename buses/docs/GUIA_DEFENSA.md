# Guía de defensa — Módulo de Buses

Las respuestas se basan en el código real del proyecto. Lo que aún no existe se dice claramente.

**1. ¿Qué parte hizo el Integrante 1?**
El módulo de Buses con JDBC: `Bus`, `BusControlador`, `BusNegocio`, `BusDAO`, `DatabaseConfig` y el frontend sencillo de buses.

**2. ¿Qué es JDBC?**
La API de Java para conectarse a una base de datos y ejecutar SQL. Nosotros escribimos el SQL y Java lo envía a PostgreSQL.

**3. ¿Dónde se utiliza JDBC?**
En `BusDAO` (usa `Connection`, `PreparedStatement`, `ResultSet`) y en `DatabaseConfig`, que abre la conexión con `DriverManager.getConnection`.

**4. ¿Qué es PreparedStatement?**
Una consulta SQL con marcadores `?` cuyos valores se envían aparte con `setString`, `setInt`, etc.

**5. ¿Por qué utilizar PreparedStatement?**
Porque los datos del usuario nunca se mezclan con el texto del SQL, lo que evita la inyección SQL.

**6. ¿Qué es un DAO?**
Data Access Object: la clase que se encarga solo de acceder a la base de datos.

**7. ¿Qué hace BusDAO?**
Ejecuta `SELECT` (todos, por id, por placa), `INSERT`, `UPDATE` y `DELETE` sobre la tabla `bus` y convierte cada fila en un objeto `Bus`.

**8. ¿Dónde está la lógica de negocio?**
Principalmente en `BusNegocio`, donde se validan los datos, se controlan duplicados y se verifica la existencia del registro antes de modificarlo o eliminarlo.

**9. ¿Qué hace BusNegocio?**
Valida placa, modelo, capacidad y estado; evita placas duplicadas; comprueba que el bus exista antes de editar o eliminar; y avisa si un bus no se puede eliminar porque tiene viajes. Luego llama al DAO.

**10. ¿Qué hace BusControlador?**
Recibe las peticiones HTTP, llama a `BusNegocio` y devuelve el código HTTP: 200, 201, 204, 400, 404 o 500. No tiene SQL ni reglas.

**11. ¿Qué es una API?**
Una interfaz que permite que distintas aplicaciones se comuniquen. Aquí, el frontend y Postman se comunican con el backend.

**12. ¿Qué es REST?**
Un estilo para exponer recursos mediante HTTP. Nuestro recurso es `/api/buses`.

**13. ¿Qué endpoints tiene el módulo?**
`GET /api/buses`, `GET /api/buses/{id}`, `POST /api/buses`, `PUT /api/buses/{id}`, `DELETE /api/buses/{id}`.

**14. ¿Qué métodos HTTP utiliza?**
GET (consultar), POST (crear), PUT (actualizar) y DELETE (eliminar).

**15. ¿Dónde se realiza la persistencia?**
En PostgreSQL (Aiven), tabla `bus`, mediante `BusDAO`. No se guardan buses en listas en memoria.

**16. ¿Cómo llega un dato desde el frontend hasta PostgreSQL?**
`buses.js` (fetch) → `BusControlador` → `BusNegocio` → `BusDAO` → `PreparedStatement` → PostgreSQL, y la respuesta vuelve por el mismo camino.

**17. ¿Qué pasa cuando registro un bus?**
Se envía `POST /api/buses`; el negocio valida y comprueba la placa; el DAO hace el `INSERT`; PostgreSQL genera el id; el controlador responde 201 con el bus; el frontend vuelve a pedir la lista.

**18. ¿Qué pasa si la placa ya existe?**
`BusNegocio` busca la placa con `BusDAO.buscarPorPlaca`; si existe lanza `IllegalArgumentException` y el controlador responde 400 con `{"error": "Ya existe un bus con la placa ..."}`. No se inserta nada.

**19. ¿Qué pasa si busco un ID inexistente?**
El negocio lanza `NoSuchElementException` y el controlador responde 404 con un mensaje.

**20. ¿Por qué PostgreSQL?**
Es una base de datos relacional que ya usa el equipo, hospedada en Aiven, y tiene driver JDBC oficial. (Si el profesor pregunta por otras opciones, es una decisión del equipo.)

**21. ¿Cómo se conectan las variables de entorno?**
`application.properties` usa `${DB_URL}`, `${DB_USUARIO}` y `${DB_PASSWORD}`. Spring las lee del archivo `.env` (vía `spring.config.import`) o del sistema. `DatabaseConfig` las recibe con `@Value`. El `.env` no se sube a Git; `.env.example` muestra el formato.

**22. ¿Dónde se utiliza JPA en el proyecto global?**
Hay una entidad `Usuario` con anotaciones JPA y `UsuarioRepositorio extends JpaRepository`. Es del módulo de login (otro integrante). Hoy está declarada, pero ningún servicio ni controlador la usa todavía, y las tablas no se modifican (`ddl-auto=none`).

**23. ¿Dónde se utiliza JDBC?**
En el módulo de Buses: `BusDAO` y `DatabaseConfig`.

**24. ¿Qué librerías utiliza el proyecto?**
`spring-boot-starter-web` (API REST y frontend estático), `spring-boot-starter-data-jpa` (JPA), `postgresql` (driver JDBC) y `spring-boot-devtools` (reinicio automático). Spring Security y JWT aún no están agregados.

**25. ¿Qué actores tiene el sistema?**
Administrador y Pasajero. El módulo de buses corresponde al Administrador. Hoy no hay login que distinga actores.

**26. ¿Cuántas funcionalidades tiene el sistema?**
Se planificaron 8 (login, buses, rutas, viajes, pasajeros, reservas, disponibilidad de asientos, cancelación). Implementada y funcional hoy: gestión de buses. Las demás dependen de los otros integrantes.

**27. ¿Qué funcionalidades corresponden al módulo de buses?**
Una: gestión de buses (registrar, consultar, editar y eliminar buses, con validaciones). `GET /api/buses` no cuenta como funcionalidad aparte.

**28. ¿Cómo se garantiza la persistencia?**
Cada operación abre una conexión JDBC y ejecuta SQL real en PostgreSQL. Se puede comprobar registrando un bus, reiniciando la aplicación y consultándolo de nuevo.

**29. ¿Cómo se integra mi módulo con Spring Security?**
Todavía no está integrado: Spring Security no está configurado en el proyecto. Cuando el compañero del login lo agregue, protegerá la ruta `/api/buses` (por ejemplo, solo ADMIN) en su configuración de seguridad, sin tocar `BusDAO` ni `BusNegocio`. El frontend tendría que enviar la credencial o token que corresponda.

**30. ¿Cuál es el procedimiento completo de registrar un bus?**
1) Formulario → `POST /api/buses` con JSON. 2) `BusControlador` recibe el `Bus`. 3) `BusNegocio` valida y revisa la placa. 4) `BusDAO` abre la conexión y prepara el `INSERT ... VALUES (?, ?, ?, ?)`. 5) PostgreSQL guarda y genera el id. 6) Se devuelve el bus hacia arriba. 7) El controlador responde 201. 8) El frontend recarga la lista con `GET /api/buses`.
