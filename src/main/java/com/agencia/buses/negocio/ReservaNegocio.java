package com.agencia.buses.negocio;

import java.sql.SQLException;
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
import com.agencia.buses.modelo.Bus;
import com.agencia.buses.modelo.Reserva;
import com.agencia.buses.modelo.Viaje;

@Service
public class ReservaNegocio implements IReservaNegocio {

    private final IViajeDAO viajeDAO;
    private final IBusDAO busDAO;

    // Mapa de reservas por ID para conservar el historial y permitir cancelar por id.
    private final Map<Integer, Reserva> reservasPorId = new ConcurrentHashMap<>();

    // Mapa de asientos confirmados por viaje: idViaje -> numeroAsiento -> reserva.
    private final Map<Integer, Map<Integer, Reserva>> asientosPorViaje = new ConcurrentHashMap<>();

    private final AtomicInteger siguienteId = new AtomicInteger(1);

    public ReservaNegocio(IViajeDAO viajeDAO, IBusDAO busDAO) {
        this.viajeDAO = viajeDAO;
        this.busDAO = busDAO;
    }

    @Override
    public List<Reserva> listarPorViaje(Integer idViaje) throws SQLException {
        validarViaje(idViaje);
        return asientosPorViaje.getOrDefault(idViaje, Map.of()).values().stream()
                .filter(reserva -> "CONFIRMADA".equalsIgnoreCase(reserva.getEstado()))
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
                .filter(reserva -> "CONFIRMADA".equalsIgnoreCase(reserva.getEstado()))
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
                .filter(reserva -> "CONFIRMADA".equalsIgnoreCase(reserva.getEstado()))
                .mapToInt(reserva -> reserva.getNumeroAsiento().intValue())
                .sorted()
                .boxed()
                .toList();

        List<Integer> disponibles = IntStream.rangeClosed(1, capacidad)
                .filter(numero -> !ocupados.contains(numero))
                .boxed()
                .toList();

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("idViaje", idViaje);
        respuesta.put("capacidad", capacidad);
        respuesta.put("ocupados", ocupados);
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
        nueva.setEstado("CONFIRMADA");
        nueva.setFechaReserva(java.time.LocalDateTime.now(java.time.ZoneId.of("America/Lima")));

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
        if ("CANCELADA".equalsIgnoreCase(reserva.getEstado())) {
            throw new IllegalArgumentException("La reserva ya está cancelada");
        }

        reserva.setEstado("CANCELADA");
        Map<Integer, Reserva> ocupados = asientosPorViaje.get(reserva.getIdViaje());
        if (ocupados != null) {
            ocupados.remove(reserva.getNumeroAsiento());
        }
        return reserva;
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
