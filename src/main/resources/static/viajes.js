// Frontend del módulo de Viajes.
// Se comunica con la API REST real (/api/viajes) usando fetch. No hay datos de ejemplo.
// Recorrido: formulario -> fetch -> ViajeControlador -> ViajeNegocio -> ViajeDAO -> PostgreSQL -> respuesta -> tabla.
// Las listas desplegables (ruta, bus, chofer) se llenan con /api/rutas, /api/buses y /api/choferes.

const URL_API = "/api/viajes";

const formulario = document.getElementById("formulario");
const campoId = document.getElementById("id");
const campoRuta = document.getElementById("ruta");
const campoBus = document.getElementById("bus");
const campoChofer = document.getElementById("chofer");
const campoFecha = document.getElementById("fecha");
const campoHora = document.getElementById("hora");
const btnGuardar = document.getElementById("btnGuardar");
const btnCancelar = document.getElementById("btnCancelar");
const tabla = document.getElementById("tabla");
const mensaje = document.getElementById("mensaje");

async function tokenCsrf() {
    const respuesta = await fetch("/api/auth/csrf");
    if (!respuesta.ok) {
        throw new Error("No se pudo validar la sesión");
    }
    return (await respuesta.json()).token;
}

function mostrarMensaje(texto, esError) {
    mensaje.textContent = texto;
    mensaje.className = esError ? "error" : "ok";
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

// Llena un <select> con una opción vacía inicial y una opción por cada elemento.
function llenarSelect(select, elementos, textoDe, textoInicial) {
    select.innerHTML = "";
    const inicial = document.createElement("option");
    inicial.value = "";
    inicial.textContent = textoInicial;
    select.appendChild(inicial);
    elementos.forEach(function (elemento) {
        const opcion = document.createElement("option");
        opcion.value = elemento.id;
        opcion.textContent = textoDe(elemento);
        select.appendChild(opcion);
    });
}

// Carga las 3 listas desplegables. Solo se ofrecen buses ACTIVOS (un bus en mantenimiento no puede viajar).
async function cargarListas() {
    try {
        const [rutasR, busesR, choferesR] = await Promise.all([
            fetch("/api/rutas"),
            fetch("/api/buses"),
            fetch("/api/choferes")
        ]);
        if (!rutasR.ok || !busesR.ok || !choferesR.ok) {
            mostrarMensaje("No se pudieron cargar las rutas, buses o choferes", true);
            return false;
        }
        const rutas = await rutasR.json();
        const buses = await busesR.json();
        const choferes = await choferesR.json();

        llenarSelect(campoRuta, rutas,
            function (r) { return r.origen + " → " + r.destino; }, "Ruta");
        llenarSelect(campoBus, buses.filter(function (b) { return (b.estado || "").toUpperCase() === "ACTIVO"; }),
            function (b) { return b.placa + " - " + b.modelo; }, "Bus");
        llenarSelect(campoChofer, choferes,
            function (c) { return c.nombre + " " + c.apellidos; }, "Chofer");
        return true;
    } catch (e) {
        mostrarMensaje("No se pudo conectar con el servidor", true);
        return false;
    }
}

// GET /api/viajes -> dibuja la tabla con los viajes guardados en PostgreSQL
async function cargarViajes(mensajeExito) {
    try {
        const respuesta = await fetch(URL_API);
        if (!respuesta.ok) {
            const error = await textoDeError(respuesta);
            mostrarMensaje(
                mensajeExito
                    ? mensajeExito + ", pero no se pudo actualizar la tabla: " + error
                    : error,
                true
            );
            return false;
        }
        const viajes = await respuesta.json();
        dibujarTabla(viajes);
        if (mensajeExito) {
            mostrarMensaje(mensajeExito, false);
        }
        return true;
    } catch (e) {
        const error = "No se pudo conectar con el servidor";
        mostrarMensaje(
            mensajeExito
                ? mensajeExito + ", pero no se pudo actualizar la tabla: " + error
                : error,
            true
        );
        return false;
    }
}

function crearBoton(texto, accion) {
    const boton = document.createElement("button");
    boton.textContent = texto;
    boton.onclick = accion;
    return boton;
}

function dibujarTabla(viajes) {
    tabla.innerHTML = "";
    viajes.forEach(function (viaje) {
        const fila = document.createElement("tr");

        [viaje.id, viaje.origen + " → " + viaje.destino, viaje.fechaSalida,
         (viaje.horaSalida || "").substring(0, 5), viaje.placaBus, viaje.nombreChofer, viaje.estado]
            .forEach(function (valor) {
                const celda = document.createElement("td");
                celda.textContent = valor;
                fila.appendChild(celda);
            });

        // Los botones dependen del estado: así solo se muestran las acciones permitidas.
        const acciones = document.createElement("td");
        if (viaje.estado === "PROGRAMADO") {
            acciones.appendChild(crearBoton("Editar", function () { prepararEdicion(viaje); }));
            acciones.appendChild(crearBoton("Iniciar", function () { cambiarEstado(viaje.id, "EN CURSO"); }));
            acciones.appendChild(crearBoton("Cancelar", function () { cambiarEstado(viaje.id, "CANCELADO"); }));
        }
        if (viaje.estado === "EN CURSO") {
            acciones.appendChild(crearBoton("Finalizar", function () { cambiarEstado(viaje.id, "FINALIZADO"); }));
        }
        if (viaje.estado === "PROGRAMADO" || viaje.estado === "CANCELADO") {
            acciones.appendChild(crearBoton("Eliminar", function () { eliminarViaje(viaje.id); }));
        }
        fila.appendChild(acciones);
        tabla.appendChild(fila);
    });
}

// Al enviar el formulario: si hay id es una edición (PUT), si no es un viaje nuevo (POST)
formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    const viaje = {
        idRuta: parseInt(campoRuta.value),
        idBus: parseInt(campoBus.value),
        idChofer: parseInt(campoChofer.value),
        fechaSalida: campoFecha.value,
        horaSalida: campoHora.value
    };

    const editando = campoId.value !== "";
    const url = editando ? URL_API + "/" + campoId.value : URL_API;
    const metodo = editando ? "PUT" : "POST";

    try {
        const respuesta = await fetch(url, {
            method: metodo,
            headers: {
                "Content-Type": "application/json",
                "X-XSRF-TOKEN": await tokenCsrf()
            },
            body: JSON.stringify(viaje)
        });

        if (!respuesta.ok) {
            mostrarMensaje(await textoDeError(respuesta), true);
            return;
        }

        limpiarFormulario();
        await cargarViajes(editando ? "Viaje actualizado" : "Viaje programado");
    } catch (e) {
        mostrarMensaje("No se pudo conectar con el servidor", true);
    }
});

// PATCH /api/viajes/{id}/estado -> iniciar, finalizar o cancelar
async function cambiarEstado(id, estado) {
    if (!confirm("¿Cambiar el viaje " + id + " a " + estado + "?")) {
        return;
    }
    try {
        const respuesta = await fetch(URL_API + "/" + id + "/estado", {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "X-XSRF-TOKEN": await tokenCsrf()
            },
            body: JSON.stringify({ estado: estado })
        });
        if (!respuesta.ok) {
            mostrarMensaje(await textoDeError(respuesta), true);
            return;
        }
        await cargarViajes("Viaje " + id + ": " + estado);
    } catch (e) {
        mostrarMensaje("No se pudo conectar con el servidor", true);
    }
}

// DELETE /api/viajes/{id}
async function eliminarViaje(id) {
    if (!confirm("¿Eliminar el viaje " + id + "?")) {
        return;
    }
    try {
        const respuesta = await fetch(URL_API + "/" + id, {
            method: "DELETE",
            headers: { "X-XSRF-TOKEN": await tokenCsrf() }
        });
        if (respuesta.status === 204) {
            await cargarViajes("Viaje eliminado");
        } else {
            mostrarMensaje(await textoDeError(respuesta), true);
        }
    } catch (e) {
        mostrarMensaje("No se pudo conectar con el servidor", true);
    }
}

// Pone los datos del viaje en el formulario para editarlos
function prepararEdicion(viaje) {
    campoId.value = viaje.id;
    campoRuta.value = viaje.idRuta;
    campoBus.value = viaje.idBus;
    campoChofer.value = viaje.idChofer;
    campoFecha.value = viaje.fechaSalida;
    campoHora.value = (viaje.horaSalida || "").substring(0, 5);
    btnGuardar.textContent = "Guardar cambios";
    btnCancelar.hidden = false;
}

function limpiarFormulario() {
    formulario.reset();
    campoId.value = "";
    btnGuardar.textContent = "Programar viaje";
    btnCancelar.hidden = true;
}

btnCancelar.addEventListener("click", limpiarFormulario);

// No se pueden programar viajes en fechas pasadas (el backend también lo valida).
campoFecha.min = new Date().toISOString().substring(0, 10);

// Al abrir la página: primero las listas desplegables y luego la tabla de viajes
cargarListas().then(function () { cargarViajes(); });
