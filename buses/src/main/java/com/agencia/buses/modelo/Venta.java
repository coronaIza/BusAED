package com.agencia.buses.modelo;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import jakarta.persistence.*;

@Entity
@Table(name = "venta")
public class Venta {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    @Column(name = "id_reserva")
    private Integer idReserva;
    @Column(name = "id_viaje", nullable = false)
    private Integer idViaje;
    @Column(name = "nombre_cliente")
    private String nombreCliente;
    @Column(name = "numero_asiento", nullable = false)
    private Integer numeroAsiento;
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal total;
    @Column(unique = true, nullable = false, length = 30)
    private String comprobante;
    @Column(nullable = false, length = 20)
    private String estado;
    @Column(name = "fecha_venta", nullable = false)
    private LocalDateTime fechaVenta;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getIdReserva() { return idReserva; }
    public void setIdReserva(Integer idReserva) { this.idReserva = idReserva; }
    public Integer getIdViaje() { return idViaje; }
    public void setIdViaje(Integer idViaje) { this.idViaje = idViaje; }
    public String getNombreCliente() { return nombreCliente; }
    public void setNombreCliente(String nombreCliente) { this.nombreCliente = nombreCliente; }
    public Integer getNumeroAsiento() { return numeroAsiento; }
    public void setNumeroAsiento(Integer numeroAsiento) { this.numeroAsiento = numeroAsiento; }
    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }
    public String getComprobante() { return comprobante; }
    public void setComprobante(String comprobante) { this.comprobante = comprobante; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public LocalDateTime getFechaVenta() { return fechaVenta; }
    public void setFechaVenta(LocalDateTime fechaVenta) { this.fechaVenta = fechaVenta; }
}
