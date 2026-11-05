// Frontend del chofer.
// Recorrido: chofer.js -> GET /api/viajes/mi-hoja -> ViajeControlador -> ViajeNegocio -> ViajeDAO -> PostgreSQL.
// El backend sabe quién es el chofer por la sesión: aquí NUNCA se envía un id de chofer.

document.addEventListener("DOMContentLoaded", () => {
    const tablaViajes = document.getElementById("tablaViajes");
    const mensajeViajes = document.getElementById("mensajeChofer");
    
    // Elementos de la interfaz para interactuar (Tarjetas y sección oculta)
    const btnConsultarRuta = document.getElementById("btnConsultarRuta");
    const btnRegistroViaje = document.getElementById("btnRegistroViaje");
    const seccionHojaRuta = document.getElementById("seccionHojaRuta");
    const btnCerrarSeccion = document.getElementById("btnCerrarSeccion");
    
    let usuarioCargado = false;

    // Mostrar/Ocultar sección al hacer clic en las tarjetas
    if (btnConsultarRuta) btnConsultarRuta.addEventListener("click", () => mostrarSeccionHojaRuta());
    if (btnRegistroViaje) btnRegistroViaje.addEventListener("click", () => mostrarSeccionHojaRuta());
    if (btnCerrarSeccion) btnCerrarSeccion.addEventListener("click", () => seccionHojaRuta.style.display = "none");

    function mostrarSeccionHojaRuta() {
        seccionHojaRuta.style.display = "block";
        cargarHojaDeRuta();
        // Desplaza la pantalla suavemente hacia la tabla
        seccionHojaRuta.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function mostrarMensaje(texto, esError) {
        if (!mensajeViajes) return;
        mensajeViajes.textContent = texto;
        mensajeViajes.className = esError ? "text-danger fw-bold text-center mt-2" : "text-success fw-bold text-center mt-2";
        if (texto) {
            setTimeout(() => mensajeViajes.textContent = "", 4000);
        }
    }

    async function obtenerCsrf() {
        const respuesta = await fetch("/api/auth/csrf");
        if (!respuesta.ok) throw new Error("No se pudo validar la sesión");
        return (await respuesta.json()).token;
    }

    async function textoDeError(respuesta) {
        try {
            const datos = await respuesta.json();
            return datos.error || "Error " + respuesta.status;
        } catch (e) {
            return "Error " + respuesta.status;
        }
    }

    // GET /api/viajes/mi-hoja -> solo los viajes asignados a este chofer
    async function cargarHojaDeRuta(mensajeExito) {
        try {
            // 1. Cargar el saludo de usuario solo en el primer inicio de la página
            if (!usuarioCargado) {
                const usuarioRespuesta = await fetch("/api/auth/me");
                if (usuarioRespuesta.ok) {
                    const usuario = await usuarioRespuesta.json();
                    const saludoEl = document.getElementById("saludo");
                    if(saludoEl) saludoEl.textContent = "Hola, " + usuario.nombre;
                    usuarioCargado = true;
                }
            }

            // 2. Obtener la lista de viajes actualizada
            const viajesRespuesta = await fetch("/api/viajes/mi-hoja");
            if (!viajesRespuesta.ok) {
                throw new Error(await textoDeError(viajesRespuesta));
            }

            const viajes = await viajesRespuesta.json();

            // 3. Renderizar la tabla con diseño Bootstrap
            tablaViajes.innerHTML = "";
            
            if (viajes.length === 0) {
                tablaViajes.innerHTML = "<tr><td colspan='5' class='text-muted py-4'>No tienes viajes asignados en este momento.</td></tr>";
                if (mensajeExito) mostrarMensaje(mensajeExito, false);
                return;
            }

            viajes.forEach(function (viaje) {
                const fila = document.createElement("tr");

                // Badge de colores para el estado
                let estadoColor = viaje.estado === 'EN CURSO' ? 'bg-primary' : 
                                  viaje.estado === 'FINALIZADO' ? 'bg-success' : 'bg-secondary';

                // Lógica de botones de registro de inicio/fin
                let botonAccion = "";
                if (viaje.estado === "PROGRAMADO") {
                    botonAccion = `<button class="btn btn-sm btn-primary w-100 btn-accion-viaje" data-id="${viaje.id}" data-estado="EN CURSO">
                                     <i class="bi bi-play-circle"></i> Iniciar Viaje
                                   </button>`;
                } else if (viaje.estado === "EN CURSO") {
                    botonAccion = `<button class="btn btn-sm btn-success w-100 btn-accion-viaje" data-id="${viaje.id}" data-estado="FINALIZADO">
                                     <i class="bi bi-stop-circle"></i> Finalizar Viaje
                                   </button>`;
                } else {
                    botonAccion = `<span class="text-muted"><i class="bi bi-check2-all"></i> Completado</span>`;
                }

                fila.innerHTML = `
                    <td class="fw-bold">${viaje.origen || '-'} → ${viaje.destino || '-'}</td>
                    <td>${viaje.fechaSalida || '-'} <br> <small class="text-muted">${(viaje.horaSalida || "").substring(0, 5)}</small></td>
                    <td>${viaje.placaBus || 'Sin asignar'}</td>
                    <td><span class="badge ${estadoColor} p-2">${viaje.estado}</span></td>
                    <td>${botonAccion}</td>
                `;
                tablaViajes.appendChild(fila);
            });

            // Asignar eventos a los botones dinámicos generados
            document.querySelectorAll('.btn-accion-viaje').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = this.getAttribute('data-id');
                    const nuevoEstado = this.getAttribute('data-estado');
                    cambiarEstado(id, nuevoEstado);
                });
            });

            if (mensajeExito) {
                mostrarMensaje(mensajeExito, false);
            }

        } catch (error) {
            mostrarMensaje(error.message || "No se pudieron cargar los viajes", true);
        }
    }

    // PATCH /api/viajes/mi-hoja/{id}/estado -> iniciar o finalizar un viaje propio
    async function cambiarEstado(id, estado) {
        if (!confirm(`¿Confirmas que deseas registrar el viaje como: ${estado}?`)) {
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
            await cargarHojaDeRuta("El viaje ha sido registrado como: " + estado + " exitosamente.");
        } catch (error) {
            mostrarMensaje("No se pudo conectar con el servidor", true);
        }
    }

    // Cerrar Sesión
    const btnSalir = document.getElementById("btnSalir");
    if (btnSalir) {
        btnSalir.addEventListener("click", async function () {
            try {
                const respuesta = await fetch("/api/auth/logout", {
                    method: "POST",
                    headers: { "X-XSRF-TOKEN": await obtenerCsrf() }
                });
                // Aunque falle, cerramos la sesión en el navegador por seguridad
                window.location.assign("/login.html");
            } catch (error) {
                window.location.assign("/login.html");
            }
        });
    }

    // Inicializar (oculto visualmente pero carga el nombre del chofer)
    cargarHojaDeRuta();
});