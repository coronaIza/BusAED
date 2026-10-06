package com.agencia.buses.negocio;

import com.agencia.buses.dao.IChoferDAO;
import com.agencia.buses.modelo.Chofer;
import org.springframework.stereotype.Service;

import java.sql.SQLException;
import java.util.ArrayList;

// Por ahora solo se necesita listar choferes (para elegirlos al programar un viaje).
@Service
public class ChoferNegocio implements IChoferNegocio {

    private final IChoferDAO dao;

    public ChoferNegocio(IChoferDAO dao) {
        this.dao = dao;
    }

    @Override
    public ArrayList<Chofer> listar() throws SQLException {
        return dao.listar();
    }
}
