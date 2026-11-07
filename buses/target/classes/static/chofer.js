// Frontend del chofer.
// Recorrido: chofer.js -> GET /api/viajes/mi-hoja -> ViajeControlador -> ViajeNegocio -> ViajeDAO -> PostgreSQL.
// El backend sabe quién es el chofer por la sesión: aquí NUNCA se envía un id de chofer.

document.addEventListener("DOMContentLoaded", () => {
    const tablaViajes = document.getElementById("tablaViajes");
    const mensajeViajes = document.getElementById("mensajeChofer");
    
    // Elementos de la interfaz para interactuar
    const btnConsultarRuta = document.getElementById("btnConsultarRuta");
    const btnRegistroViaje = document.getElementById("btnRegistroViaje");
    const seccionHojaRuta = document.getElementById("seccionHojaRuta");
    const btnCerrarSeccion = document.getElementById("btnCerrarSeccion");
    
    // Elementos dinámicos que cambian según el modo
    const tituloSeccion = document.getElementById("tituloSeccion");
    const columnaAccion = document.getElementById("columnaAccion");
    
    let usuarioCargado = false;
    let modoActual = 'consultar'; // Variable para saber en qué modo estamos

    const panelExtra = document.getElementById("panelChoferExtra");
    const panelPasajeros = document.getElementById("panelPasajeros");
    const panelIncidencias = document.getElementById("panelIncidencias");

    document.getElementById("btnValidarPasajeros")?.addEventListener("click", cargarPasajerosChofer);
    document.getElementById("btnIncidencia")?.addEventListener("click", mostrarIncidencia);
    document.getElementById("guardarIncidencia")?.addEventListener("click", guardarIncidencia);

    // Detectamos qué tarjeta se clickeó y pasamos el modo correspondiente
    if (btnConsultarRuta) btnConsultarRuta.addEventListener("click", () => mostrarSeccionHojaRuta('consultar'));
    if (btnRegistroViaje) btnRegistroViaje.addEventListener("click", () => mostrarSeccionHojaRuta('registro'));
    if (btnCerrarSeccion) btnCerrarSeccion.addEventListener("click", () => seccionHojaRuta.style.display = "none");

    function mostrarSeccionHojaRuta(modo) {
        modoActual = modo; // Guardamos el modo seleccionado
        seccionHojaRuta.style.display = "block";
        
        // Adaptamos la interfaz visualmente
        if (modo === 'consultar') {
            tituloSeccion.innerHTML = '<i class="bi bi-map"></i> Detalles de la Hoja de Ruta';
            columnaAccion.style.display = 'none'; // Ocultamos la cabecera de Acción
        } else if (modo === 'registro') {
            tituloSeccion.innerHTML = '<i class="bi bi-clock-history"></i> Registro de Inicio / Fin de Viaje';
            columnaAccion.style.display = ''; // Mostramos la cabecera de Acción
        }

        cargarHojaDeRuta(); // Llamamos a la base de datos
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
                // Ajustamos el colspan dependiendo del modo para que el mensaje no se vea chueco
                let columnas = modoActual === 'registro' ? 5 : 4;
                tablaViajes.innerHTML = `<tr><td colspan='${columnas}' class='text-muted py-4'>No tienes viajes asignados en este momento.</td></tr>`;
                if (mensajeExito) mostrarMensaje(mensajeExito, false);
                return;
            }

            viajes.forEach(function (viaje) {
                const fila = document.createElement("tr");

                let estadoColor = viaje.estado === 'EN CURSO' ? 'bg-primary' : 
                                  viaje.estado === 'FINALIZADO' ? 'bg-success' : 'bg-secondary';

                let tdAccion = ""; // Variable para la celda de acción
                
                // SOLO construimos la columna de botones si estamos en modo "registro"
                if (modoActual === 'registro') {
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
                    tdAccion = `<td>${botonAccion}</td>`;
                }

                fila.innerHTML = `
                    <td class="fw-bold">${viaje.origen || '-'} → ${viaje.destino || '-'}</td>
                    <td>${viaje.fechaSalida || '-'} <br> <small class="text-muted">${(viaje.horaSalida || "").substring(0, 5)}</small></td>
                    <td>${viaje.placaBus || 'Sin asignar'}</td>
                    <td><span class="badge ${estadoColor} p-2">${viaje.estado}</span></td>
                    ${tdAccion} <!-- Insertamos la celda (vacía en modo consultar, con botón en modo registro) -->
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

    async function viajesAsignados() {
        const respuesta = await fetch("/api/viajes/mi-hoja");
        return respuesta.ok ? respuesta.json() : [];
    }

    async function cargarPasajerosChofer() {
        panelExtra.classList.remove("d-none");
        panelPasajeros.classList.remove("d-none");
        panelIncidencias.classList.add("d-none");
        const viajes = await viajesAsignados();
        const lista = document.getElementById("listaPasajeros");
        if (!viajes.length) {
            lista.innerHTML = '<div class="alert alert-secondary">No hay viajes asignados.</div>';
            return;
        }
        lista.innerHTML = `<label class="form-label">Viaje</label><select class="form-select mb-3" id="viajePasajeros"></select><div id="listaPasajerosViaje"></div>`;
        const select = document.getElementById("viajePasajeros");
        viajes.forEach(v => select.insertAdjacentHTML("beforeend",
            `<option value="${v.id}">${v.origen} → ${v.destino} · ${v.fechaSalida}</option>`));
        select.addEventListener("change", () => cargarListaPasajeros(select.value));
        cargarListaPasajeros(select.value);
    }

    async function cargarListaPasajeros(idViaje) {
        const respuesta = await fetch(`/api/reservas/viaje/${idViaje}`);
        const pasajeros = respuesta.ok ? await respuesta.json() : [];
        const contenedor = document.getElementById("listaPasajerosViaje");
        contenedor.innerHTML = pasajeros.length ? pasajeros.map(p =>
            `<div class="d-flex justify-content-between align-items-center border-bottom py-2"><span><strong>${p.nombrePasajero || p.correoCliente}</strong><br><small>Asiento ${p.numeroAsiento}</small></span>
            <div class="btn-group"><button class="btn btn-sm btn-outline-success" onclick="marcarAbordaje(${p.id},'ABORDADO')">Abordó</button><button class="btn btn-sm btn-outline-secondary" onclick="marcarAbordaje(${p.id},'NO ABORDADO')">No abordó</button></div></div>`
        ).join("") : '<div class="alert alert-secondary">No hay pasajeros reservados.</div>';
    }

    window.marcarAbordaje = async function(idReserva, estado) {
        const respuesta = await fetch(`/api/reservas/${idReserva}/abordaje`, {
            method: "PATCH", headers: {"Content-Type":"application/json","X-XSRF-TOKEN":await obtenerCsrf()},
            body: JSON.stringify({estado})
        });
        mostrarMensaje(respuesta.ok ? `Pasajero marcado como ${estado}` : await textoDeError(respuesta), !respuesta.ok);
        const select = document.getElementById("viajePasajeros");
        if (select) cargarListaPasajeros(select.value);
    };

    async function mostrarIncidencia() {
        panelExtra.classList.remove("d-none");
        panelPasajeros.classList.add("d-none");
        panelIncidencias.classList.remove("d-none");
        const viajes = await viajesAsignados();
        const select = document.getElementById("incidenciaViaje");
        select.innerHTML = "";
        viajes.forEach(v => select.insertAdjacentHTML("beforeend",
            `<option value="${v.id}">${v.origen} → ${v.destino} · ${v.fechaSalida}</option>`));
    }

    async function guardarIncidencia() {
        const cuerpo = {
            idViaje: Number(document.getElementById("incidenciaViaje").value),
            tipo: document.getElementById("tipoIncidencia").value,
            descripcion: document.getElementById("descripcionIncidencia").value,
            fotos: document.getElementById("fotosIncidencia").value
        };
        const respuesta = await fetch("/api/incidencias", {
            method: "POST", headers: {"Content-Type":"application/json","X-XSRF-TOKEN":await obtenerCsrf()},
            body: JSON.stringify(cuerpo)
        });
        mostrarMensaje(respuesta.ok ? "Incidencia registrada correctamente." : await textoDeError(respuesta), !respuesta.ok);
    }

    // Inicializar (oculto visualmente pero carga el nombre del chofer)
    cargarHojaDeRuta();
});