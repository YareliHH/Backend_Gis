const express = require("express");
const router = express.Router();
const db = require('../Config/db'); 

// Agregar un producto al carrito
app.post('/carrito', (req, res) => {
    const { usuario_id, producto_id, cantidad } = req.body;

    if (!usuario_id || !producto_id || !cantidad) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    db.query('SELECT preciot FROM producto WHERE id = ?', [producto_id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Error al obtener precio' });

        if (results.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        const precio = results[0].preciot;
        const subtotal = precio * cantidad;

        db.query('INSERT INTO carrito (usuario_id, producto_id, cantidad, subtotal, preciot, estado) VALUES (?, ?, ?, ?, ?, "activo")', 
        [usuario_id, producto_id, cantidad, subtotal, precio], (err) => {
            if (err) return res.status(500).json({ error: 'Error al agregar al carrito' });
            res.json({ mensaje: 'Producto agregado al carrito' });
        });
    });
});

// Obtener el carrito de un usuario
app.get('/carrito/:usuario_id', (req, res) => {
    const { usuario_id } = req.params;

    db.query('SELECT * FROM carrito WHERE usuario_id = ? AND estado = "activo"', [usuario_id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Error al obtener carrito' });
        res.json(results);
    });
});

// Actualizar cantidad de un producto en el carrito
app.put('/carrito', (req, res) => {
    const { usuario_id, producto_id, cantidad } = req.body;

    if (!usuario_id || !producto_id || !cantidad) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    db.query('SELECT preciot FROM producto WHERE id = ?', [producto_id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Error al obtener precio' });

        if (results.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        const precio = results[0].preciot;
        const subtotal = precio * cantidad;

        db.query('UPDATE carrito SET cantidad = ?, subtotal = ?, fecha_actualizacion = CURRENT_TIMESTAMP WHERE usuario_id = ? AND producto_id = ?',
        [cantidad, subtotal, usuario_id, producto_id], (err) => {
            if (err) return res.status(500).json({ error: 'Error al actualizar el carrito' });
            res.json({ mensaje: 'Carrito actualizado' });
        });
    });
});

// Eliminar un producto del carrito
app.delete('/carrito', (req, res) => {
    const { usuario_id, producto_id } = req.body;

    if (!usuario_id || !producto_id) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    db.query('DELETE FROM carrito WHERE usuario_id = ? AND producto_id = ?', [usuario_id, producto_id], (err) => {
        if (err) return res.status(500).json({ error: 'Error al eliminar producto del carrito' });
        res.json({ mensaje: 'Producto eliminado del carrito' });
    });
});

module.exports = router;
