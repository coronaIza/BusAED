const mensaje = document.getElementById("mensaje");
function mostrar(texto, error = false) {
  mensaje.className = `alert alert-${error ? "danger" : "success"}`;
  mensaje.textContent = texto;
}
async function csrf() {
  const r = await fetch("/api/auth/csrf");
  return (await r.json()).token;
}
async function cargarViajes() {
  const respuesta = await fetch("/api/viajes");
  if (!respuesta.ok) {
    mostrar(await mensajeRespuesta(respuesta, "No se pudieron cargar los viajes"), true);
    return;
  }
  const viajes = await respuesta.json();
  const select = document.getElementById("viaje");
  select.innerHTML = '<option value="">Seleccione un viaje</option>';
  viajes.forEach(v => select.insertAdjacentHTML("beforeend",
      `<option value="${v.id}" data-precio="${v.precio || 0}" data-origen="${v.origen || ""}" data-destino="${v.destino || ""}" data-fecha="${v.fechaSalida || ""}" data-hora="${v.horaSalida || ""}">
      ${v.origen || "Origen"} → ${v.destino || "Destino"} · ${v.fechaSalida} ${v.horaSalida}
    </option>`));
}
async function mensajeRespuesta(respuesta, predeterminado) {
  try {
    const datos = await respuesta.json();
    return datos.error || predeterminado;
  } catch {
    return predeterminado;
  }
}
async function cargarDisponibilidad() {
  const id = document.getElementById("viaje").value;
  const asiento = document.getElementById("asiento");
  asiento.value = "";
  const mapa = document.getElementById("mapaAsientos");
  mapa.innerHTML = "";
  if (!id) return;
  const respuesta = await fetch(`/api/reservas/viaje/${id}/disponibilidad`);
  if (!respuesta.ok) {
    mostrar(await mensajeRespuesta(respuesta, "No se pudo consultar disponibilidad."), true);
    return;
  }
  const datos = await respuesta.json();
  const disponibles = new Set((datos.disponibles || []).map(Number));
  const ventasRespuesta = await fetch("/api/ventas");
  const ventas = ventasRespuesta.ok ? await ventasRespuesta.json() : [];
  const ocupadosPorVenta = new Set(ventas
      .filter(v => String(v.idViaje) === String(id) && v.estado !== "ANULADO")
      .map(v => Number(v.numeroAsiento)));
  for (let numero = 1; numero <= Number(datos.capacidad || 0); numero++) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "asiento-t btn btn-sm";
    boton.textContent = numero;
    if (!disponibles.has(numero) || ocupadosPorVenta.has(numero)) {
      boton.classList.add("ocupado");
      boton.disabled = true;
      boton.title = "Asiento ocupado";
    } else {
      boton.addEventListener("click", () => {
        mapa.querySelectorAll(".asiento-t").forEach(item => item.classList.remove("seleccionado"));
        boton.classList.add("seleccionado");
        asiento.value = numero;
      });
    }
    mapa.appendChild(boton);
  }
  const ocupadosTotales = new Set([
    ...Array.from({length: Number(datos.capacidad || 0)}, (_, indice) => indice + 1)
        .filter(numero => !disponibles.has(numero)),
    ...ocupadosPorVenta
  ]);
  document.getElementById("disponibilidad").innerHTML =
      `<strong>${Math.max(0, Number(datos.capacidad || 0) - ocupadosTotales.size)}</strong> asientos disponibles de ${datos.capacidad}`;
  document.getElementById("total").value = document.querySelector(`#viaje option[value="${id}"]`).dataset.precio || "";
}
async function cargarVentas() {
  await cargarOperacionesRecientes();
}
document.getElementById("viaje").addEventListener("change", cargarDisponibilidad);

// Mostrar u ocultar correo en PASAJES
document.getElementById("metodoPago").addEventListener("change", (e) => {
  const grupoCorreo = document.getElementById("grupoCorreo");
  if (grupoCorreo) {
    if (e.target.value === "PENDIENTE") {
      grupoCorreo.classList.remove("d-none");
    } else {
      grupoCorreo.classList.add("d-none");
      const inputCorreo = document.getElementById("correoCliente");
      if (inputCorreo) inputCorreo.value = "";
    }
  }
});

// Mostrar u ocultar correo en ENCOMIENDAS
document.getElementById("metodoPagoEncomienda").addEventListener("change", (e) => {
  const grupoCorreoEnc = document.getElementById("grupoCorreoEncomienda");
  if (grupoCorreoEnc) {
    if (e.target.value === "PENDIENTE") {
      grupoCorreoEnc.classList.remove("d-none");
    } else {
      grupoCorreoEnc.classList.add("d-none");
      const correoEnc = document.getElementById("correoEncomienda");
      if (correoEnc) correoEnc.value = "";
    }
  }
});

// Lógica de Venta de Pasajes
document.getElementById("btnVender").addEventListener("click", async () => {
  const selectViaje = document.getElementById("viaje");
  const viajeId = selectViaje.value;
  const optionViaje = selectViaje.options[selectViaje.selectedIndex];
  const metodoPago = document.getElementById("metodoPago").value;

  const inputCorreo = document.getElementById("correoCliente");
  const correoCliente = inputCorreo ? inputCorreo.value : "";

  if (metodoPago === "PENDIENTE" && !correoCliente) {
    mostrar("Para pagos pendientes por app, el correo electrónico es obligatorio.", true);
    return;
  }

  const estadoVenta = (metodoPago === "PENDIENTE") ? "PENDIENTE" : "PAGADO";

  const venta = {
    idViaje: Number(viajeId),
    nombreCliente: document.getElementById("cliente").value,
    correoUsuario: metodoPago === "PENDIENTE" ? correoCliente : null,
    numeroAsiento: Number(document.getElementById("asiento").value),
    total: Number(document.getElementById("total").value),
    metodoPago: metodoPago,
    estado: estadoVenta
  };

  if (!venta.idViaje || !venta.nombreCliente || !venta.numeroAsiento || venta.total <= 0) {
    mostrar("Complete los datos de la venta.", true);
    return;
  }

  const r = await fetch("/api/ventas", {
    method: "POST",
    headers: {"Content-Type":"application/json", "X-XSRF-TOKEN": await csrf()},
    body: JSON.stringify(venta)
  });

  if (!r.ok) {
    return mostrar(await mensajeRespuesta(r, "No se pudo registrar la venta."), true);
  }

  const registrada = await r.json();

  document.getElementById("lblComprobanteCodigo").textContent = registrada.comprobante || "CB-GENERADO";
  document.getElementById("lblComprobanteCliente").textContent = registrada.nombreCliente || venta.nombreCliente;

  document.getElementById("lblTituloPersona").innerHTML = "<strong>Cliente:</strong>";
  document.getElementById("lblTituloDetalle").innerHTML = "<strong>Asiento Asignado:</strong>";

  document.getElementById("lblComprobanteRuta").textContent = optionViaje ? optionViaje.text.split("·")[0] : `Viaje #${venta.idViaje}`;
  document.getElementById("lblComprobanteFechaHora").textContent = optionViaje ? optionViaje.dataset.fecha + " " + optionViaje.dataset.hora : "-";
  document.getElementById("lblComprobanteDetalle").textContent = "Asiento #" + (registrada.numeroAsiento || venta.numeroAsiento);
  document.getElementById("lblComprobanteMetodo").textContent = metodoPago === "PENDIENTE" ? "Pendiente / App" : metodoPago;
  document.getElementById("lblComprobanteTotal").textContent = "S/ " + Number(registrada.total || venta.total).toFixed(2);

  const modalHeader = document.getElementById("modalHeader");
  const lblModalTitulo = document.getElementById("lblModalTitulo");

  if (metodoPago === "PENDIENTE") {
    modalHeader.className = "modal-header bg-warning text-dark";
    lblModalTitulo.innerHTML = `<i class="bi bi-clock-history"></i> ¡Venta Pendiente - Enviado al App!`;
  } else {
    modalHeader.className = "modal-header bg-success text-white";
    lblModalTitulo.innerHTML = `<i class="bi bi-check-circle-fill"></i> ¡Venta Registrada con Éxito!`;
  }

  const modalComprobante = new bootstrap.Modal(document.getElementById('modalComprobante'));
  modalComprobante.show();

  document.getElementById("cliente").value = "";
  if (inputCorreo) inputCorreo.value = "";
  document.getElementById("asiento").value = "";
  document.getElementById("total").value = "";
  document.getElementById("metodoPago").selectedIndex = 0;

  const grupoCorreo = document.getElementById("grupoCorreo");
  if (grupoCorreo) grupoCorreo.classList.add("d-none");

  await cargarDisponibilidad();
  await cargarVentas();

  const mensajeEstado = metodoPago === "PENDIENTE" ? "Venta registrada como pendiente de pago para la App." : `Venta registrada. Comprobante ${registrada.comprobante}`;
  mostrar(mensajeEstado);
});

// Lógica de Registro de Encomiendas
document.getElementById("formEncomienda").addEventListener("submit", async e => {
  e.preventDefault();
  const pesoKg = Number(document.getElementById("pesoKg").value);
  const precio = Number(document.getElementById("precio").value);
  const metodoPago = document.getElementById("metodoPagoEncomienda").value;
  const correoEncomienda = document.getElementById("correoEncomienda").value;

  if (metodoPago === "PENDIENTE" && !correoEncomienda) {
    mostrar("Para pagos pendientes por app en encomiendas, el correo es obligatorio.", true);
    return;
  }

  if (!remitente.value.trim() || !destinatario.value.trim() || !origen.value.trim() || !destino.value.trim()
      || pesoKg <= 0 || precio <= 0) {
    mostrar("Complete remitente, destinatario, origen, destino, peso y precio.", true);
    return;
  }

  const estadoEncomienda = (metodoPago === "PENDIENTE") ? "PENDIENTE" : "PAGADO";

  const encomiendaData = {
    remitente: remitente.value,
    destinatario: destinatario.value,
    telefonoDestinatario: telefono.value,
    origen: origen.value,
    destino: destino.value,
    descripcion: descripcion.value,
    pesoKg,
    precio,
    metodoPago: metodoPago,
    estado: estadoEncomienda,
    correoRemitente: metodoPago === "PENDIENTE" ? correoEncomienda : null
  };

  const r = await fetch("/api/encomiendas", {
    method:"POST", headers:{ "Content-Type":"application/json", "X-XSRF-TOKEN":await csrf() },
    body: JSON.stringify(encomiendaData)
  });

  if (!r.ok) {
    return mostrar(await mensajeRespuesta(r, "No se pudo registrar la encomienda."), true);
  }

  const registrada = await r.json();

  document.getElementById("lblComprobanteCodigo").textContent = registrada.comprobante || "ENC-GENERADO";
  document.getElementById("lblComprobanteCliente").textContent = registrada.remitente || encomiendaData.remitente;

  document.getElementById("lblTituloPersona").innerHTML = "<strong>Remitente:</strong>";
  document.getElementById("lblTituloDetalle").innerHTML = "<strong>Contenido:</strong>";

  document.getElementById("lblComprobanteRuta").textContent = `${encomiendaData.origen} → ${encomiendaData.destino}`;
  document.getElementById("lblComprobanteFechaHora").textContent = new Date().toLocaleDateString() + " (Envío)";
  document.getElementById("lblComprobanteDetalle").textContent = encomiendaData.descripcion || "-";
  document.getElementById("lblComprobanteMetodo").textContent = metodoPago === "PENDIENTE" ? "Pendiente / App" : metodoPago;
  document.getElementById("lblComprobanteTotal").textContent = "S/ " + Number(registrada.precio || encomiendaData.precio).toFixed(2);

  const modalHeader = document.getElementById("modalHeader");
  const lblModalTitulo = document.getElementById("lblModalTitulo");

  if (metodoPago === "PENDIENTE") {
    modalHeader.className = "modal-header bg-warning text-dark";
    lblModalTitulo.innerHTML = `<i class="bi bi-clock-history"></i> ¡Encomienda Pendiente - Enviada al App!`;
  } else {
    modalHeader.className = "modal-header bg-primary text-white";
    lblModalTitulo.innerHTML = `<i class="bi bi-box-seam"></i> ¡Encomienda Registrada con Éxito!`;
  }

  const modalComprobante = new bootstrap.Modal(document.getElementById('modalComprobante'));
  modalComprobante.show();

  e.target.reset();
  document.getElementById("grupoCorreoEncomienda").classList.add("d-none");
  document.getElementById("metodoPagoEncomienda").selectedIndex = 0;

  await cargarEncomiendas();
  mostrar(`Encomienda registrada correctamente. Comprobante ${registrada.comprobante || ""}`);
});

document.getElementById("btnSalir").addEventListener("click", async () => {
  await fetch("/api/auth/logout", {method:"POST", headers:{"X-XSRF-TOKEN":await csrf()}});
  location.assign("/login.html");
});

async function anularVenta(id) {
  if (!confirm("¿Cancelar esta venta presencial?")) return;
  const respuesta = await fetch(`/api/ventas/${id}/anular`, {
    method: "POST", headers: {"X-XSRF-TOKEN": await csrf()}
  });
  if (!respuesta.ok) return mostrar(await mensajeRespuesta(respuesta, "No se pudo cancelar la venta."), true);
  mostrar("Venta cancelada.");
  await cargarDisponibilidad();
  await cargarVentas();
}

async function modificarVenta(id) {
  const asiento = prompt("Ingrese el nuevo asiento disponible:");
  if (!asiento) return;
  const respuesta = await fetch(`/api/ventas/${id}`, {
    method: "PUT",
    headers: {"Content-Type": "application/json", "X-XSRF-TOKEN": await csrf()},
    body: JSON.stringify({numeroAsiento: Number(asiento)})
  });
  if (!respuesta.ok) return mostrar(await mensajeRespuesta(respuesta, "No se pudo modificar la venta."), true);
  mostrar("Venta modificada.");
  await cargarDisponibilidad();
  await cargarVentas();
}

// Funciones para ver comprobantes históricos desde operaciones recientes
async function verComprobanteVenta(idVenta) {
  const ventas = await (await fetch("/api/ventas")).json().catch(() => []);
  const v = ventas.find(item => item.id === idVenta);
  if (!v) return mostrar("No se encontró la venta.", true);

  const opcion = document.querySelector(`#viaje option[value="${v.idViaje}"]`);

  document.getElementById("lblComprobanteCodigo").textContent = v.comprobante || "CB-GENERADO";
  document.getElementById("lblComprobanteCliente").textContent = v.nombreCliente || "Cliente";

  document.getElementById("lblTituloPersona").innerHTML = "<strong>Cliente:</strong>";
  document.getElementById("lblTituloDetalle").innerHTML = "<strong>Asiento Asignado:</strong>";

  document.getElementById("lblComprobanteRuta").textContent = opcion ? opcion.text.split("·")[0] : `Viaje #${v.idViaje}`;
  document.getElementById("lblComprobanteFechaHora").textContent = opcion ? opcion.dataset.fecha + " " + opcion.dataset.hora : "-";
  document.getElementById("lblComprobanteDetalle").textContent = "Asiento #" + v.numeroAsiento;
  document.getElementById("lblComprobanteMetodo").textContent = v.metodoPago === "PENDIENTE" ? "Pendiente / App" : (v.metodoPago || "EFECTIVO");
  document.getElementById("lblComprobanteTotal").textContent = "S/ " + Number(v.total || 0).toFixed(2);

  const modalHeader = document.getElementById("modalHeader");
  const lblModalTitulo = document.getElementById("lblModalTitulo");

  if (v.estado === "PENDIENTE") {
    modalHeader.className = "modal-header bg-warning text-dark";
    lblModalTitulo.innerHTML = `<i class="bi bi-clock-history"></i> Venta Pendiente (App)`;
  } else {
    modalHeader.className = "modal-header bg-success text-white";
    lblModalTitulo.innerHTML = `<i class="bi bi-check-circle-fill"></i> Comprobante de Venta`;
  }

  const modalComprobante = new bootstrap.Modal(document.getElementById('modalComprobante'));
  modalComprobante.show();
}

async function verComprobanteEncomienda(idEncomienda) {
  const respuesta = await fetch("/api/encomiendas");
  const encomiendas = respuesta.ok ? await respuesta.json() : [];
  const e = encomiendas.find(item => item.id === idEncomienda);
  if (!e) return mostrar("No se encontró la encomienda.", true);

  document.getElementById("lblComprobanteCodigo").textContent = e.comprobante || `ENC-${e.id}`;
  document.getElementById("lblComprobanteCliente").textContent = e.remitente || "Remitente";

  document.getElementById("lblTituloPersona").innerHTML = "<strong>Remitente:</strong>";
  document.getElementById("lblTituloDetalle").innerHTML = "<strong>Contenido:</strong>";

  document.getElementById("lblComprobanteRuta").textContent = `${e.origen || "-"} → ${e.destino || "-"}`;
  document.getElementById("lblComprobanteFechaHora").textContent = "Destinatario: " + (e.destinatario || "-");
  document.getElementById("lblComprobanteDetalle").textContent = e.descripcion || "-";
  document.getElementById("lblComprobanteMetodo").textContent = e.estado === "PENDIENTE" ? "Pendiente / App" : "Efectivo / Presencial";
  document.getElementById("lblComprobanteTotal").textContent = "S/ " + Number(e.precio || 0).toFixed(2);

  const modalHeader = document.getElementById("modalHeader");
  const lblModalTitulo = document.getElementById("lblModalTitulo");

  if (e.estado === "PENDIENTE") {
    modalHeader.className = "modal-header bg-warning text-dark";
    lblModalTitulo.innerHTML = `<i class="bi bi-clock-history"></i> Encomienda Pendiente (App)`;
  } else {
    modalHeader.className = "modal-header bg-primary text-white";
    lblModalTitulo.innerHTML = `<i class="bi bi-box-seam"></i> Comprobante de Encomienda`;
  }

  const modalComprobante = new bootstrap.Modal(document.getElementById('modalComprobante'));
  modalComprobante.show();
}

async function cargarEncomiendas() {
  const respuesta = await fetch("/api/encomiendas");
  const encomiendas = respuesta.ok ? await respuesta.json() : [];
  document.getElementById("listaEncomiendas").innerHTML = encomiendas.map(e =>
      `<div class="list-group-item d-flex justify-content-between align-items-center gap-2">
      <div><strong>${e.remitente}</strong> → ${e.destinatario}<br>${e.origen || "-"} → ${e.destino || "-"}<br><small>${e.estado}</small></div>
      <button class="btn btn-outline-success btn-sm" type="button" onclick="entregarEncomienda(${e.id})"
        ${e.estado === "ENTREGADO" ? "disabled" : ""}>Registrar retiro</button>
    </div>`).join("") || '<div class="list-group-item text-muted">Sin encomiendas.</div>';
  await cargarOperacionesRecientes(encomiendas);
}

async function cargarOperacionesRecientes(encomiendas = null) {
  if (encomiendas === null) {
    const respuesta = await fetch("/api/encomiendas");
    encomiendas = respuesta.ok ? await respuesta.json() : [];
  }
  const ventas = await (await fetch("/api/ventas")).json().catch(() => []);

  const ventasHtml = ventas.filter(v => v.estado !== "ANULADO").slice(-5).reverse().map(v => {
    const opcion = document.querySelector(`#viaje option[value="${v.idViaje}"]`);
    const recorrido = opcion
        ? `${opcion.dataset.origen || "-"} → ${opcion.dataset.destino || "-"}`
        : `Viaje #${v.idViaje}`;
    const fechaHora = opcion
        ? `${opcion.dataset.fecha || ""} ${opcion.dataset.hora || ""}`.trim()
        : "";
    return `<div class="list-group-item">
    <div class="d-flex justify-content-between gap-2"><strong>${v.comprobante}</strong><span>${v.estado}</span></div>
    <div>${recorrido}</div>
    <div><small>${fechaHora}</small></div>
    <div>${v.nombreCliente || "Cliente"} · Asiento ${v.numeroAsiento}</div>
      <div class="mt-2 d-flex flex-wrap gap-2">
        <button class="btn btn-outline-secondary btn-sm" type="button" onclick="verComprobanteVenta(${v.id})"><i class="bi bi-eye"></i> Ver Comprobante</button>
        <button class="btn btn-outline-primary btn-sm" type="button" onclick="modificarVenta(${v.id})" ${v.estado === "ANULADO" ? "disabled" : ""}>Modificar</button>
        <button class="btn btn-outline-danger btn-sm" type="button" onclick="anularVenta(${v.id})" ${v.estado === "ANULADO" ? "disabled" : ""}>Cancelar venta</button>
      </div>
    </div>`;
  }).join("");

  const encomiendasHtml = encomiendas.slice(-5).reverse().map(e =>
      `<div class="list-group-item">
    <div class="d-flex justify-content-between gap-2"><strong>Encomienda #${e.id}</strong><span>${e.estado}</span></div>
    <div><small>${e.origen || "-"} → ${e.destino || "-"}</small></div>
    <div><small>${e.remitente} → ${e.destinatario}</small></div>
    <div class="mt-2 d-flex gap-2">
      <button class="btn btn-outline-secondary btn-sm" type="button" onclick="verComprobanteEncomienda(${e.id})"><i class="bi bi-eye"></i> Ver Comprobante</button>
    </div>
    </div>`).join("");

  document.getElementById("operacionesRecientes").innerHTML =
      ventasHtml + encomiendasHtml || '<div class="list-group-item text-muted">Sin operaciones.</div>';
}

async function entregarEncomienda(id) {
  if (!confirm("¿Confirmar el retiro de la encomienda?")) return;
  const respuesta = await fetch(`/api/encomiendas/${id}/entregar`, {
    method: "PATCH", headers: {"X-XSRF-TOKEN": await csrf()}
  });
  if (!respuesta.ok) return mostrar(await mensajeRespuesta(respuesta, "No se pudo registrar el retiro."), true);
  mostrar("Retiro registrado.");
  cargarEncomiendas();
}

cargarViajes().then(() => {
  cargarEncomiendas();
  cargarVentas();
});

// Refresca "Operaciones recientes" cada 10 s para ver los pagos hechos desde la cuenta del cliente.
setInterval(() => {
  if (!document.hidden) cargarEncomiendas().catch(() => {});
}, 10000);