package com.agencia.buses.negocio;

import com.agencia.buses.dao.IBusDAO;
import com.agencia.buses.dao.IChoferDAO;
import com.agencia.buses.dao.IRutaDAO;
import com.agencia.buses.dao.IViajeDAO;
import com.agencia.buses.modelo.Bus;
import com.agencia.buses.modelo.Chofer;
import com.agencia.buses.modelo.Viaje;
import org.springframework.stereotype.Service;

import java.sql.SQLException;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.NoSuchElementException;

// Reglas de negocio de los VIAJES (una salida concreta de una ruta).
//
// Un viaje DEPENDE de otras tres entidades, por eso este Negocio usa 4 DAOs:
//   ruta  -> ¿existe la ruta?
//   bus   -> ¿existe y está ACTIVO?
//   chofer-> ¿existe?
//   viaje -> guardar y detectar choques de horario
//
// Ciclo de vida del estado:
//   PROGRAMADO --> EN CURSO --> FINALIZADO
//        |
//        +-------> CANCELADO
@Service
public class ViajeNegocio implements IViajeNegocio {

    private static final String PROGRAMADO = "PROGRAMADO";
    private static final String EN_CURSO = "EN CURSO";
    private static final String FINALIZADO = "FINALIZADO";
    private static final String CANCELADO = "CANCELADO";

    // Para comparar "fecha y hora de salida" contra "ahora" usando la hora de Perú.
    private static final ZoneId ZONA = ZoneId.of("America/Lima");

    private final IViajeDAO viajeDAO;
    private final IRutaDAO rutaDAO;
    private final IBusDAO busDAO;
    private final IChoferDAO choferDAO;

    public ViajeNegocio(IViajeDAO viajeDAO, IRutaDAO rutaDAO, IBusDAO busDAO, IChoferDAO choferDAO) {
        this.viajeDAO = viajeDAO;
        this.rutaDAO = rutaDAO;
        this.busDAO = busDAO;
        this.choferDAO = choferDAO;
    }

    @Override
    public ArrayList<Viaje> listar() throws SQLException {
        return viajeDAO.listar();
    }

    @Override
    public ArrayList<Viaje> listarPorChofer(Integer idChofer) throws SQLException {
        if (choferDAO.buscarPorId(idChofer) == null) {
            throw new NoSuchElementException("No existe el chofer con id " + idChofer);
        }
        return viajeDAO.listarPorChofer(idChofer);
    }

    @Override
    public Viaje obtenerPorId(Integer id) throws SQLException {
        Viaje viaje = viajeDAO.buscarPorId(id);
        if (viaje == null) {
            throw new NoSuchElementException("No existe el viaje con id " + id);
        }
        return viaje;
    }

    @Override
    public Viaje registrar(Viaje viaje) throws SQLException {
        validarDatos(viaje, null);

        // Todo viaje nuevo nace PROGRAMADO, aunque el cliente envíe otro estado.
        viaje.setEstado(PROGRAMADO);
        Viaje guardado = viajeDAO.insertar(viaje);

        // Lo volvemos a leer para devolverlo con origen, destino, placa y chofer.
        return viajeDAO.buscarPorId(guardado.getId());
    }

    @Override
    public Viaje actualizar(Integer id, Viaje viaje) throws SQLException {
        Viaje actual = obtenerPorId(id);

        // Un viaje que ya salió, terminó o se canceló no se modifica.
        if (!PROGRAMADO.equals(actual.getEstado())) {
            throw new IllegalArgumentException("Solo se puede modificar un viaje en estado PROGRAMADO");
        }

        // Pasamos el id para que el choque de horarios ignore al propio viaje.
        validarDatos(viaje, id);

        viaje.setId(id);
        viajeDAO.actualizar(viaje);
        return viajeDAO.buscarPorId(id);
    }

    @Override
    public Viaje cambiarEstado(Integer id, String nuevoEstado) throws SQLException {
        Viaje actual = obtenerPorId(id);

        if (nuevoEstado == null || nuevoEstado.isBlank()) {
            throw new IllegalArgumentException("El estado no puede estar vacío");
        }
        String nuevo = nuevoEstado.trim().toUpperCase();

        if (!nuevo.equals(PROGRAMADO) && !nuevo.equals(EN_CURSO)
                && !nuevo.equals(FINALIZADO) && !nuevo.equals(CANCELADO)) {
            throw new IllegalArgumentException("El estado debe ser PROGRAMADO, EN CURSO, FINALIZADO o CANCELADO");
        }

        // Solo se permiten las transiciones del ciclo de vida.
        boolean permitido = switch (actual.getEstado()) {
            case PROGRAMADO -> nuevo.equals(EN_CURSO) || nuevo.equals(CANCELADO);
            case EN_CURSO -> nuevo.equals(FINALIZADO);
            default -> false; // FINALIZADO y CANCELADO son estados finales
        };
        if (!permitido) {
            throw new IllegalArgumentException(
                    "No se puede pasar de " + actual.getEstado() + " a " + nuevo);
        }

        viajeDAO.actualizarEstado(id, nuevo);
        return viajeDAO.buscarPorId(id);
    }

    @Override
    public void eliminar(Integer id) throws SQLException {
        Viaje actual = obtenerPorId(id);

        // Un viaje en curso o finalizado se conserva como historial.
        if (!PROGRAMADO.equals(actual.getEstado()) && !CANCELADO.equals(actual.getEstado())) {
            throw new IllegalArgumentException("Solo se puede eliminar un viaje PROGRAMADO o CANCELADO");
        }
        try {
            viajeDAO.eliminar(id);
        } catch (SQLException e) {
            // 23503 = llave foránea: el viaje ya tiene reservas o encomiendas.
            if ("23503".equals(e.getSQLState())) {
                throw new IllegalArgumentException(
                        "No se puede eliminar el viaje porque tiene reservas o encomiendas; cancélalo en su lugar");
            }
            throw e;
        }
    }

    // ================= FUNCIONES DEL CHOFER =================

    @Override
    public ArrayList<Viaje> listarMiHoja(String correo) throws SQLException {
        return viajeDAO.listarPorChofer(choferDeUsuario(correo).getId());
    }

    @Override
    public Viaje cambiarEstadoMiViaje(String correo, Integer idViaje, String nuevoEstado) throws SQLException {
        Chofer chofer = choferDeUsuario(correo);
        Viaje viaje = obtenerPorId(idViaje);

        // El chofer solo toca SUS viajes. Si es de otro, respondemos "no existe"
        // para no revelar que ese viaje existe.
        if (!chofer.getId().equals(viaje.getIdChofer())) {
            throw new NoSuchElementException("No existe el viaje con id " + idViaje);
        }

        // Cancelar o volver a PROGRAMADO es decisión del administrador.
        String nuevo = nuevoEstado == null ? "" : nuevoEstado.trim().toUpperCase();
        if (!nuevo.equals(EN_CURSO) && !nuevo.equals(FINALIZADO)) {
            throw new IllegalArgumentException("El chofer solo puede iniciar (EN CURSO) o finalizar (FINALIZADO) un viaje");
        }

        // Reutiliza las reglas del ciclo de vida (PROGRAMADO -> EN CURSO -> FINALIZADO).
        return cambiarEstado(idViaje, nuevo);
    }

    // Busca al chofer vinculado al usuario que inició sesión.
    private Chofer choferDeUsuario(String correo) throws SQLException {
        Chofer chofer = choferDAO.buscarPorCorreo(correo);
        if (chofer == null) {
            throw new NoSuchElementException("Tu usuario no está vinculado a ningún chofer");
        }
        return chofer;
    }

    // Validaciones comunes de registrar y actualizar.
    // excluirId = id del viaje que se está editando (null si es nuevo).
    private void validarDatos(Viaje viaje, Integer excluirId) throws SQLException {
        if (viaje == null) {
            throw new IllegalArgumentException("Debe enviar los datos del viaje");
        }
        if (viaje.getIdRuta() == null || viaje.getIdBus() == null || viaje.getIdChofer() == null) {
            throw new IllegalArgumentException("idRuta, idBus e idChofer son obligatorios");
        }
        if (viaje.getFechaSalida() == null || viaje.getHoraSalida() == null) {
            throw new IllegalArgumentException("La fecha y la hora de salida son obligatorias");
        }

        // 1. Las tres entidades relacionadas deben existir.
        if (rutaDAO.buscarPorId(viaje.getIdRuta()) == null) {
            throw new NoSuchElementException("No existe la ruta con id " + viaje.getIdRuta());
        }
        Bus bus = busDAO.buscarPorId(viaje.getIdBus());
        if (bus == null) {
            throw new NoSuchElementException("No existe el bus con id " + viaje.getIdBus());
        }
        if (choferDAO.buscarPorId(viaje.getIdChofer()) == null) {
            throw new NoSuchElementException("No existe el chofer con id " + viaje.getIdChofer());
        }

        // 2. Un bus en MANTENIMIENTO o INACTIVO no puede salir de viaje.
        if (!"ACTIVO".equalsIgnoreCase(bus.getEstado())) {
            throw new IllegalArgumentException("El bus " + bus.getPlaca() + " no está ACTIVO");
        }

        // 3. No se programan viajes en el pasado.
        LocalDateTime salida = LocalDateTime.of(viaje.getFechaSalida(), viaje.getHoraSalida());
        if (salida.isBefore(LocalDateTime.now(ZONA))) {
            throw new IllegalArgumentException("La fecha y hora de salida ya pasaron");
        }

        // 4. Un bus o un chofer no pueden estar en dos viajes a la misma fecha y hora.
        if (viajeDAO.busOcupado(viaje.getIdBus(), viaje.getFechaSalida(), viaje.getHoraSalida(), excluirId)) {
            throw new IllegalArgumentException("El bus ya tiene un viaje a esa fecha y hora");
        }
        if (viajeDAO.choferOcupado(viaje.getIdChofer(), viaje.getFechaSalida(), viaje.getHoraSalida(), excluirId)) {
            throw new IllegalArgumentException("El chofer ya tiene un viaje a esa fecha y hora");
        }
    }
}
