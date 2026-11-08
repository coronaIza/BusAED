const mensaje = document.getElementById("mensaje");
let viajes = [];
let usuarioActual = null;

// Escapa texto de usuarios (nombres, destinatarios...) antes de ponerlo dentro de innerHTML.
function esc(valor) {
  const d = document.createElement("div");
  d.textContent = valor == null ? "" : String(valor);
  return d.innerHTML;
}

function mostrarMensaje(texto, tipo = "info") {
  mensaje.className = `alert alert-${tipo}`;
  mensaje.textContent = texto;
  mensaje.classList.remove("d-none");
}

async function csrf() {
  const respuesta = await fetch("/api/auth/csrf");
  if (!respuesta.ok) throw new Error("No se pudo validar la sesión");
  return (await respuesta.json()).token;
}

async function cargarUsuario() {
  const respuesta = await fetch("/api/auth/me");
  if (respuesta.ok) {
    const usuario = await respuesta.json();
    usuarioActual = usuario;
    document.getElementById("saludo").textContent = `Hola, ${usuario.nombre}`;
  }
}

async function cargarViajes() {
  const respuesta = await fetch("/api/viajes");
  if (!respuesta.ok) throw new Error("No se pudieron cargar los viajes");
  viajes = await respuesta.json();
  renderViajes();
}

async function disponibilidad(id) {
  const respuesta = await fetch(`/api/reservas/viaje/${id}/disponibilidad`);
  return respuesta.ok ? respuesta.json() : { cantidadDisponibles: 0 };
}

async function renderViajes() {
  const contenedor = document.getElementById("tarjetasViajes");
  const origen = document.getElementById("buscarOrigen").value.trim().toLowerCase();
  const destino = document.getElementById("buscarDestino").value.trim().toLowerCase();
  const fecha = document.getElementById("buscarFecha").value;
  const horario = document.getElementById("filtroHorario").value;
  const precio = document.getElementById("filtroPrecio").value;
  let lista = viajes.filter(v =>
      (!origen || (v.origen || "").toLowerCase().includes(origen)) &&
      (!destino || (v.destino || "").toLowerCase().includes(destino)) &&
      (!fecha || v.fechaSalida === fecha));
  lista = lista.filter(v => {
    const hora = Number((v.horaSalida || "0:0").split(":")[0]);
    return !horario || (horario === "mañana" && hora < 12) ||
        (horario === "tarde" && hora >= 12 && hora < 18) ||
        (horario === "noche" && hora >= 18);
  });
  if (precio) lista.sort((a, b) => precio === "asc"
      ? Number(a.precio || 0) - Number(b.precio || 0)
      : Number(b.precio || 0) - Number(a.precio || 0));
  contenedor.innerHTML = "";
  for (const viaje of lista) {
    const disponibles = await disponibilidad(viaje.id);
    const col = document.createElement("div");
    col.className = "col-md-6 col-lg-4";
    col.innerHTML = `<div class="card h-100 border-0 shadow-sm">
      <div class="card-body">
        <span class="badge bg-secondary mb-3">${viaje.estado}</span>
        <h5>${viaje.origen || "-"} <i class="bi bi-arrow-right"></i> ${viaje.destino || "-"}</h5>
        <p class="text-muted mb-2"><i class="bi bi-calendar3"></i> ${viaje.fechaSalida || "-"} · ${viaje.horaSalida || "-"}</p>
        <p class="mb-2"><i class="bi bi-clock"></i> ${viaje.duracionHoras || "-"} horas · <i class="bi bi-chair"></i> ${disponibles.cantidadDisponibles || 0} cupos</p>
        <div class="d-flex justify-content-between align-items-center">
          <strong class="text-primary fs-4">S/ ${Number(viaje.precio || 0).toFixed(2)}</strong>
          <a class="btn btn-primary ${viaje.estado !== "PROGRAMADO" ? "disabled" : ""}" href="/reservas.html?viaje=${viaje.id}" ${viaje.estado !== "PROGRAMADO" ? "aria-disabled='true' tabindex='-1'" : ""}>
            <i class="bi bi-ticket-perforated"></i> Reservar
          </a>
        </div>
      </div></div>`;
    contenedor.appendChild(col);
  }
  if (!lista.length) contenedor.innerHTML = '<div class="col-12"><div class="alert alert-secondary">No hay viajes que coincidan con la búsqueda.</div></div>';
}

function activarTab(nombre) {
  document.querySelectorAll("[data-tab]").forEach(b => b.classList.toggle("active", b.dataset.tab === nombre));
  ["disponibles", "reservas", "historial", "comprobantes"].forEach(p =>
      document.getElementById(`panel-${p}`).classList.toggle("d-none", p !== nombre));

  if (nombre === "reservas") cargarMisReservasPasajero();
  if (nombre === "historial") cargarHistorialPasajero();
  if (nombre === "comprobantes") cargarComprobantesPasajero();
}

document.querySelectorAll("[data-tab]").forEach(b => b.addEventListener("click", () => activarTab(b.dataset.tab)));
["buscarOrigen", "buscarDestino", "buscarFecha", "filtroHorario", "filtroPrecio"]
    .forEach(id => document.getElementById(id).addEventListener("input", renderViajes));

document.getElementById("btnSalir").addEventListener("click", async () => {
  try {
    await fetch("/api/auth/logout", { method: "POST", headers: { "X-XSRF-TOKEN": await csrf() } });
    location.assign("/login.html");
  } catch (error) { mostrarMensaje(error.message, "danger"); }
});

Promise.all([cargarUsuario(), cargarViajes()]).catch(error => mostrarMensaje(error.message, "danger"));

// Datos del viaje de una reserva o venta: ruta y fecha/hora de salida.
function datosViaje(idViaje) {
  const viaje = viajes.find(v => String(v.id) === String(idViaje));
  return {
    ruta: viaje ? `${viaje.origen} → ${viaje.destino}` : `Viaje #${idViaje}`,
    salida: viaje ? `${viaje.fechaSalida || "-"} · ${(viaje.horaSalida || "-").substring(0, 5)}` : "Por confirmar",
    precio: viaje ? Number(viaje.precio || 0) : 0
  };
}

// Tarjeta de una reserva hecha en la pantalla "Reserva de pasajes".
function tarjetaReserva(r) {
  const estado = (r.estado || "RESERVADO").toUpperCase();
  const cancelada = estado.startsWith("CANCELAD");
  const pagada = estado === "PAGADO" || estado === "COMPLETADO";
  const cabecera = cancelada ? "bg-danger text-white" : pagada ? "bg-success text-white" : "bg-warning text-dark";
  const viaje = datosViaje(r.idViaje);
  const nombre = r.nombrePasajero && r.nombrePasajero !== r.correoCliente
    ? r.nombrePasajero
    : (usuarioActual && usuarioActual.nombre) || r.correoCliente || "Pasajero";
  const etiquetaMonto = cancelada ? "Monto:" : pagada ? "Total pagado:" : "Monto a pagar:";
  const colorMonto = cancelada ? "text-secondary" : pagada ? "text-success" : "text-dark";
  const vence = !cancelada && !pagada && r.fechaVencimiento
    ? `<p class="mb-2 text-danger small"><i class="bi bi-hourglass-split"></i> Pagar antes del <strong>${esc(r.fechaVencimiento.substring(0, 16).replace("T", " "))}</strong></p>`
    : "";
  return `
    <div class="col-md-6 col-lg-4">
      <div class="card border-0 shadow-sm h-100">
        <div class="card-header ${cabecera} d-flex justify-content-between align-items-center">
          <span class="fw-bold font-monospace">RES-${String(r.id).padStart(6, "0")}</span>
          <span class="badge bg-light text-dark">${esc(estado)}</span>
        </div>
        <div class="card-body">
          <h5 class="card-title text-dark mb-3"><i class="bi bi-ticket-perforated"></i> Reserva de Viaje</h5>
          <p class="mb-2"><strong>Pasajero:</strong> ${esc(nombre)}</p>
          <p class="mb-2"><strong>Ruta:</strong> ${esc(viaje.ruta)}</p>
          <p class="mb-2"><strong>Salida:</strong> ${esc(viaje.salida)}</p>
          <p class="mb-2"><strong>Asiento:</strong> #${r.numeroAsiento}</p>
          ${vence}
          <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
            <span class="text-muted small">${etiquetaMonto}</span>
            <span class="${colorMonto} fw-bold fs-4">S/ ${viaje.precio.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>`;
}

async function cargarComprobantesPasajero() {
  const contenedor = document.getElementById("panel-comprobantes");
  if (!contenedor) return;
  try {
    contenedor.innerHTML = '<div class="alert alert-info">Cargando comprobantes...</div>';

    // Los viajes dan la ruta, la fecha/hora de salida y el precio de cada reserva.
    if (!viajes.length) {
      const respViajes = await fetch("/api/viajes");
      if (respViajes.ok) viajes = await respViajes.json();
    }

    const [respReservas, respVentas, respEncomiendas] = await Promise.all([
      fetch("/api/reservas/mis-reservas"),
      fetch("/api/ventas/mis-comprobantes"),
      fetch("/api/encomiendas/mis-encomiendas")
    ]);

    const reservas = respReservas.ok ? await respReservas.json() : [];
    const ventas = respVentas.ok ? await respVentas.json() : [];
    const encomiendas = respEncomiendas.ok ? await respEncomiendas.json() : [];

    reservas.sort((a, b) => String(b.fechaReserva || "").localeCompare(String(a.fechaReserva || "")));

    const pagadasV = ventas.filter(v => {
      const est = (v.estado || "").toUpperCase();
      return est === "PAGADO" || est === "COMPLETADO";
    });

    const pagadasE = encomiendas.filter(e => {
      const est = (e.estado || "").toUpperCase();
      return est === "ENTREGADO" || est === "PAGADO" || est === "COMPLETADO";
    });

    if (!pagadasV.length && !pagadasE.length) {
      contenedor.innerHTML = '<div class="alert alert-secondary">Aún no tienes comprobantes. Cuando pagues una reserva aparecerá aquí.</div>';
      return;
    }

    let html = '<div class="row g-4">';
    // Las reservas pendientes ya no se muestran aquí: se pagan desde "Mis reservas"
    // y, una vez pagadas, aparecen abajo como comprobante.

    pagadasV.forEach(v => {
      const viaje = datosViaje(v.idViaje || v.id_viaje);
      html += `
        <div class="col-md-6 col-lg-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-success text-white d-flex justify-content-between align-items-center">
              <span class="fw-bold font-monospace">${esc(v.comprobante || "CB-GENERADO")}</span>
              <span class="badge bg-light text-dark">PAGADO</span>
            </div>
            <div class="card-body">
              <h5 class="card-title text-dark mb-3"><i class="bi bi-receipt"></i> Comprobante de Viaje</h5>
              <p class="mb-2"><strong>Pasajero:</strong> ${esc(v.nombreCliente || "Cliente")}</p>
              <p class="mb-2"><strong>Ruta:</strong> ${esc(viaje.ruta)}</p>
              <p class="mb-2"><strong>Salida:</strong> ${esc(viaje.salida)}</p>
              <p class="mb-2"><strong>Asiento:</strong> #${v.numeroAsiento || v.id_asiento}</p>
              <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                <span class="text-muted small">Total pagado:</span>
                <span class="text-success fw-bold fs-4">S/ ${Number(v.total || v.precio || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>`;
    });

    pagadasE.forEach(e => {
      html += `
        <div class="col-md-6 col-lg-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-success text-white d-flex justify-content-between align-items-center">
              <span class="fw-bold font-monospace">ENC-#${e.id}</span>
              <span class="badge bg-light text-dark">${esc(e.estado)}</span>
            </div>
            <div class="card-body">
              <h5 class="card-title text-dark mb-3"><i class="bi bi-box-seam"></i> Encomienda</h5>
              <p class="mb-2"><strong>Ruta:</strong> ${esc(e.origen)} → ${esc(e.destino)}</p>
              <p class="mb-2"><strong>Destinatario:</strong> ${esc(e.destinatario)}</p>
              <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                <span class="text-muted small">Costo:</span>
                <span class="text-success fw-bold fs-4">S/ ${Number(e.precio || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>`;
    });

    html += '</div>';
    contenedor.innerHTML = html;
  } catch (err) {
    contenedor.innerHTML = `<div class="alert alert-danger">Error: ${esc(err.message)}</div>`;
  }
}

async function cargarMisReservasPasajero() {
  const contenedor = document.getElementById("panel-reservas");
  if (!contenedor) return;
  try {
    contenedor.innerHTML = '<div class="alert alert-info">Cargando reservas pendientes...</div>';

    const [respVentas, respEncomiendas] = await Promise.all([
      fetch("/api/ventas/mis-comprobantes"),
      fetch("/api/encomiendas/mis-encomiendas")
    ]);

    const ventas = respVentas.ok ? await respVentas.json() : [];
    const encomiendas = respEncomiendas.ok ? await respEncomiendas.json() : [];

    const pendientesV = ventas.filter(v => {
      const est = (v.estado || "").toUpperCase();
      return est === "PENDIENTE" || est === "RESERVADO";
    });

    const pendientesE = encomiendas.filter(e => {
      const est = (e.estado || "").toUpperCase();
      return est === "REGISTRADO" || est === "PENDIENTE" || est === "RESERVADO";
    });

    if (!pendientesV.length && !pendientesE.length) {
      contenedor.innerHTML = '<div class="alert alert-secondary">No tienes reservas ni pagos pendientes.</div>';
      return;
    }

    let html = '<div class="row g-4">';
    pendientesV.forEach(v => {
      html += `
        <div class="col-md-6 col-lg-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-warning text-dark d-flex justify-content-between align-items-center">
              <span class="fw-bold font-monospace">${esc(v.comprobante || "CB-GENERADO")}</span>
              <span class="badge bg-dark text-white">${v.estado || "RESERVADO"}</span>
            </div>
            <div class="card-body d-flex flex-column justify-content-between">
              <div>
                <h5 class="card-title text-dark mb-3"><i class="bi bi-clock-history"></i> Reserva Pendiente</h5>
                <p class="mb-2"><strong>Pasajero:</strong> ${esc(v.nombreCliente || "Cliente")}</p>
                <p class="mb-2"><strong>Viaje:</strong> #${v.idViaje || v.id_viaje}</p>
                <p class="mb-2"><strong>Asiento:</strong> #${v.numeroAsiento || v.id_asiento}</p>
              </div>
              <div>
                <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top mb-3">
                  <span class="text-muted small">Total:</span>
                  <span class="text-success fw-bold fs-4">S/ ${Number(v.total || v.precio || 0).toFixed(2)}</span>
                </div>
                <button class="btn btn-warning w-100 fw-bold text-dark shadow-sm" onclick="pagarReservaReal(${v.id})">
                  <i class="bi bi-credit-card"></i> Pagar Ahora
                </button>
              </div>
            </div>
          </div>
        </div>`;
    });

    pendientesE.forEach(e => {
      let fechaPlazo = "N/A";
      if (e.fechaRegistro) {
        const fechaReg = new Date(e.fechaRegistro);
        fechaReg.setHours(fechaReg.getHours() + 48);
        fechaPlazo = fechaReg.toLocaleString();
      }

      html += `
        <div class="col-md-6 col-lg-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-warning text-dark d-flex justify-content-between align-items-center">
              <span class="fw-bold font-monospace">ENC-#${e.id}</span>
              <span class="badge bg-dark text-white">PENDIENTE PAGO</span>
            </div>
            <div class="card-body d-flex flex-column justify-content-between">
              <div>
                <h5 class="card-title text-dark mb-3"><i class="bi bi-box-seam"></i> Encomienda Pendiente</h5>
                <p class="mb-2"><strong>Ruta:</strong> ${esc(e.origen)} → ${esc(e.destino)}</p>
                <p class="mb-2"><strong>Destinatario:</strong> ${esc(e.destinatario)}</p>
                <p class="mb-2 text-danger small"><i class="bi bi-clock"></i> Plazo: <br><strong>${fechaPlazo}</strong></p>
              </div>
              <div>
                <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top mb-3">
                  <span class="text-muted small">Costo:</span>
                  <span class="text-primary fw-bold fs-4">S/ ${Number(e.precio || 0).toFixed(2)}</span>
                </div>
                <button class="btn btn-warning w-100 fw-bold text-dark shadow-sm" onclick="pagarEncomiendaReal(${e.id})">
                  <i class="bi bi-credit-card"></i> Pagar Encomienda
                </button>
              </div>
            </div>
          </div>
        </div>`;
    });

    html += '</div>';
    contenedor.innerHTML = html;
  } catch (err) {
    contenedor.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
  }
}

async function pagarReservaReal(idVenta) {
  const contenedor = document.getElementById("panel-reservas");
  if (!contenedor) return;

  try {
    contenedor.innerHTML = '<div class="alert alert-info">Cargando detalles para el pago...</div>';

    const resp = await fetch("/api/ventas/mis-comprobantes");
    const ventas = resp.ok ? await resp.json() : [];
    const v = ventas.find(item => item.id === idVenta);

    if (!v) {
      alert("No se encontró la información de la venta.");
      cargarMisReservasPasajero();
      return;
    }

    const viaje = viajes.find(item => String(item.id) === String(v.idViaje || v.id_viaje));
    const rutaTexto = viaje ? `${viaje.origen} → ${viaje.destino}` : `Viaje #${v.idViaje || v.id_viaje}`;
    const fechaTexto = viaje ? `${viaje.fechaSalida || ""} · ${viaje.horaSalida || ""}` : "Fecha por confirmar";
    const duracionTexto = viaje && viaje.duracionHoras ? `${viaje.duracionHoras} h` : "";

    contenedor.innerHTML = `
      <div class="row justify-content-center">
        <div class="col-md-6">
          <div class="card border-0 shadow-sm">
            <div class="card-header bg-dark text-white d-flex align-items-center gap-2 py-3">
              <i class="bi bi-receipt fs-5"></i>
              <h5 class="mb-0 fs-6 fw-semibold">Resumen de reserva</h5>
            </div>
            
            <div class="card-body p-4">
              <p class="fw-bold mb-1 text-dark">${esc(rutaTexto)}</p>
              <p class="text-muted small mb-2">${fechaTexto}</p>
              <p class="text-secondary small mb-3">S/ ${Number(v.total || v.precio || 0).toFixed(2)} ${duracionTexto ? '· ' + duracionTexto : ''}</p>
              
              <hr class="text-muted opacity-25">
              
              <p class="mb-4"><strong>Asiento:</strong> #${v.numeroAsiento || v.id_asiento}</p>
              <p class="mb-4 text-muted small"><strong>Comprobante:</strong> ${esc(v.comprobante || "N/D")}</p>

              <button class="btn btn-primary w-100 py-2 fw-semibold shadow-sm" onclick="ejecutarPagoFinal(${v.id})">
                <i class="bi bi-check2-circle"></i> Pagar ahora
              </button>
              
              <button class="btn btn-outline-secondary w-100 py-2 mt-2 btn-sm" onclick="cargarMisReservasPasajero()">
                ← Volver a mis reservas
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    contenedor.innerHTML = `<div class="alert alert-danger">Error al cargar el resumen de pago: ${e.message}</div>`;
  }
}

async function ejecutarPagoFinal(idVenta) {
  try {
    const token = await csrf();
    const resp = await fetch(`/api/ventas/${idVenta}/pagar`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": token
      }
    });

    if (resp.ok) {
      alert("¡Pago procesado con éxito!");
      location.reload();
    } else {
      const errorData = await resp.json().catch(() => ({}));
      alert("No se pudo procesar el pago: " + (errorData.error || "Error en el servidor"));
    }
  } catch (e) {
    alert("Error de conexión al procesar el pago.");
  }
}

async function pagarEncomiendaReal(idEncomienda) {
  const contenedor = document.getElementById("panel-reservas");
  if (!contenedor) return;

  try {
    contenedor.innerHTML = '<div class="alert alert-info">Cargando detalles de la encomienda...</div>';

    const resp = await fetch("/api/encomiendas/mis-encomiendas");
    const encomiendas = resp.ok ? await resp.json() : [];
    const e = encomiendas.find(item => item.id === idEncomienda);

    if (!e) {
      alert("No se encontró la información de la encomienda.");
      cargarMisReservasPasajero();
      return;
    }

    let fechaPlazo = "N/A";
    if (e.fechaRegistro) {
      const fechaReg = new Date(e.fechaRegistro);
      fechaReg.setHours(fechaReg.getHours() + 48);
      fechaPlazo = fechaReg.toLocaleString();
    }

    contenedor.innerHTML = `
      <div class="row justify-content-center">
        <div class="col-md-6">
          <div class="card border-0 shadow-sm">
            <div class="card-header bg-dark text-white d-flex align-items-center gap-2 py-3">
              <i class="bi bi-box-seam fs-5"></i>
              <h5 class="mb-0 fs-6 fw-semibold">Resumen de encomienda</h5>
            </div>
            
            <div class="card-body p-4">
              <p class="fw-bold mb-1 text-dark">Ruta: ${esc(e.origen)} → ${esc(e.destino)}</p>
              <p class="text-muted small mb-2">Destinatario: ${esc(e.destinatario)} (${esc(e.telefonoDestinatario || "-")})</p>
              <p class="text-secondary small mb-3">Costo: S/ ${Number(e.precio || 0).toFixed(2)}</p>
              
              <hr class="text-muted opacity-25">
              
              <p class="mb-2"><strong>Descripción:</strong> ${esc(e.descripcion || "Sin descripción")}</p>
              <p class="mb-4 text-danger small"><i class="bi bi-clock"></i> Plazo límite: <strong>${fechaPlazo}</strong></p>

              <button class="btn btn-primary w-100 py-2 fw-semibold shadow-sm" onclick="ejecutarPagoEncomiendaFinal(${e.id})">
                <i class="bi bi-check2-circle"></i> Pagar ahora
              </button>
              
              <button class="btn btn-outline-secondary w-100 py-2 mt-2 btn-sm" onclick="cargarMisReservasPasajero()">
                ← Volver a mis reservas
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    contenedor.innerHTML = `<div class="alert alert-danger">Error al cargar el resumen de la encomienda: ${err.message}</div>`;
  }
}

async function ejecutarPagoEncomiendaFinal(idEncomienda) {
  try {
    const token = await csrf();
    const resp = await fetch(`/api/encomiendas/${idEncomienda}/pagar`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": token
      }
    });

    if (resp.ok) {
      alert("¡Pago de encomienda procesado con éxito!");
      location.reload();
    } else {
      const errorData = await resp.json().catch(() => ({}));
      alert("No se pudo procesar el pago: " + (errorData.error || "Error en el servidor"));
    }
  } catch (e) {
    alert("Error de conexión al procesar el pago.");
  }
}

async function cargarHistorialPasajero() {
  const contenedor = document.getElementById("panel-historial");
  if (!contenedor) return;
  try {
    contenedor.innerHTML = '<div class="alert alert-info">Cargando historial completo...</div>';

    const [respVentas, respEncomiendas] = await Promise.all([
      fetch("/api/ventas/mis-comprobantes"),
      fetch("/api/encomiendas/mis-encomiendas")
    ]);

    const ventas = respVentas.ok ? await respVentas.json() : [];
    const encomiendas = respEncomiendas.ok ? await respEncomiendas.json() : [];

    if (!ventas.length && !encomiendas.length) {
      contenedor.innerHTML = '<div class="alert alert-secondary">No hay registros en tu historial.</div>';
      return;
    }

    let html = '<div class="row g-4">';

    ventas.forEach(v => {
      const estado = (v.estado || "PAGADO").toUpperCase();
      let badgeBg = "bg-secondary";
      if (estado === "PAGADO") badgeBg = "bg-success";
      if (estado === "PENDIENTE" || estado === "RESERVADO") badgeBg = "bg-warning text-dark";
      if (estado === "ANULADO") badgeBg = "bg-danger";

      html += `
        <div class="col-md-6 col-lg-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header ${badgeBg} d-flex justify-content-between align-items-center">
              <span class="fw-bold font-monospace">${esc(v.comprobante || "CB-REG")}</span>
              <span class="badge bg-light text-dark">${estado}</span>
            </div>
            <div class="card-body">
              <h5 class="card-title text-dark mb-3">Historial de Pasaje</h5>
              <p class="mb-2"><strong>Viaje:</strong> #${v.idViaje || v.id_viaje} | <strong>Asiento:</strong> #${v.numeroAsiento || v.id_asiento}</p>
              <p class="mb-0 text-success fw-bold">S/ ${Number(v.total || v.precio || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>`;
    });

    encomiendas.forEach(e => {
      html += `
        <div class="col-md-6 col-lg-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-header bg-info text-dark d-flex justify-content-between align-items-center">
              <span class="fw-bold font-monospace">ENC-#${e.id}</span>
              <span class="badge bg-light text-dark">${esc(e.estado)}</span>
            </div>
            <div class="card-body">
              <h5 class="card-title text-dark mb-3">Historial de Encomienda</h5>
              <p class="mb-2"><strong>Ruta:</strong> ${esc(e.origen)} → ${esc(e.destino)}</p>
              <p class="mb-0 text-primary fw-bold">S/ ${Number(e.precio || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>`;
    });

    html += '</div>';
    contenedor.innerHTML = html;
  } catch (err) {
    contenedor.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
  }
}

if (location.hash === "#comprobantes") activarTab("comprobantes");
