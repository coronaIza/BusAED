const mensaje = document.getElementById("mensaje");
let viajes = [];

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
          <a class="btn btn-primary" href="/reservas.html?viaje=${viaje.id}" ${viaje.estado !== "PROGRAMADO" ? "aria-disabled='true'" : ""}>
            <i class="bi bi-ticket-perforated"></i> Reservar
          </a>
        </div>
      </div></div>`;
    contenedor.appendChild(col);
  }
  if (!lista.length) contenedor.innerHTML = '<div class="col-12"><div class="alert alert-secondary">No hay viajes que coincidan con la búsqueda.</div></div>';
}
async function cargarReservas(contenedor, historial = false) {
  const url = historial ? "/api/reservas/historial" : "/api/reservas/mis-reservas";
  const respuesta = await fetch(url);
  if (!respuesta.ok) throw new Error("No se pudieron cargar las reservas");
  const reservas = await respuesta.json();
  contenedor.innerHTML = reservas.length ? reservas.map(r => {
    const viaje = viajes.find(v => String(v.id) === String(r.idViaje));
    const cancelable = !historial && !["CANCELADO", "COMPLETADO", "PAGADO"].includes(r.estado);
    return `<div class="card border-0 shadow-sm mb-3"><div class="card-body d-flex justify-content-between gap-3">
    <div><strong>${viaje ? `${viaje.origen} → ${viaje.destino}` : `Viaje #${r.idViaje}`}</strong> · Asiento ${r.numeroAsiento}<br>
    ${viaje ? `<span><i class="bi bi-clock"></i> ${viaje.fechaSalida || "-"} · ${viaje.horaSalida || "-"}</span><br>` : ""}
    <small>Reserva: ${r.fechaReserva || "-"}</small></div>
    <div class="d-flex flex-column align-items-end gap-2"><span class="badge ${r.estado === "CANCELADO" ? "bg-danger" : r.estado === "PAGADO" ? "bg-success" : r.estado === "COMPLETADO" ? "bg-dark" : "bg-primary"}">${r.estado}</span>
    ${cancelable ? `<button class="btn btn-outline-danger btn-sm" onclick="cancelarReservaPasajero(${r.id})">Cancelar reserva</button>` : ""}</div></div></div>`;
  }).join("")
    : '<div class="alert alert-secondary">No hay reservas registradas.</div>';
}
async function cancelarReservaPasajero(idReserva) {
  if (!confirm("¿Confirmas que deseas cancelar esta reserva?")) return;
  try {
    const respuesta = await fetch(`/api/reservas/${idReserva}`, {
      method: "DELETE",
      headers: { "X-XSRF-TOKEN": await csrf() }
    });
    if (!respuesta.ok) throw new Error((await respuesta.json().catch(() => ({}))).error || "No se pudo cancelar la reserva");
    mostrarMensaje("Reserva cancelada correctamente", "success");
    activarTab("reservas");
    cargarViajes();
  } catch (error) {
    mostrarMensaje(error.message || "No se pudo cancelar la reserva", "danger");
  }
}
function activarTab(nombre) {
  document.querySelectorAll("[data-tab]").forEach(b => b.classList.toggle("active", b.dataset.tab === nombre));
  ["disponibles", "reservas", "historial", "comprobantes"].forEach(p =>
    document.getElementById(`panel-${p}`).classList.toggle("d-none", p !== nombre));
  if (nombre === "reservas") cargarReservas(document.getElementById("panel-reservas"));
  if (nombre === "historial") cargarReservas(document.getElementById("panel-historial"), true);
  if (nombre === "comprobantes") document.getElementById("panel-comprobantes").innerHTML =
    '<div class="alert alert-info">Los comprobantes se generan al confirmar el pago de una reserva.</div>';
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
