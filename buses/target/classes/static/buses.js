// Frontend del módulo de Buses.
// Se comunica con la API REST real (/api/buses) usando fetch. No hay datos de ejemplo.
// Recorrido: formulario -> fetch -> BusControlador -> BusNegocio -> BusDAO -> PostgreSQL -> respuesta -> tabla.

const URL_API = "/api/buses";

const formulario = document.getElementById("formulario");
const campoId = document.getElementById("id");
const campoPlaca = document.getElementById("placa");
const campoModelo = document.getElementById("modelo");
const campoCapacidad = document.getElementById("capacidad");
const campoEstado = document.getElementById("estado");
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

// GET /api/buses -> dibuja la tabla con los buses guardados en PostgreSQL
async function cargarBuses(mensajeExito) {
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
        const buses = await respuesta.json();
        dibujarTabla(buses);
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

function dibujarTabla(buses) {
    tabla.innerHTML = "";
    buses.forEach(function (bus) {
        const fila = document.createElement("tr");

        [bus.id, bus.placa, bus.modelo, bus.capacidad, bus.estado].forEach(function (valor) {
            const celda = document.createElement("td");
            celda.textContent = valor;
            fila.appendChild(celda);
        });

        const acciones = document.createElement("td");

        const btnEditar = document.createElement("button");
        btnEditar.textContent = "Editar";
        btnEditar.onclick = function () { prepararEdicion(bus); };

        const btnEliminar = document.createElement("button");
        btnEliminar.textContent = "Eliminar";
        btnEliminar.onclick = function () { eliminarBus(bus.id); };

        acciones.appendChild(btnEditar);
        acciones.appendChild(btnEliminar);
        fila.appendChild(acciones);
        tabla.appendChild(fila);
    });
}

// Al enviar el formulario: si hay id es una edición (PUT), si no es un registro nuevo (POST)
formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    const bus = {
        placa: campoPlaca.value,
        modelo: campoModelo.value,
        capacidad: parseInt(campoCapacidad.value),
        estado: campoEstado.value
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
            body: JSON.stringify(bus)
        });

        if (!respuesta.ok) {
            mostrarMensaje(await textoDeError(respuesta), true);
            return;
        }

        limpiarFormulario();
        await cargarBuses(editando ? "Bus actualizado" : "Bus registrado");
    } catch (e) {
        mostrarMensaje("No se pudo conectar con el servidor", true);
    }
});

// DELETE /api/buses/{id}
async function eliminarBus(id) {
    if (!confirm("¿Eliminar el bus " + id + "?")) {
        return;
    }
    try {
        const respuesta = await fetch(URL_API + "/" + id, {
            method: "DELETE",
            headers: { "X-XSRF-TOKEN": await tokenCsrf() }
        });
        if (respuesta.status === 204) {
            await cargarBuses("Bus eliminado");
        } else {
            mostrarMensaje(await textoDeError(respuesta), true);
        }
    } catch (e) {
        mostrarMensaje("No se pudo conectar con el servidor", true);
    }
}

// Pone los datos del bus en el formulario para editarlos
function prepararEdicion(bus) {
    campoId.value = bus.id;
    campoPlaca.value = bus.placa;
    campoModelo.value = bus.modelo;
    campoCapacidad.value = bus.capacidad;
    campoEstado.value = bus.estado;
    btnGuardar.textContent = "Guardar cambios";
    btnCancelar.hidden = false;
}

function limpiarFormulario() {
    formulario.reset();
    campoId.value = "";
    btnGuardar.textContent = "Registrar bus";
    btnCancelar.hidden = true;
}

btnCancelar.addEventListener("click", limpiarFormulario);

// Al abrir la página se cargan los buses
cargarBuses();
