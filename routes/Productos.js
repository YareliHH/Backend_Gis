const express = require('express');
const router = express.Router();
const db = require('../Config/db');

// Obtener todos los productos
router.get('/', (req, res) => {
    db.query('SELECT * FROM productos', (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Error al obtener productos' });
        } else {
            res.json(results);
        }
    });
});

// Obtener un producto por ID
router.get('/obtenerproducto', (req, res) => {
    const { id } = req.params;
    db.query('SELECT * FROM productos WHERE id = ?', [id], (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Error al obtener producto' });
        } else if (results.length === 0) {
            res.status(404).json({ error: 'Producto no encontrado' });
        } else {
            res.json(results[0]);
        }
    });
});

// Agregar un nuevo producto
router.post('/agregar', (req, res) => {
    const { nombre_producto, descripcion, precio,talla, color, stock, categoria_id } = req.body;
    db.query(
        'INSERT INTO productos (nombre_producto, descripcion, precio, talla, color, stock, categoria_id) VALUES (?, ?, ?, ?, ?)',
        [nombre, descripcion, precio, stock, categoria_id],
        (err, results) => {
            if (err) {
                console.error(err);
                res.status(500).json({ error: 'Error al agregar producto' });
            } else {
                res.json({ id: results.insertId, nombre_producto, descripcion, precio, talla, color, stock, categoria_id });
            }
        }
    );
});

// Actualizar un producto
router.put('/actualizarproducto', (req, res) => {
    const { id } = req.params;
    const { nombre_producto, descripcion, precio, talla, color, stock, categoria_id } = req.body;
    db.query(
        'UPDATE productos SET nombre_producto = ?, descripcion = ?, precio = ?, talla = ?, color = ?, stock = ?, categoria_id = ? WHERE id = ?',
        [nombre_producto, descripcion, precio, talla, color, stock, categoria_id, id],
        (err) => {
            if (err) {
                console.error(err);
                res.status(500).json({ error: 'Error al actualizar producto' });
            } else {
                res.json({ message: 'Producto actualizado correctamente' });
            }
        }
    );
});

// Eliminar un producto
router.delete('/eliminarproducto', (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM productos WHERE id = ?', [id], (err) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Error al eliminar producto' });
        } else {
            res.json({ message: 'Producto eliminado correctamente' });
        }
    });
});

module.exports = router;
