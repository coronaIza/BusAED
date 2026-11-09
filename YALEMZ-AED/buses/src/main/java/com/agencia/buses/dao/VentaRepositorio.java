package com.agencia.buses.dao;

import com.agencia.buses.modelo.Venta;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface VentaRepositorio extends JpaRepository<Venta, Integer> {
    List<Venta> findByIdViajeAndEstadoNot(Integer idViaje, String estado);
}
