package com.agencia.buses.negocio;

import java.sql.SQLException;
import java.util.ArrayList;
import java.util.NoSuchElementException;

import org.springframework.stereotype.Service;

import com.agencia.buses.dao.IBusDAO;
import com.agencia.buses.modelo.Bus;

// La capa Negocio contiene las reglas y validaciones.
// El Controlador llama al Negocio y el Negocio llama al DAO.
//
// Errores:
//  - IllegalArgumentException  -> datos incorrectos  (el Controlador responde 400)
//  - NoSuchElementException    -> el bus no existe   (el Controlador responde 404)
@Service
public class BusNegocio implements IBusNegocio {

    // Spring nos entrega (inyecta) el DAO. Negocio no escribe SQL, solo usa el DAO.
    private final IBusDAO dao;

    public BusNegocio(IBusDAO dao) {
        this.dao = dao;
    }

    @Override
    public ArrayList<Bus> listar() throws SQLException {
        return dao.listar();
    }

    @Override
    public Bus obtenerPorId(Integer id) throws SQLException {
        Bus bus = dao.buscarPorId(id);
        if (bus == null) {
            throw new NoSuchElementException("No existe el bus con id " + id);
        }
        return bus;
    }

    @Override
    public Bus registrar(Bus bus) throws SQLException {
        validar(bus);

        // Validación 4: no permitir placas duplicadas (la placa identifica al bus).
        if (dao.buscarPorPlaca(bus.getPlaca()) != null) {
            throw new IllegalArgumentException("Ya existe un bus con la placa " + bus.getPlaca());
        }

        return dao.insertar(bus);
    }

    @Override
    public Bus actualizar(Integer id, Bus bus) throws SQLException {
        validar(bus);

        // Validación 5: no se puede actualizar algo que no existe.
        if (dao.buscarPorId(id) == null) {
            throw new NoSuchElementException("No existe el bus con id " + id);
        }

        // La nueva placa no debe pertenecer a OTRO bus.
        Bus otro = dao.buscarPorPlaca(bus.getPlaca());
        if (otro != null && !otro.getId().equals(id)) {
            throw new IllegalArgumentException("Ya existe otro bus con la placa " + bus.getPlaca());
        }

        bus.setId(id);
        dao.actualizar(bus);
        return bus;
    }

    @Override
    public void eliminar(Integer id) throws SQLException {
        // Validación 6: no se puede eliminar algo que no existe.
        if (dao.buscarPorId(id) == null) {
            throw new NoSuchElementException("No existe el bus con id " + id);
        }
        try {
            dao.eliminar(id);
        } catch (SQLException e) {
            // 23503 = violación de llave foránea en PostgreSQL: el bus ya está usado en algún viaje.
            if ("23503".equals(e.getSQLState())) {
                throw new IllegalArgumentException("No se puede eliminar el bus porque tiene viajes asociados");
            }
            throw e;
        }
    }

    // Validaciones comunes para registrar y actualizar.
    private void validar(Bus bus) {
        if (bus == null) {
            throw new IllegalArgumentException("Debe enviar los datos del bus");
        }

        // Validación 1: la placa es obligatoria (identifica al bus).
        if (bus.getPlaca() == null || bus.getPlaca().isBlank()) {
            throw new IllegalArgumentException("La placa no puede estar vacía");
        }
        bus.setPlaca(bus.getPlaca().trim());

        // La columna placa en la base de datos admite máximo 10 caracteres.
        if (bus.getPlaca().length() > 10) {
            throw new IllegalArgumentException("La placa no puede tener más de 10 caracteres");
        }

        // Validación 2: el modelo es obligatorio.
        if (bus.getModelo() == null || bus.getModelo().isBlank()) {
            throw new IllegalArgumentException("El modelo no puede estar vacío");
        }

        // Validación 3: un bus sin asientos no tiene sentido.
        if (bus.getCapacidad() == null || bus.getCapacidad() <= 0) {
            throw new IllegalArgumentException("La capacidad debe ser mayor que cero");
        }

        // Regla de estado: si no envían estado, el bus nace ACTIVO.
        // Solo se aceptan valores conocidos (se guardan siempre en mayúsculas).
        if (bus.getEstado() == null || bus.getEstado().isBlank()) {
            bus.setEstado("ACTIVO");
        } else {
            String estado = bus.getEstado().trim().toUpperCase();
            if (!estado.equals("ACTIVO") && !estado.equals("INACTIVO") && !estado.equals("MANTENIMIENTO")) {
                throw new IllegalArgumentException("El estado debe ser ACTIVO, INACTIVO o MANTENIMIENTO");
            }
            bus.setEstado(estado);
        }
    }
}
