const express = require("express");
const router = express.Router();
const db = require('../Config/db'); 

// Obtener todos los detalles del carrito
app.get("/detalles_carrito", (req, res) => {
    db.query("SELECT * FROM detalles_carrito", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Obtener un detalle del carrito por ID
app.get("/detalles_carrito/:id", (req, res) => {
    const { id } = req.params;
    db.query("SELECT * FROM detalles_carrito WHERE id_detalle = ?", [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: "Detalle no encontrado" });
        res.json(results[0]);
    });
});

// Agregar un nuevo detalle al carrito
app.post("/detalles_carrito", (req, res) => {
    const { id_carrito, id_producto, cantidad, precio_unitario, subtotal } = req.body;
    const query = "INSERT INTO detalles_carrito (id_carrito, id_producto, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)";
    db.query(query, [id_carrito, id_producto, cantidad, precio_unitario, subtotal], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Detalle agregado con éxito", id: result.insertId });
    });
});

// Actualizar un detalle del carrito
app.put("/detalles_carrito/:id", (req, res) => {
    const { id } = req.params;
    const { id_carrito, id_producto, cantidad, precio_unitario, subtotal } = req.body;
    const query = "UPDATE detalles_carrito SET id_carrito=?, id_producto=?, cantidad=?, precio_unitario=?, subtotal=? WHERE id_detalle=?";
    db.query(query, [id_carrito, id_producto, cantidad, precio_unitario, subtotal, id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: "Detalle no encontrado" });
        res.json({ message: "Detalle actualizado con éxito" });
    });
});

// Eliminar un detalle del carrito
app.delete("/detalles_carrito/:id", (req, res) => {
    const { id } = req.params;
    db.query("DELETE FROM detalles_carrito WHERE id_detalle = ?", [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: "Detalle no encontrado" });
        res.json({ message: "Detalle eliminado con éxito" });
    });
});
module.exports = router;

