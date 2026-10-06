package com.agencia.buses.negocio;

import com.agencia.buses.modelo.Ruta;

import java.sql.SQLException;
import java.util.ArrayList;

public interface IRutaNegocio {

    ArrayList<Ruta> listar() throws SQLException;

    Ruta obtenerPorId(Integer id) throws SQLException;

    Ruta registrar(Ruta ruta) throws SQLException;

    Ruta actualizar(Integer id, Ruta ruta) throws SQLException;

    void eliminar(Integer id) throws SQLException;
}
