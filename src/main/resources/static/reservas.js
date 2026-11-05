const selectViaje = document.getElementById("viaje");
const grillaAsientos = document.getElementById("grillaAsientos");
const btnCargarAsientos = document.getElementById("btnCargarAsientos");
const btnReservar = document.getElementById("btnReservar");
const mensaje = document.getElementById("mensaje");
const asientoSeleccionado = document.getElementById("asientoSeleccionado");
const tablaReservas = document.getElementById("tablaReservas");

let asientoActivo = null;

async function obtenerCsrf() {
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

function limpiarMensaje() {
    mensaje.textContent = "";
    mensaje.className = "";
}

async function cargarViajes() {
    try {
        const respuesta = await fetch("/api/viajes");
        if (!respuesta.ok) {
            throw new Error("No se pudieron cargar los viajes");
        }
        const viajes = await respuesta.json();
        selectViaje.innerHTML = "<option value=''>Seleccione un viaje</option>";
        viajes.forEach(function (viaje) {
            const opcion = document.createElement("option");
            opcion.value = viaje.id;
            opcion.textContent = `${viaje.origen} → ${viaje.destino} · ${viaje.fechaSalida} ${viaje.horaSalida}`;
            selectViaje.appendChild(opcion);
        });
    } catch (error) {
        mostrarMensaje(error.message || "No se pudieron cargar los viajes", true);
    }
}

async function cargarDisponibilidad() {
    const viajeId = selectViaje.value;
    if (!viajeId) {
        grillaAsientos.innerHTML = "";
        asientoActivo = null;
        asientoSeleccionado.textContent = "Ninguno";
        mostrarMensaje("Elige un viaje para consultar asientos", true);
        return;
    }

    try {
        limpiarMensaje();
        const respuesta = await fetch(`/api/reservas/viaje/${viajeId}/disponibilidad`);
        if (!respuesta.ok) {
            throw new Error("No se pudo consultar la disponibilidad");
        }
        const datos = await respuesta.json();
        renderAsientos(datos);
    } catch (error) {
        mostrarMensaje(error.message || "No se pudo consultar la disponibilidad", true);
    }
}

function renderAsientos(datos) {
    grillaAsientos.innerHTML = "";
    const capacidad = Number(datos.capacidad || 0);
    const ocupados = new Set((datos.ocupados || []).map(Number));

    for (let numero = 1; numero <= capacidad; numero++) {
        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = "asiento";
        boton.textContent = String(numero);

        if (ocupados.has(numero)) {
            boton.disabled = true;
            boton.classList.add("ocupado");
            boton.title = "Asiento ocupado";
        } else {
            boton.title = "Asiento libre";
            boton.addEventListener("click", function () {
                asientoActivo = numero;
                asientoSeleccionado.textContent = numero;
                document.querySelectorAll(".asiento").forEach(function (elemento) {
                    elemento.classList.remove("seleccionado");
                });
                boton.classList.add("seleccionado");
            });
        }

        if (asientoActivo === numero) {
            boton.classList.add("seleccionado");
        }

        grillaAsientos.appendChild(boton);
    }

    if (capacidad === 0) {
        mostrarMensaje("El viaje no tiene capacidad disponible", true);
    }
}

async function cargarMisReservas() {
    try {
        const respuesta = await fetch("/api/reservas/mis-reservas");
        if (!respuesta.ok) {
            throw new Error("No se pudieron cargar tus reservas");
        }
        const reservas = await respuesta.json();
        tablaReservas.innerHTML = "";

        if (!reservas.length) {
            tablaReservas.innerHTML = '<tr><td colspan="5">No tienes reservas confirmadas.</td></tr>';
            return;
        }

        reservas.forEach(function (reserva) {
            const fila = document.createElement("tr");
            const viaje = document.createElement("td");
            viaje.textContent = `#${reserva.idViaje}`;

            const asiento = document.createElement("td");
            asiento.textContent = reserva.numeroAsiento;

            const estado = document.createElement("td");
            estado.textContent = reserva.estado;

            const fecha = document.createElement("td");
            fecha.textContent = reserva.fechaReserva ? reserva.fechaReserva.replace("T", " ").substring(0, 16) : "-";

            const accion = document.createElement("td");
            const botonCancelar = document.createElement("button");
            botonCancelar.type = "button";
            botonCancelar.textContent = "Cancelar";
            botonCancelar.addEventListener("click", function () {
                cancelarReserva(reserva.id);
            });
            accion.appendChild(botonCancelar);

            fila.append(viaje, asiento, estado, fecha, accion);
            tablaReservas.appendChild(fila);
        });
    } catch (error) {
        mostrarMensaje(error.message || "No se pudieron cargar las reservas", true);
    }
}

async function reservarAsiento() {
    const viajeId = Number(selectViaje.value);
    if (!viajeId || !asientoActivo) {
        mostrarMensaje("Primero selecciona un viaje y un asiento", true);
        return;
    }

    try {
        const respuesta = await fetch("/api/reservas", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-XSRF-TOKEN": await obtenerCsrf()
            },
            body: JSON.stringify({
                idViaje: viajeId,
                numeroAsiento: asientoActivo
            })
        });

        const texto = await respuesta.text();
        let datos = {};
        try {
            datos = texto ? JSON.parse(texto) : {};
        } catch (error) {
            datos = {};
        }

        if (!respuesta.ok) {
            throw new Error(datos.error || "No se pudo crear la reserva");
        }

        mostrarMensaje(`Reserva confirmada para el asiento ${asientoActivo}`, false);
        asientoActivo = null;
        asientoSeleccionado.textContent = "Ninguno";
        await cargarDisponibilidad();
        await cargarMisReservas();
    } catch (error) {
        mostrarMensaje(error.message || "No se pudo reservar el asiento", true);
    }
}

async function cancelarReserva(idReserva) {
    try {
        const respuesta = await fetch(`/api/reservas/${idReserva}`, {
            method: "DELETE",
            headers: { "X-XSRF-TOKEN": await obtenerCsrf() }
        });

        if (!respuesta.ok) {
            const json = await respuesta.json().catch(() => ({}));
            throw new Error(json.error || "No se pudo cancelar la reserva");
        }

        mostrarMensaje("Reserva cancelada correctamente", false);
        await cargarDisponibilidad();
        await cargarMisReservas();
    } catch (error) {
        mostrarMensaje(error.message || "No se pudo cancelar la reserva", true);
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
        mostrarMensaje(error.message || "No se pudo cerrar la sesión", true);
    }
});

btnCargarAsientos.addEventListener("click", cargarDisponibilidad);
btnReservar.addEventListener("click", reservarAsiento);
selectViaje.addEventListener("change", function () {
    asientoActivo = null;
    asientoSeleccionado.textContent = "Ninguno";
    if (selectViaje.value) {
        cargarDisponibilidad();
    }
});

cargarViajes();
cargarMisReservas();
