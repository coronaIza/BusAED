package com.agencia.buses.dao;

import com.agencia.buses.modelo.Encomienda;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EncomiendaRepositorio extends JpaRepository<Encomienda, Integer> {
}
