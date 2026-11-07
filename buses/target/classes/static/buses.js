const URL_API = "/api/buses";

const formulario = document.getElementById("formulario");
const campoId = document.getElementById("id");
const campoPlaca = document.getElementById("placa");
const campoModelo = document.getElementById("modelo");
const campoCapacidad = document.getElementById("capacidad");
const campoEstado = document.getElementById("estado");

// Solución al fallo: Buscamos los botones de manera segura aunque no tengan ID
const btnGuardar = document.getElementById("btnGuardar") || (formulario ? formulario.querySelector("button[type='submit']") : null);
const btnCancelar = document.getElementById("btnCancelar"); 

const tabla = document.getElementById("tabla");
const mensaje = document.getElementById("mensaje");

async function tokenCsrf() {
    const respuesta = await fetch("/api/auth/csrf");
    if (!respuesta.ok) throw new Error("No se pudo validar la sesión");
    return (await respuesta.json()).token;
}

function mostrarMensaje(texto, esError) {
    if(mensaje) {
        mensaje.textContent = texto;
        mensaje.className = esError ? "text-danger fw-bold mt-2" : "text-success fw-bold mt-2";
    }
}

async function cargarBuses() {
    try {
        const respuesta = await fetch(URL_API);
        if (!respuesta.ok) {
            mostrarMensaje("Error al obtener buses del servidor", true);
            return;
        }
        const buses = await respuesta.json();
        dibujarTabla(buses);
    } catch (e) {
        console.error("Error en cargarBuses:", e);
        mostrarMensaje("Error de conexión al servidor", true);
    }
}

function dibujarTabla(buses) {
    if (!tabla) return;
    tabla.innerHTML = "";

    // Si la lista está vacía, mostramos el mensaje en la tabla
    if (!Array.isArray(buses) || buses.length === 0) {
        tabla.innerHTML = "<tr><td colspan='6' class='text-center text-muted'>No hay buses registrados o error en datos.</td></tr>";
        return;
    }
    
    buses.forEach(function (bus) {
        const fila = document.createElement("tr");
        let estadoTexto = bus.estado ? bus.estado.toUpperCase() : "DESCONOCIDO";
        let estadoColor = estadoTexto === 'ACTIVO' ? 'bg-success' : 
                          estadoTexto === 'MANTENIMIENTO' ? 'bg-warning text-dark' : 'bg-secondary';

        fila.innerHTML = `
            <td>${bus.id || '-'}</td>
            <td class="fw-bold">${bus.placa || '-'}</td>
            <td>${bus.modelo || '-'}</td>
            <td>${bus.capacidad || '-'}</td> 
            <td><span class="badge ${estadoColor}">${estadoTexto}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1 btn-editar" data-id="${bus.id}">
                    <i class="bi bi-pencil"></i> Editar
                </button>
                <button class="btn btn-sm btn-outline-danger btn-eliminar" data-id="${bus.id}">
                    <i class="bi bi-trash"></i> Eliminar
                </button>
            </td>
        `;
        tabla.appendChild(fila);
    });

    // Asignar los eventos de clic a los botones nuevos
    document.querySelectorAll('.btn-editar').forEach(btn => {
        btn.addEventListener('click', function() {
            const busId = parseInt(this.getAttribute('data-id'));
            const bus = buses.find(b => b.id === busId);
            if (bus) prepararEdicion(bus);
        });
    });

    document.querySelectorAll('.btn-eliminar').forEach(btn => {
        btn.addEventListener('click', function() {
            const busId = parseInt(this.getAttribute('data-id'));
            eliminarBus(busId);
        });
    });
}

if(formulario) {
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
                mostrarMensaje("Error al guardar el bus", true);
                return;
            }

            limpiarFormulario();
            mostrarMensaje(editando ? "Bus actualizado exitosamente" : "Bus registrado exitosamente", false);
            setTimeout(() => { if(mensaje) mensaje.textContent = ""; }, 3000);
            cargarBuses();
        } catch (e) {
            mostrarMensaje("No se pudo conectar con el servidor", true);
        }
    });
}

async function eliminarBus(id) {
    if (!confirm("¿Seguro que deseas eliminar el bus " + id + "?")) return;
    
    try {
        const respuesta = await fetch(URL_API + "/" + id, {
            method: "DELETE",
            headers: { "X-XSRF-TOKEN": await tokenCsrf() }
        });
        if (respuesta.status === 204 || respuesta.ok) {
            mostrarMensaje("Bus eliminado", false);
            setTimeout(() => { if(mensaje) mensaje.textContent = ""; }, 3000);
            cargarBuses();
        } else {
            mostrarMensaje("Error al eliminar", true);
        }
    } catch (e) {
        mostrarMensaje("No se pudo conectar con el servidor", true);
    }
}

function prepararEdicion(bus) {
    campoId.value = bus.id;
    campoPlaca.value = bus.placa;
    campoModelo.value = bus.modelo;
    campoCapacidad.value = bus.capacidad;
    campoEstado.value = bus.estado;
    if(btnGuardar) btnGuardar.textContent = "Guardar cambios";
    if(btnCancelar) btnCancelar.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Sube la pantalla al formulario
}

function limpiarFormulario() {
    if(formulario) formulario.reset();
    campoId.value = "";
    if(btnGuardar) btnGuardar.textContent = "Guardar Bus";
    if(btnCancelar) btnCancelar.hidden = true;
}

if(btnCancelar) {
    btnCancelar.addEventListener("click", limpiarFormulario);
}

// Iniciar la carga
cargarBuses();