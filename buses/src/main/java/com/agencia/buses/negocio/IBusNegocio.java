package com.agencia.buses.negocio;

import java.sql.SQLException;
import java.util.ArrayList;

import com.agencia.buses.modelo.Bus;

// Interfaz del Negocio: operaciones que el Controlador puede pedir.
public interface IBusNegocio {

    ArrayList<Bus> listar() throws SQLException;

    Bus obtenerPorId(Integer id) throws SQLException;

    Bus registrar(Bus bus) throws SQLException;

    Bus actualizar(Integer id, Bus bus) throws SQLException;

    void eliminar(Integer id) throws SQLException;
}
