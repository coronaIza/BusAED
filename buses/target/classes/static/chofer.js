// Frontend del chofer.
// Recorrido: chofer.js -> GET /api/viajes/mi-hoja -> ViajeControlador -> ViajeNegocio -> ViajeDAO -> PostgreSQL.
// El backend sabe quién es el chofer por la sesión: aquí NUNCA se envía un id de chofer.

const tablaViajes = document.getElementById("tablaViajes");
const mensajeViajes = document.getElementById("mensaje");

function mostrarMensaje(texto, esError) {
    mensajeViajes.textContent = texto;
    mensajeViajes.className = esError ? "error" : "ok";
}

async function obtenerCsrf() {
    const respuesta = await fetch("/api/auth/csrf");
    if (!respuesta.ok) {
        throw new Error("No se pudo validar la sesión");
    }
    return (await respuesta.json()).token;
}

// Si el backend respondió con error, lee el texto {"error": "..."} y lo muestra.
async function textoDeError(respuesta) {
    try {
        const datos = await respuesta.json();
        return datos.error || "Error " + respuesta.status;
    } catch (e) {
        return "Error " + respuesta.status;
    }
}

function crearBoton(texto, accion) {
    const boton = document.createElement("button");
    boton.textContent = texto;
    boton.onclick = accion;
    return boton;
}


let usuarioCargado = false; // Variable global/superior para consultar el usuario solo una vez

// GET /api/viajes/mi-hoja -> solo los viajes asignados a este chofer
async function cargarHojaDeRuta(mensajeExito) {
    try {
        // 1. Cargar el saludo de usuario solo en el primer inicio de la página
        if (!usuarioCargado) {
            const usuarioRespuesta = await fetch("/api/auth/me");
            if (usuarioRespuesta.ok) {
                const usuario = await usuarioRespuesta.json();
                document.getElementById("saludo").textContent = "Hola, " + usuario.nombre;
                usuarioCargado = true;
            }
        }

        // 2. Obtener la lista de viajes actualizada
        const viajesRespuesta = await fetch("/api/viajes/mi-hoja");
        if (!viajesRespuesta.ok) {
            throw new Error(await textoDeError(viajesRespuesta));
        }

        const viajes = await viajesRespuesta.json();

        // 3. Renderizar la tabla de inmediato
        tablaViajes.replaceChildren();
        viajes.forEach(function (viaje) {
            const fila = document.createElement("tr");
            [viaje.origen, viaje.destino, viaje.fechaSalida, (viaje.horaSalida || "").substring(0, 5),
                viaje.placaBus, viaje.estado]
                .forEach(function (valor) {
                    const celda = document.createElement("td");
                    celda.textContent = valor;
                    fila.appendChild(celda);
                });

            const acciones = document.createElement("td");
            if (viaje.estado === "PROGRAMADO") {
                acciones.appendChild(crearBoton("Iniciar viaje", function () { cambiarEstado(viaje.id, "EN CURSO"); }));
            }
            if (viaje.estado === "EN CURSO") {
                acciones.appendChild(crearBoton("Finalizar viaje", function () { cambiarEstado(viaje.id, "FINALIZADO"); }));
            }
            fila.appendChild(acciones);
            tablaViajes.appendChild(fila);
        });

        if (mensajeExito) {
            mostrarMensaje(mensajeExito, false);
        } else if (!viajes.length) {
            mostrarMensaje("No tienes viajes asignados por el momento.", false);
        } else {
            mostrarMensaje("", false);
        }
    } catch (error) {
        mostrarMensaje(error.message || "No se pudieron cargar los viajes", true);
    }
}

// PATCH /api/viajes/mi-hoja/{id}/estado -> iniciar o finalizar un viaje propio
async function cambiarEstado(id, estado) {
    if (!confirm("¿Cambiar el viaje " + id + " a " + estado + "?")) {
        return;
    }
    try {
        const respuesta = await fetch("/api/viajes/mi-hoja/" + id + "/estado", {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "X-XSRF-TOKEN": await obtenerCsrf()
            },
            body: JSON.stringify({ estado: estado })
        });
        if (!respuesta.ok) {
            mostrarMensaje(await textoDeError(respuesta), true);
            return;
        }
        await cargarHojaDeRuta("Viaje " + id + ": " + estado);
    } catch (error) {
        mostrarMensaje("No se pudo conectar con el servidor", true);
    }
}

document.getElementById("btnSalir").addEventListener("click", async function () {
    try {
        const respuesta = await fetch("/api/auth/logout", {
            method: "POST",
            headers: { "X-XSRF-TOKEN": await obtenerCsrf() }
        });
        if (!respuesta.ok) {
            throw new Error("No se pudo cerrar la sesión");
        }
        window.location.assign("/login.html");
    } catch (error) {
        mostrarMensaje(error.message || "No se pudo conectar con el servidor", true);
    }
});

cargarHojaDeRuta();
