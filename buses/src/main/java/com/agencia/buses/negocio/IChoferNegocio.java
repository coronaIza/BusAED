package com.agencia.buses.negocio;

import com.agencia.buses.modelo.Chofer;

import java.sql.SQLException;
import java.util.ArrayList;

public interface IChoferNegocio {

    ArrayList<Chofer> listar() throws SQLException;
}
