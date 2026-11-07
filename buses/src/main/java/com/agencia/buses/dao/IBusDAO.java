package com.agencia.buses.dao;

import java.sql.SQLException;
import java.util.ArrayList;

import com.agencia.buses.modelo.Bus;

// Interfaz del DAO: lista las operaciones que se pueden hacer con la tabla "bus".
public interface IBusDAO {

    ArrayList<Bus> listar() throws SQLException;

    Bus buscarPorId(Integer id) throws SQLException;

    Bus buscarPorPlaca(String placa) throws SQLException;

    Bus insertar(Bus bus) throws SQLException;

    void actualizar(Bus bus) throws SQLException;

    void eliminar(Integer id) throws SQLException;
}
