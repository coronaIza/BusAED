const tablaViajes = document.getElementById("tablaViajes");
const mensajeViajes = document.getElementById("mensaje");

async function obtenerCsrf() {
    const respuesta = await fetch("/api/auth/csrf");
    if (!respuesta.ok) {
        throw new Error("No se pudo validar la sesión");
    }
    return (await respuesta.json()).token;
}

async function cargarViajes() {
    try {
        const [viajesRespuesta, usuarioRespuesta] = await Promise.all([
            fetch("/api/viajes"),
            fetch("/api/auth/me")
        ]);
        if (!viajesRespuesta.ok || !usuarioRespuesta.ok) {
            throw new Error("No se pudo cargar la información. Inicia sesión nuevamente.");
        }

        const usuario = await usuarioRespuesta.json();
        document.getElementById("saludo").textContent = "Hola, " + usuario.nombre;
        const viajes = await viajesRespuesta.json();
        tablaViajes.replaceChildren();
        viajes.forEach(function (viaje) {
            const fila = document.createElement("tr");
            [viaje.origen, viaje.destino, viaje.fechaSalida, viaje.horaSalida, viaje.estado]
                .forEach(function (valor) {
                    const celda = document.createElement("td");
                    celda.textContent = valor;
                    fila.appendChild(celda);
                });
            tablaViajes.appendChild(fila);
        });
        mensajeViajes.textContent = viajes.length ? "" : "No hay viajes disponibles por el momento.";
    } catch (error) {
        mensajeViajes.textContent = error.message || "No se pudieron cargar los viajes";
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
        mensajeViajes.textContent = error.message || "No se pudo conectar con el servidor";
    }
});

cargarViajes();
