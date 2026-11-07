package com.agencia.buses.negocio;

import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.IntStream;

import org.springframework.stereotype.Service;

import com.agencia.buses.dao.IBusDAO;
import com.agencia.buses.dao.IViajeDAO;
import com.agencia.buses.dao.VentaRepositorio;
import com.agencia.buses.modelo.Bus;
import com.agencia.buses.modelo.Reserva;
import com.agencia.buses.modelo.Viaje;

@Service
public class ReservaNegocio implements IReservaNegocio {

    private final IViajeDAO viajeDAO;
    private final IBusDAO busDAO;
    private final VentaRepositorio ventaRepositorio;

    // Mapa de reservas por ID para conservar el historial y permitir cancelar por id.
    private final Map<Integer, Reserva> reservasPorId = new ConcurrentHashMap<>();

    // Mapa de asientos confirmados por viaje: idViaje -> numeroAsiento -> reserva.
    private final Map<Integer, Map<Integer, Reserva>> asientosPorViaje = new ConcurrentHashMap<>();

    private final AtomicInteger siguienteId = new AtomicInteger(1);

    public ReservaNegocio(IViajeDAO viajeDAO, IBusDAO busDAO, VentaRepositorio ventaRepositorio) {
        this.viajeDAO = viajeDAO;
        this.busDAO = busDAO;
        this.ventaRepositorio = ventaRepositorio;
    }

    @Override
    public List<Reserva> listarPorViaje(Integer idViaje) throws SQLException {
        validarViaje(idViaje);
        return asientosPorViaje.getOrDefault(idViaje, Map.of()).values().stream()
                .filter(reserva -> !esCancelada(reserva.getEstado()))
                .sorted((a, b) -> Integer.compare(a.getNumeroAsiento(), b.getNumeroAsiento()))
                .toList();
    }

    @Override
    public List<Reserva> listarPorCliente(String correoCliente) {
        if (correoCliente == null || correoCliente.isBlank()) {
            throw new IllegalArgumentException("El correo del cliente es obligatorio");
        }
        String correo = correoCliente.trim().toLowerCase(Locale.ROOT);
        return reservasPorId.values().stream()
                .filter(reserva -> correo.equalsIgnoreCase(reserva.getCorreoCliente()))
                .sorted((a, b) -> a.getFechaReserva().compareTo(b.getFechaReserva()))
                .toList();
    }

    @Override
    public Map<String, Object> consultarDisponibilidad(Integer idViaje) throws SQLException {
        Viaje viaje = validarViaje(idViaje);
        Bus bus = busDAO.buscarPorId(viaje.getIdBus());
        if (bus == null) {
            throw new NoSuchElementException("No existe el bus del viaje con id " + idViaje);
        }

        int capacidad = bus.getCapacidad();
        List<Integer> ocupados = asientosPorViaje.getOrDefault(idViaje, Map.of()).values().stream()
                .filter(reserva -> !esCancelada(reserva.getEstado()))
                .mapToInt(reserva -> reserva.getNumeroAsiento().intValue())
                .sorted()
                .boxed()
                .toList();
        List<Integer> vendidos = ventaRepositorio.findByIdViajeAndEstadoNot(idViaje, "ANULADO").stream()
                .map(venta -> venta.getNumeroAsiento())
                .filter(java.util.Objects::nonNull)
                .distinct()
                .sorted()
                .toList();
        java.util.LinkedHashSet<Integer> ocupadosTotales = new java.util.LinkedHashSet<>(ocupados);
        ocupadosTotales.addAll(vendidos);

        List<Integer> disponibles = IntStream.rangeClosed(1, capacidad)
                .filter(numero -> !ocupadosTotales.contains(numero))
                .boxed()
                .toList();

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("idViaje", idViaje);
        respuesta.put("capacidad", capacidad);
        respuesta.put("ocupados", ocupadosTotales.stream().sorted().toList());
        respuesta.put("disponibles", disponibles);
        respuesta.put("cantidadDisponibles", disponibles.size());
        return respuesta;
    }

    @Override
    public synchronized Reserva registrar(Reserva reserva, String correoCliente) throws SQLException {
        if (reserva == null) {
            throw new IllegalArgumentException("Debe enviar los datos de la reserva");
        }
        if (correoCliente == null || correoCliente.isBlank()) {
            throw new IllegalArgumentException("Debe iniciar sesión para reservar");
        }
        if (reserva.getIdViaje() == null) {
            throw new IllegalArgumentException("El idViaje es obligatorio");
        }
        if (reserva.getNumeroAsiento() == null) {
            throw new IllegalArgumentException("El número de asiento es obligatorio");
        }

        Viaje viaje = validarViaje(reserva.getIdViaje());
        Bus bus = busDAO.buscarPorId(viaje.getIdBus());
        if (bus == null) {
            throw new NoSuchElementException("No existe el bus del viaje con id " + reserva.getIdViaje());
        }
        int capacidad = bus.getCapacidad();
        if (reserva.getNumeroAsiento() <= 0 || reserva.getNumeroAsiento() > capacidad) {
            throw new IllegalArgumentException(
                    "El asiento debe estar entre 1 y " + capacidad + " para este bus");
        }

        Map<Integer, Reserva> ocupadosDelViaje = asientosPorViaje.computeIfAbsent(
                reserva.getIdViaje(), key -> new ConcurrentHashMap<>());
        boolean vendido = ventaRepositorio.findByIdViajeAndEstadoNot(reserva.getIdViaje(), "ANULADO").stream()
                .anyMatch(venta -> reserva.getNumeroAsiento().equals(venta.getNumeroAsiento()));
        if (vendido) {
            throw new IllegalArgumentException("El asiento ya está ocupado por una venta de taquilla");
        }
        if (ocupadosDelViaje.containsKey(reserva.getNumeroAsiento())) {
            throw new IllegalArgumentException(
                    "El asiento " + reserva.getNumeroAsiento() + " ya está ocupado para este viaje");
        }

        Reserva nueva = new Reserva();
        nueva.setId(siguienteId.getAndIncrement());
        nueva.setIdViaje(reserva.getIdViaje());
        nueva.setNumeroAsiento(reserva.getNumeroAsiento());
        nueva.setCorreoCliente(correoCliente.trim().toLowerCase(Locale.ROOT));
        nueva.setNombrePasajero(
                reserva.getNombrePasajero() == null || reserva.getNombrePasajero().isBlank()
                        ? nueva.getCorreoCliente()
                        : reserva.getNombrePasajero().trim());
        nueva.setEstado("RESERVADO");
        nueva.setFechaReserva(java.time.LocalDateTime.now(java.time.ZoneId.of("America/Lima")));
        nueva.setFechaVencimiento(nueva.getFechaReserva().plusHours(24));
        nueva.setEstadoAbordaje("NO ABORDADO");

        ocupadosDelViaje.put(nueva.getNumeroAsiento(), nueva);
        reservasPorId.put(nueva.getId(), nueva);
        return nueva;
    }

    @Override
    public synchronized Reserva cancelar(Integer idReserva, String correoCliente) {
        if (idReserva == null) {
            throw new IllegalArgumentException("El id de la reserva es obligatorio");
        }
        Reserva reserva = reservasPorId.get(idReserva);
        if (reserva == null) {
            throw new NoSuchElementException("No existe la reserva con id " + idReserva);
        }
        if (correoCliente != null && !correoCliente.equalsIgnoreCase(reserva.getCorreoCliente())) {
            throw new IllegalArgumentException("No puedes cancelar una reserva que no te pertenece");
        }
        if (esCancelada(reserva.getEstado())) {
            throw new IllegalArgumentException("La reserva ya está cancelada");
        }

        reserva.setEstado("CANCELADA");
        Map<Integer, Reserva> ocupados = asientosPorViaje.get(reserva.getIdViaje());
        if (ocupados != null) {
            ocupados.remove(reserva.getNumeroAsiento());
        }
        return reserva;
    }

    @Override
    public synchronized Reserva pagar(Integer idReserva, String correoCliente) {
        Reserva reserva = obtenerReservaPropia(idReserva, correoCliente);
        if (esCancelada(reserva.getEstado())) {
            throw new IllegalArgumentException("No se puede pagar una reserva cancelada");
        }
        reserva.setEstado("PAGADO");
        reserva.setFechaPago(LocalDateTime.now(java.time.ZoneId.of("America/Lima")));
        return reserva;
    }

    @Override
    public synchronized Reserva reprogramar(Integer idReserva, Integer nuevoIdViaje, Integer nuevoAsiento,
                                            String correoCliente) throws SQLException {
        Reserva reserva = obtenerReservaPropia(idReserva, correoCliente);
        if (esCancelada(reserva.getEstado()) || "COMPLETADO".equalsIgnoreCase(reserva.getEstado())) {
            throw new IllegalArgumentException("La reserva no puede ser reprogramada");
        }
        Viaje nuevoViaje = validarViaje(nuevoIdViaje);
        Bus bus = busDAO.buscarPorId(nuevoViaje.getIdBus());
        if (bus == null || nuevoAsiento == null || nuevoAsiento < 1 || nuevoAsiento > bus.getCapacidad()) {
            throw new IllegalArgumentException("El asiento seleccionado no es válido");
        }

        Map<Integer, Reserva> asientosDestino = asientosPorViaje.computeIfAbsent(nuevoIdViaje, key -> new ConcurrentHashMap<>());
        Reserva ocupado = asientosDestino.get(nuevoAsiento);
        if (ocupado != null && !ocupado.getId().equals(idReserva)) {
            throw new IllegalArgumentException("El asiento ya está ocupado en el nuevo viaje");
        }
        Map<Integer, Reserva> asientosOrigen = asientosPorViaje.get(reserva.getIdViaje());
        if (asientosOrigen != null) {
            asientosOrigen.remove(reserva.getNumeroAsiento());
        }
        reserva.setIdViaje(nuevoIdViaje);
        reserva.setNumeroAsiento(nuevoAsiento);
        asientosDestino.put(nuevoAsiento, reserva);
        return reserva;
    }

    @Override
    public List<Reserva> historial(String correoCliente, String estado, String desde, String hasta) {
        LocalDate fechaDesde = desde == null || desde.isBlank() ? null : LocalDate.parse(desde);
        LocalDate fechaHasta = hasta == null || hasta.isBlank() ? null : LocalDate.parse(hasta);
        String correo = correoCliente.trim().toLowerCase(Locale.ROOT);
        return reservasPorId.values().stream()
                .filter(reserva -> correo.equalsIgnoreCase(reserva.getCorreoCliente()))
                .filter(reserva -> estado == null || estado.isBlank()
                        || estado.equalsIgnoreCase(reserva.getEstado()))
                .filter(reserva -> fechaDesde == null || !reserva.getFechaReserva().toLocalDate().isBefore(fechaDesde))
                .filter(reserva -> fechaHasta == null || !reserva.getFechaReserva().toLocalDate().isAfter(fechaHasta))
                .sorted((a, b) -> b.getFechaReserva().compareTo(a.getFechaReserva()))
                .toList();
    }

    @Override
    public synchronized void validarAbordaje(Integer idReserva, String estado) {
        Reserva reserva = reservasPorId.get(idReserva);
        if (reserva == null) {
            throw new NoSuchElementException("No existe la reserva con id " + idReserva);
        }
        if (!"ABORDADO".equalsIgnoreCase(estado) && !"NO ABORDADO".equalsIgnoreCase(estado)) {
            throw new IllegalArgumentException("El estado de abordaje debe ser ABORDADO o NO ABORDADO");
        }
        reserva.setEstadoAbordaje(estado.toUpperCase(Locale.ROOT));
    }

    private Reserva obtenerReservaPropia(Integer idReserva, String correoCliente) {
        Reserva reserva = reservasPorId.get(idReserva);
        if (reserva == null) {
            throw new NoSuchElementException("No existe la reserva con id " + idReserva);
        }
        if (correoCliente != null && !correoCliente.equalsIgnoreCase(reserva.getCorreoCliente())) {
            throw new IllegalArgumentException("La reserva no pertenece al usuario autenticado");
        }
        return reserva;
    }

    private boolean esCancelada(String estado) {
        return estado != null && ("CANCELADA".equalsIgnoreCase(estado) || "CANCELADO".equalsIgnoreCase(estado));
    }

    private Viaje validarViaje(Integer idViaje) throws SQLException {
        if (idViaje == null) {
            throw new IllegalArgumentException("El idViaje es obligatorio");
        }
        Viaje viaje = viajeDAO.buscarPorId(idViaje);
        if (viaje == null) {
            throw new NoSuchElementException("No existe el viaje con id " + idViaje);
        }
        return viaje;
    }
}
