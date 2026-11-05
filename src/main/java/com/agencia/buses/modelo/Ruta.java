package com.agencia.buses.modelo;

import java.math.BigDecimal;

// Modelo Ruta: representa una fila de la tabla "ruta" (Lima -> Ica, precio base, duración).
public class Ruta {
    private Integer id;
    private String origen;
    private String destino;
    private BigDecimal precioBase;
    private String duracionEstimada;

    public Ruta() {}

    public Ruta(Integer id, String origen, String destino, BigDecimal precioBase, String duracionEstimada) {
        this.id = id;
        this.origen = origen;
        this.destino = destino;
        this.precioBase = precioBase;
        this.duracionEstimada = duracionEstimada;
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getOrigen() { return origen; }
    public void setOrigen(String origen) { this.origen = origen; }

    public String getDestino() { return destino; }
    public void setDestino(String destino) { this.destino = destino; }

    public BigDecimal getPrecioBase() { return precioBase; }
    public void setPrecioBase(BigDecimal precioBase) { this.precioBase = precioBase; }

    public String getDuracionEstimada() { return duracionEstimada; }
    public void setDuracionEstimada(String duracionEstimada) { this.duracionEstimada = duracionEstimada; }
}
