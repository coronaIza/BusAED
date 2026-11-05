// Frontend del módulo de Rutas.
// Se comunica con la API REST real (/api/rutas) usando fetch. No hay datos de ejemplo.
// Recorrido: formulario -> fetch -> RutaControlador -> RutaNegocio -> RutaDAO -> PostgreSQL -> respuesta -> tabla.

const URL_API = "/api/rutas";

const formulario = document.getElementById("formulario");
const campoId = document.getElementById("id");
const campoOrigen = document.getElementById("origen");
const campoDestino = document.getElementById("destino");
const campoPrecio = document.getElementById("precio");
const campoDuracion = document.getElementById("duracion");
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

// GET /api/rutas -> dibuja la tabla con las rutas guardadas en PostgreSQL
async function cargarRutas(mensajeExito) {
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
        const rutas = await respuesta.json();
        dibujarTabla(rutas);
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

function dibujarTabla(rutas) {
    tabla.innerHTML = "";
    rutas.forEach(function (ruta) {
        const fila = document.createElement("tr");

        [ruta.id, ruta.origen, ruta.destino, "S/ " + Number(ruta.precioBase).toFixed(2), ruta.duracionEstimada || ""]
            .forEach(function (valor) {
                const celda = document.createElement("td");
                celda.textContent = valor;
                fila.appendChild(celda);
            });

        const acciones = document.createElement("td");

        const btnEditar = document.createElement("button");
        btnEditar.textContent = "Editar";
        btnEditar.onclick = function () { prepararEdicion(ruta); };

        const btnEliminar = document.createElement("button");
        btnEliminar.textContent = "Eliminar";
        btnEliminar.onclick = function () { eliminarRuta(ruta.id); };

        acciones.appendChild(btnEditar);
        acciones.appendChild(btnEliminar);
        fila.appendChild(acciones);
        tabla.appendChild(fila);
    });
}

// Al enviar el formulario: si hay id es una edición (PUT), si no es un registro nuevo (POST)
formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    const ruta = {
        origen: campoOrigen.value,
        destino: campoDestino.value,
        precioBase: parseFloat(campoPrecio.value),
        duracionEstimada: campoDuracion.value
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
            body: JSON.stringify(ruta)
        });

        if (!respuesta.ok) {
            mostrarMensaje(await textoDeError(respuesta), true);
            return;
        }

        limpiarFormulario();
        await cargarRutas(editando ? "Ruta actualizada" : "Ruta registrada");
    } catch (e) {
        mostrarMensaje("No se pudo conectar con el servidor", true);
    }
});

// DELETE /api/rutas/{id}
async function eliminarRuta(id) {
    if (!confirm("¿Eliminar la ruta " + id + "?")) {
        return;
    }
    try {
        const respuesta = await fetch(URL_API + "/" + id, {
            method: "DELETE",
            headers: { "X-XSRF-TOKEN": await tokenCsrf() }
        });
        if (respuesta.status === 204) {
            await cargarRutas("Ruta eliminada");
        } else {
            mostrarMensaje(await textoDeError(respuesta), true);
        }
    } catch (e) {
        mostrarMensaje("No se pudo conectar con el servidor", true);
    }
}

// Pone los datos de la ruta en el formulario para editarlos
function prepararEdicion(ruta) {
    campoId.value = ruta.id;
    campoOrigen.value = ruta.origen;
    campoDestino.value = ruta.destino;
    campoPrecio.value = ruta.precioBase;
    campoDuracion.value = ruta.duracionEstimada || "";
    btnGuardar.textContent = "Guardar cambios";
    btnCancelar.hidden = false;
}

function limpiarFormulario() {
    formulario.reset();
    campoId.value = "";
    btnGuardar.textContent = "Registrar ruta";
    btnCancelar.hidden = true;
}

btnCancelar.addEventListener("click", limpiarFormulario);

// Al abrir la página se cargan las rutas
cargarRutas();
