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
document.getElementById("btnVender").addEventListener("click", async () => {
  const venta = {
    idViaje: Number(document.getElementById("viaje").value),
    nombreCliente: document.getElementById("cliente").value,
    numeroAsiento: Number(document.getElementById("asiento").value),
    total: Number(document.getElementById("total").value)
  };
  if (!venta.idViaje || !venta.nombreCliente || !venta.numeroAsiento || venta.total <= 0) {
    mostrar("Complete los datos de la venta.", true); return;
  }
  const r = await fetch("/api/ventas", {
    method: "POST", headers: {"Content-Type":"application/json", "X-XSRF-TOKEN":await csrf()}, body: JSON.stringify(venta)
  });
  if (!r.ok) {
    return mostrar(await mensajeRespuesta(r, "No se pudo registrar la venta."), true);
  }
  const registrada = await r.json();
  mostrar(`Venta registrada. Comprobante ${registrada.comprobante}`);
  await cargarDisponibilidad();
  await cargarVentas();
});
document.getElementById("formEncomienda").addEventListener("submit", async e => {
  e.preventDefault();
  const pesoKg = Number(document.getElementById("pesoKg").value);
  const precio = Number(document.getElementById("precio").value);
  if (!remitente.value.trim() || !destinatario.value.trim() || !origen.value.trim() || !destino.value.trim()
      || pesoKg <= 0 || precio <= 0) {
    mostrar("Complete remitente, destinatario, origen, destino, peso y precio.", true);
    return;
  }
  const r = await fetch("/api/encomiendas", {
    method:"POST", headers:{ "Content-Type":"application/json", "X-XSRF-TOKEN":await csrf() },
    body: JSON.stringify({remitente:remitente.value, destinatario:destinatario.value,
      telefonoDestinatario:telefono.value, origen:origen.value, destino:destino.value, descripcion:descripcion.value,
      pesoKg, precio})
  });
  if (r.ok) {
    mostrar("Encomienda registrada correctamente.");
    e.target.reset();
    await cargarEncomiendas();
  } else {
    mostrar(await mensajeRespuesta(r, "No se pudo registrar la encomienda."), true);
  }
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
      <div class="mt-2 d-flex gap-2">
        <button class="btn btn-outline-primary btn-sm" type="button" onclick="modificarVenta(${v.id})" ${v.estado === "ANULADO" ? "disabled" : ""}>Modificar</button>
        <button class="btn btn-outline-danger btn-sm" type="button" onclick="anularVenta(${v.id})" ${v.estado === "ANULADO" ? "disabled" : ""}>Cancelar venta</button>
      </div>
    </div>`;
  }).join("");
  const encomiendasHtml = encomiendas.slice(-5).reverse().map(e =>
    `<div class="list-group-item">
    <strong>Encomienda #${e.id}</strong> · ${e.estado}
    <br><small>${e.origen || "-"} → ${e.destino || "-"}</small>
    <br><small>${e.remitente} → ${e.destinatario}</small>
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
