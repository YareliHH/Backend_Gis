const express = require('express');
const router = express.Router();
const db = require('../Config/db');

// Obtener una venta por ID
router.get("/ventas/:id", (req, res) => {
    const { id } = req.params;
    const query = "SELECT * FROM ventas WHERE id = ?";
    db.query(query, [id], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (result.length === 0) {
            res.status(404).json({ error: "Venta no encontrada" });
        } else {
            res.json(result[0]);
        }
    });
});

// Registrar una nueva venta
router.post("/ventas", (req, res) => {
    const { cantidad, precio_unitario, total, fecha, metodo_pago } = req.body;
    const query = "INSERT INTO ventas (cantidad, precio_unitario, total, fecha, metodo_pago) VALUES (?, ?, ?, ?, ?)";
    db.query(query, [cantidad, precio_unitario, total, fecha, metodo_pago], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ mensaje: "Venta registrada con éxito", id: result.insertId });
        }
    });
});

//  Actualizar una venta
router.put("/ventas/:id", (req, res) => {
    const { id } = req.params;
    const { cantidad, precio_unitario, total, metodo_pago } = req.body;
    const query = "UPDATE ventas SET cantidad = ?, precio_unitario = ?, total = ?, metodo_pago = ? WHERE id = ?";
    db.query(query, [cantidad, precio_unitario, total, metodo_pago, id], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ mensaje: "Venta actualizada con éxito" });
        }
    });
});

// Eliminar una venta
router.delete("/ventas/:id", (req, res) => {
    const { id } = req.params;
    const query = "DELETE FROM ventas WHERE id = ?";
    db.query(query, [id], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ mensaje: "Venta eliminada con éxito" });
        }
    });
});

module.exports = router;







