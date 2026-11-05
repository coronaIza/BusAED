package com.agencia.buses.dao;

import com.agencia.buses.modelo.Chofer;

import java.sql.SQLException;
import java.util.ArrayList;

// Solo lo mínimo que necesita la gestión de viajes: listar y buscar un chofer.
// (El CRUD completo de choferes sería otro módulo.)
public interface IChoferDAO {

    ArrayList<Chofer> listar() throws SQLException;

    Chofer buscarPorId(Integer id) throws SQLException;

    // Busca el chofer vinculado al usuario con ese correo (tabla chofer.id_usuario -> usuario.email).
    // Devuelve null si el usuario no es un chofer.
    Chofer buscarPorCorreo(String correo) throws SQLException;
}
