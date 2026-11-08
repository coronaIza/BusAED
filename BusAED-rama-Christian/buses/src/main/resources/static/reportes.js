// Frontend del módulo de Reportes - Ventas pagadas y gestión de incidencias

const tipoReporteSelect = document.getElementById("tipoReporte");
const fechaInicioInput = document.getElementById("fechaInicio");
const fechaFinInput = document.getElementById("fechaFin");
const btnFiltrar = document.getElementById("btnFiltrar");
const btnMostrarTodos = document.getElementById("btnMostrarTodos");

const tablaEncabezado = document.getElementById("tablaEncabezado");
const tablaResultados = document.getElementById("tablaResultados");
const lblTotalRegistros = document.getElementById("lblTotalRegistros");
const lblDatoSecundario = document.getElementById("lblDatoSecundario");
const lblEstadoSistema = document.getElementById("lblEstadoSistema");

const tituloCard1 = document.getElementById("tituloCard1");
const tituloCard2 = document.getElementById("tituloCard2");
const tituloCard3 = document.getElementById("tituloCard3");
const cardSecundaria = document.getElementById("cardSecundaria");
const cardEstadoSistema = document.getElementById("cardEstadoSistema");
const mensaje = document.getElementById("mensaje");

function mostrarMensaje(texto, esError) {
    if (mensaje) {
        mensaje.textContent = texto;
        mensaje.className = esError ? "text-danger fw-bold mt-2" : "text-success fw-bold mt-2";
    }
}

async function cargarDatosReporte() {
    const tipo = tipoReporteSelect.value;
    tablaResultados.innerHTML = "<tr><td colspan='5' class='text-center text-muted'>Cargando datos del servidor...</td></tr>";

    try {
        const [respViajes, respIncidencias, respVentas] = await Promise.all([
            fetch("/api/viajes").catch(() => ({ ok: false })),
            fetch("/api/incidencias").catch(() => ({ ok: false })),
            fetch("/api/ventas").catch(() => ({ ok: false }))
        ]);

        let viajesTotales = respViajes.ok ? await respViajes.json() : [];
        let incidenciasTotales = respIncidencias.ok ? await respIncidencias.json() : [];
        let ventasTotales = respVentas.ok ? await respVentas.json() : [];

        if (!Array.isArray(viajesTotales)) viajesTotales = [];
        if (!Array.isArray(incidenciasTotales)) incidenciasTotales = [];
        if (!Array.isArray(ventasTotales)) ventasTotales = [];

        // Filtrar estrictamente solo las ventas que estén PAGADAS (ignorando ANULADOS)
        let ventasPagadas = ventasTotales.filter(v => {
            const estado = (v?.estado || "").trim().toUpperCase();
            return estado === "PAGADO";
        });

        let datosFiltrados = (tipo === "incidencias") ? incidenciasTotales : ventasPagadas;

        // FILTRADO POR ID DE VIAJE (Sustituye a las fechas)
        const filtroViajeStr = fechaInicioInput.value.trim();
        if (filtroViajeStr !== "" && !isNaN(filtroViajeStr)) {
            const idViajeBuscado = Number(filtroViajeStr);
            datosFiltrados = datosFiltrados.filter(item => {
                const idViajeItem = Number(item?.idViaje ?? item?.id_viaje ?? 0);
                return idViajeItem === idViajeBuscado;
            });
        }

        dibujarTablaReporte(tipo, datosFiltrados);
        actualizarMetricas(tipo, datosFiltrados, viajesTotales, incidenciasTotales, ventasPagadas);
        mostrarMensaje("Reporte actualizado por viaje", false);
        setTimeout(() => { if (mensaje) mensaje.textContent = ""; }, 2500);

    } catch (e) {
        console.error("Error cargando reporte:", e);
        tablaResultados.innerHTML = "<tr><td colspan='5' class='text-center text-danger'>No se pudieron cargar los datos.</td></tr>";
        mostrarMensaje("Error al conectar con el servidor", true);
    }
}

function dibujarTablaReporte(tipo, datos) {
    tablaResultados.innerHTML = "";

    if (!datos || datos.length === 0) {
        tablaResultados.innerHTML = "<tr><td colspan='5' class='text-center text-muted'>No se encontraron registros para este viaje.</td></tr>";
        return;
    }

    if (tipo === "incidencias") {
        tablaEncabezado.innerHTML = `
            <tr>
                <th>ID</th>
                <th>ID Viaje</th>
                <th>Tipo</th>
                <th>Descripción</th>
                <th>Fecha</th>
            </tr>
        `;
        datos.forEach(inc => {
            const fecha = inc?.fecha ? new Date(inc.fecha).toLocaleString("es-PE") : "-";
            const fila = document.createElement("tr");
            fila.innerHTML = `
                <td>${inc?.id ?? '-'}</td>
                <td>${inc?.idViaje ?? inc?.id_viaje ?? '-'}</td>
                <td><span class="badge bg-danger">${inc?.tipo ?? '-'}</span></td>
                <td>${inc?.descripcion ?? '-'}</td>
                <td>${fecha}</td>
            `;
            tablaResultados.appendChild(fila);
        });
    } else {
        // Vista de Ventas Pagadas agrupadas por viaje
        tablaEncabezado.innerHTML = `
            <tr>
                <th>ID Venta</th>
                <th>ID Viaje</th>
                <th>Cliente / Pasajero</th>
                <th>Asiento</th>
                <th>Total Pagado</th>
            </tr>
        `;
        datos.forEach(venta => {
            const idVenta = venta?.id ?? '-';
            const idViaje = venta?.idViaje ?? venta?.id_viaje ?? '-';
            const cliente = venta?.nombreCliente ?? venta?.nombre_cliente ?? 'Pasajero';
            const asiento = venta?.numeroAsiento ?? venta?.numero_asiento ?? '-';
            const total = venta?.total != null ? Number(venta.total).toFixed(2) : "0.00";

            const fila = document.createElement("tr");
            fila.innerHTML = `
                <td>${idVenta}</td>
                <td>${idViaje}</td>
                <td class="fw-semibold">${cliente}</td>
                <td>Asiento #${asiento}</td>
                <td class="fw-bold text-success">S/ ${total}</td>
            `;
            tablaResultados.appendChild(fila);
        });
    }
}

function actualizarMetricas(tipo, datosFiltrados, viajesTotales, incidenciasTotales, ventasPagadas) {
    if (tipo !== "incidencias") {
        tituloCard1.textContent = "Total Boletos Pagados";
        tituloCard2.textContent = "Ingresos del Viaje";
        tituloCard3.textContent = "Estado de Ganancias";

        lblTotalRegistros.textContent = datosFiltrados?.length ?? 0;

        // Suma exacta de los montos de las ventas pagadas del viaje filtrado
        const totalIngresos = (datosFiltrados || []).reduce((acc, curr) => acc + (Number(curr?.total) || 0), 0);

        lblDatoSecundario.textContent = "S/ " + totalIngresos.toFixed(2);
        cardSecundaria.className = "card border-0 shadow-sm text-white bg-success";

        cardEstadoSistema.className = "card border-0 shadow-sm text-white";
        if (datosFiltrados.length === 0) {
            lblEstadoSistema.textContent = "Sin Ventas";
            cardEstadoSistema.classList.add("bg-secondary");
        } else if (totalIngresos > 100) {
            lblEstadoSistema.textContent = "Óptimo (Rentable)";
            cardEstadoSistema.classList.add("bg-success");
        } else {
            lblEstadoSistema.textContent = "Bajo Rendimiento";
            cardEstadoSistema.classList.add("bg-warning", "text-dark");
        }
    } else {
        tituloCard1.textContent = "Total Viajes";
        tituloCard2.textContent = "Total Incidencias";
        tituloCard3.textContent = "Nivel de Alerta";

        lblTotalRegistros.textContent = viajesTotales?.length ?? 0;
        lblDatoSecundario.textContent = incidenciasTotales?.length ?? 0;
        cardSecundaria.className = "card border-0 shadow-sm text-white bg-warning text-dark";

        cardEstadoSistema.className = "card border-0 shadow-sm text-white";
        const totalViajes = viajesTotales?.length ?? 0;
        const totalInc = incidenciasTotales?.length ?? 0;

        if (totalViajes > 0 && totalInc >= (totalViajes / 2)) {
            lblEstadoSistema.textContent = "¡Crítico (≥ 50% afectados)!";
            cardEstadoSistema.classList.add("bg-danger");
        } else if (totalInc > 0) {
            lblEstadoSistema.textContent = "Controlado (Leve)";
            cardEstadoSistema.classList.add("bg-primary");
        } else {
            lblEstadoSistema.textContent = "Estable (Sin Averías)";
            cardEstadoSistema.classList.add("bg-success");
        }
    }
}

btnMostrarTodos.addEventListener("click", () => {
    fechaInicioInput.value = "";
    if (typeof fechaFinInput !== 'undefined' && fechaFinInput) {
        fechaFinInput.value = "";
    }
    cargarDatosReporte();
});

btnFiltrar.addEventListener("click", cargarDatosReporte);
tipoReporteSelect.addEventListener("change", cargarDatosReporte);

cargarDatosReporte();