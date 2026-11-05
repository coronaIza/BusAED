package com.agencia.buses.dao;

import com.agencia.buses.modelo.Ruta;

import java.sql.SQLException;
import java.util.ArrayList;

// Operaciones sobre la tabla "ruta".
public interface IRutaDAO {

    ArrayList<Ruta> listar() throws SQLException;

    Ruta buscarPorId(Integer id) throws SQLException;

    // Sirve para detectar rutas repetidas (mismo origen y destino).
    Ruta buscarPorOrigenDestino(String origen, String destino) throws SQLException;

    Ruta insertar(Ruta ruta) throws SQLException;

    void actualizar(Ruta ruta) throws SQLException;

    void eliminar(Integer id) throws SQLException;
}
