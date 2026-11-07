const selectViaje = document.getElementById("viaje");
const grillaAsientos = document.getElementById("grillaAsientos");
const btnReservar = document.getElementById("btnReservar");
const mensaje = document.getElementById("mensaje");
const asientoSeleccionado = document.getElementById("asientoSeleccionado");
const tablaReservas = document.getElementById("tablaReservas");

let asientoActivo = null;
let viajesCargados = [];
let ventasOcupadas = [];
let reservando = false;

async function obtenerCsrf() {
    const respuesta = await fetch("/api/auth/csrf");
    if (!respuesta.ok) {
        throw new Error("No se pudo validar la sesión");
    }
    return (await respuesta.json()).token;
}

function mostrarMensaje(texto, esError) {
    mensaje.textContent = texto;
    mensaje.className = `alert alert-${esError ? "danger" : "success"}`;
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
        viajesCargados = viajes;
        viajes.forEach(function (viaje) {
            const opcion = document.createElement("option");
            opcion.value = viaje.id;
            opcion.textContent = `${viaje.origen} → ${viaje.destino} · ${viaje.fechaSalida} ${viaje.horaSalida}`;
            selectViaje.appendChild(opcion);
        });
        const idSolicitado = new URLSearchParams(location.search).get("viaje");
        if (idSolicitado && viajes.some(viaje => String(viaje.id) === idSolicitado)) {
            selectViaje.value = idSolicitado;
            mostrarResumenViaje(idSolicitado);
            cargarDisponibilidad();
        }
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
        const ventasRespuesta = await fetch("/api/ventas");
        const ventas = ventasRespuesta.ok ? await ventasRespuesta.json() : [];
        ventasOcupadas = ventas
            .filter(venta => String(venta.idViaje) === String(viajeId) && venta.estado !== "ANULADO")
            .map(venta => Number(venta.numeroAsiento));
        datos.ocupados = [...new Set([...(datos.ocupados || []), ...ventasOcupadas].map(Number))];
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
        boton.className = "asiento btn btn-sm";
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
                btnReservar.disabled = false;
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
            const viaje = viajesCargados.find(item => String(item.id) === String(reserva.idViaje));
            const card = document.createElement("div");
            card.className = "col-md-6";
            const claseEstado = reserva.estado === "CANCELADO" ? "danger" :
                reserva.estado === "PAGADO" ? "success" : reserva.estado === "COMPLETADO" ? "dark" : "primary";
            card.innerHTML = `<div class="card border-0 shadow-sm h-100"><div class="card-body">
                <div class="d-flex justify-content-between gap-2"><strong>${viaje ? `${viaje.origen} → ${viaje.destino}` : `Viaje #${reserva.idViaje}`}</strong><span class="badge bg-${claseEstado}">${reserva.estado}</span></div>
                ${viaje ? `<p class="mb-1 mt-2"><i class="bi bi-calendar3"></i> ${viaje.fechaSalida || "-"} · ${viaje.horaSalida || "-"}</p>` : ""}
                <p class="mb-1 mt-2">Asiento ${reserva.numeroAsiento}</p>
                <small class="text-muted">${reserva.fechaReserva ? reserva.fechaReserva.replace("T", " ") : "-"}</small>
                <p class="mt-2 mb-0">Pago vence: <strong>${reserva.fechaVencimiento ? reserva.fechaVencimiento.substring(0, 16).replace("T", " ") : "-"}</strong></p>
                </div></div>`;
            if (!["CANCELADO", "COMPLETADO"].includes(reserva.estado)) {
                const cancelar = document.createElement("button");
                cancelar.className = "btn btn-outline-danger btn-sm ms-3 mb-3";
                cancelar.textContent = "Cancelar";
                cancelar.addEventListener("click", () => cancelarReserva(reserva.id));
                card.querySelector(".card").appendChild(cancelar);
            }
            tablaReservas.appendChild(card);
        });
    } catch (error) {
        mostrarMensaje(error.message || "No se pudieron cargar las reservas", true);
    }
}

async function reservarAsiento() {
    if (reservando) return;
    const viajeId = Number(selectViaje.value);
    if (!viajeId || !asientoActivo) {
        mostrarMensaje("Primero selecciona un viaje y un asiento", true);
        return;
    }

    try {
        reservando = true;
        btnReservar.disabled = true;
        btnReservar.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Reservando...';
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
    } finally {
        reservando = false;
        btnReservar.text = "";
        btnReservar.innerHTML = '<i class="bi bi-check2-circle"></i> Confirmar reserva';
        btnReservar.disabled = !asientoActivo;
    }
}

async function cancelarReserva(idReserva) {
    if (!confirm("¿Confirmas que deseas cancelar esta reserva?")) return;
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

btnReservar.addEventListener("click", reservarAsiento);
function mostrarResumenViaje(viajeId) {
    const viaje = viajesCargados.find(v => String(v.id) === String(viajeId));
    document.getElementById("detalleViaje").innerHTML = viaje
        ? `${viaje.origen} → ${viaje.destino}<br>${viaje.fechaSalida} · ${viaje.horaSalida}<br>S/ ${Number(viaje.precio || 0).toFixed(2)} · ${viaje.duracionHoras || "-"} h`
        : "Selecciona un viaje.";
}
selectViaje.addEventListener("change", function () {
    asientoActivo = null;
    asientoSeleccionado.textContent = "Ninguno";
    btnReservar.disabled = true;
    if (selectViaje.value) {
        cargarDisponibilidad();
    } else {
        grillaAsientos.innerHTML = "";
    }
    mostrarResumenViaje(selectViaje.value);
});

cargarViajes();
cargarMisReservas();
