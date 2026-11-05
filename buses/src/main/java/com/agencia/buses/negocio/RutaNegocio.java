package com.agencia.buses.negocio;

import com.agencia.buses.dao.IRutaDAO;
import com.agencia.buses.modelo.Ruta;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.NoSuchElementException;

// Reglas de negocio de las RUTAS (el "camino" Lima -> Ica y su precio base).
//  - IllegalArgumentException -> datos incorrectos (el Controlador responde 400)
//  - NoSuchElementException   -> la ruta no existe (el Controlador responde 404)
@Service
public class RutaNegocio implements IRutaNegocio {

    // La columna precio_base es DECIMAL(10,2): máximo 99,999,999.99
    private static final BigDecimal PRECIO_MAXIMO = new BigDecimal("99999999.99");

    private final IRutaDAO dao;

    public RutaNegocio(IRutaDAO dao) {
        this.dao = dao;
    }

    @Override
    public ArrayList<Ruta> listar() throws SQLException {
        return dao.listar();
    }

    @Override
    public Ruta obtenerPorId(Integer id) throws SQLException {
        Ruta ruta = dao.buscarPorId(id);
        if (ruta == null) {
            throw new NoSuchElementException("No existe la ruta con id " + id);
        }
        return ruta;
    }

    @Override
    public Ruta registrar(Ruta ruta) throws SQLException {
        validar(ruta);

        // Regla: no puede haber dos rutas con el mismo origen y destino.
        if (dao.buscarPorOrigenDestino(ruta.getOrigen(), ruta.getDestino()) != null) {
            throw new IllegalArgumentException(
                    "Ya existe la ruta " + ruta.getOrigen() + " - " + ruta.getDestino());
        }
        return dao.insertar(ruta);
    }

    @Override
    public Ruta actualizar(Integer id, Ruta ruta) throws SQLException {
        validar(ruta);

        if (dao.buscarPorId(id) == null) {
            throw new NoSuchElementException("No existe la ruta con id " + id);
        }

        // El nuevo origen-destino no debe pertenecer a OTRA ruta.
        Ruta otra = dao.buscarPorOrigenDestino(ruta.getOrigen(), ruta.getDestino());
        if (otra != null && !otra.getId().equals(id)) {
            throw new IllegalArgumentException(
                    "Ya existe otra ruta " + ruta.getOrigen() + " - " + ruta.getDestino());
        }

        ruta.setId(id);
        dao.actualizar(ruta);
        return ruta;
    }

    @Override
    public void eliminar(Integer id) throws SQLException {
        if (dao.buscarPorId(id) == null) {
            throw new NoSuchElementException("No existe la ruta con id " + id);
        }
        try {
            dao.eliminar(id);
        } catch (SQLException e) {
            // 23503 = violación de llave foránea: la ruta ya tiene viajes.
            if ("23503".equals(e.getSQLState())) {
                throw new IllegalArgumentException("No se puede eliminar la ruta porque tiene viajes asociados");
            }
            throw e;
        }
    }

    private void validar(Ruta ruta) {
        if (ruta == null) {
            throw new IllegalArgumentException("Debe enviar los datos de la ruta");
        }

        if (ruta.getOrigen() == null || ruta.getOrigen().isBlank()) {
            throw new IllegalArgumentException("El origen no puede estar vacío");
        }
        if (ruta.getDestino() == null || ruta.getDestino().isBlank()) {
            throw new IllegalArgumentException("El destino no puede estar vacío");
        }
        ruta.setOrigen(ruta.getOrigen().trim());
        ruta.setDestino(ruta.getDestino().trim());

        // Las columnas origen y destino admiten máximo 100 caracteres.
        if (ruta.getOrigen().length() > 100 || ruta.getDestino().length() > 100) {
            throw new IllegalArgumentException("Origen y destino no pueden tener más de 100 caracteres");
        }
        if (ruta.getOrigen().equalsIgnoreCase(ruta.getDestino())) {
            throw new IllegalArgumentException("El origen y el destino no pueden ser iguales");
        }

        if (ruta.getPrecioBase() == null || ruta.getPrecioBase().signum() < 0) {
            throw new IllegalArgumentException("El precio base es obligatorio y no puede ser negativo");
        }
        if (ruta.getPrecioBase().compareTo(PRECIO_MAXIMO) > 0) {
            throw new IllegalArgumentException("El precio base es demasiado grande");
        }
        ruta.setPrecioBase(ruta.getPrecioBase().setScale(2, RoundingMode.HALF_UP));

        // La duración es opcional (columna de máximo 50 caracteres).
        if (ruta.getDuracionEstimada() != null) {
            ruta.setDuracionEstimada(ruta.getDuracionEstimada().trim());
            if (ruta.getDuracionEstimada().length() > 50) {
                throw new IllegalArgumentException("La duración estimada no puede tener más de 50 caracteres");
            }
        }
    }
}
