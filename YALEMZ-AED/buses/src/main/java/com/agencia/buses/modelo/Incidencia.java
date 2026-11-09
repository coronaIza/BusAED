package com.agencia.buses.modelo;

import java.time.LocalDateTime;
import jakarta.persistence.*;

@Entity
@Table(name = "incidencia")
public class Incidencia {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    @Column(name = "id_viaje", nullable = false)
    private Integer idViaje;
    @Column(nullable = false, length = 50)
    private String tipo;
    @Column(nullable = false, columnDefinition = "TEXT")
    private String descripcion;
    @Column(columnDefinition = "TEXT")
    private String fotos;
    @Column(nullable = false)
    private LocalDateTime fecha;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getIdViaje() { return idViaje; }
    public void setIdViaje(Integer idViaje) { this.idViaje = idViaje; }
    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public String getFotos() { return fotos; }
    public void setFotos(String fotos) { this.fotos = fotos; }
    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }
}
