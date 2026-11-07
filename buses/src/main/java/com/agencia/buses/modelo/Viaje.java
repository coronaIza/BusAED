package com.agencia.buses.modelo;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;
import java.math.BigDecimal;

// Modelo Viaje: una salida concreta (ruta + bus + chofer + fecha y hora).
//
// Los 4 primeros campos de datos (idRuta, idBus, idChofer, fecha/hora) son los que
// el cliente envía en el JSON. Los campos de abajo (origen, destino, placaBus, nombreChofer)
// SOLO se llenan al leer: vienen de los JOIN con ruta, bus y chofer, y sirven para mostrar.
// Los nombres de origen, destino, fechaSalida, horaSalida y estado coinciden con
// los que ya usa pasajero.js, así que esa pantalla sigue funcionando.
public class Viaje {
    private Integer id;
    private Integer idRuta;
    private Integer idBus;
    private Integer idChofer;
    private LocalDate fechaSalida;
    private LocalTime horaSalida;
    private String estado; // PROGRAMADO, EN CURSO, FINALIZADO, CANCELADO

    // Solo lectura (JOIN)
    private String origen;
    private String destino;
    private String placaBus;
    private String nombreChofer;
    private LocalDateTime horaInicioReal;
    private LocalDateTime horaFinReal;
    private BigDecimal precio;
    private BigDecimal duracionHoras;

    public Viaje() {}

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public Integer getIdRuta() { return idRuta; }
    public void setIdRuta(Integer idRuta) { this.idRuta = idRuta; }

    public Integer getIdBus() { return idBus; }
    public void setIdBus(Integer idBus) { this.idBus = idBus; }

    public Integer getIdChofer() { return idChofer; }
    public void setIdChofer(Integer idChofer) { this.idChofer = idChofer; }

    public LocalDate getFechaSalida() { return fechaSalida; }
    public void setFechaSalida(LocalDate fechaSalida) { this.fechaSalida = fechaSalida; }

    public LocalTime getHoraSalida() { return horaSalida; }
    public void setHoraSalida(LocalTime horaSalida) { this.horaSalida = horaSalida; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public String getOrigen() { return origen; }
    public void setOrigen(String origen) { this.origen = origen; }

    public String getDestino() { return destino; }
    public void setDestino(String destino) { this.destino = destino; }

    public String getPlacaBus() { return placaBus; }
    public void setPlacaBus(String placaBus) { this.placaBus = placaBus; }

    public String getNombreChofer() { return nombreChofer; }
    public void setNombreChofer(String nombreChofer) { this.nombreChofer = nombreChofer; }

    public LocalDateTime getHoraInicioReal() { return horaInicioReal; }
    public void setHoraInicioReal(LocalDateTime horaInicioReal) { this.horaInicioReal = horaInicioReal; }
    public LocalDateTime getHoraFinReal() { return horaFinReal; }
    public void setHoraFinReal(LocalDateTime horaFinReal) { this.horaFinReal = horaFinReal; }
    public BigDecimal getPrecio() { return precio; }
    public void setPrecio(BigDecimal precio) { this.precio = precio; }
    public BigDecimal getDuracionHoras() { return duracionHoras; }
    public void setDuracionHoras(BigDecimal duracionHoras) { this.duracionHoras = duracionHoras; }
}
