package com.agencia.buses.dao;

import com.agencia.buses.modelo.Incidencia;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IncidenciaRepositorio extends JpaRepository<Incidencia, Integer> {
}
