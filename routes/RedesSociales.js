const express = require('express');
const db = require('../Config/db'); // Asegúrate de que tu conexión esté correctamente configurada
const router = express.Router();

// Endpoint para obtener todas las redes sociales
router.get('/obtenerredes', (req, res) => {
    const query = 'SELECT * FROM redes_sociales ORDER BY fecha_creacion DESC';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error al obtener redes sociales:', err);
            return res.status(500).json({ message: 'Error al obtener redes sociales' });
        }
        res.status(200).json(results);
    });
});

// Endpoint para agregar una nueva red social
router.post('/nuevo_social', (req, res) => {
    const { nombre_red, url } = req.body;

    if (!nombre_red || !url) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }

    const query = 'INSERT INTO redes_sociales (nombre_red, url) VALUES (?, ?)';
    db.query(query, [nombre_red, url], (err, result) => {
        if (err) {
            console.error('Error al agregar red social:', err);
            return res.status(500).json({ message: 'Error al agregar red social' });
        }
        res.status(201).json({ id: result.insertId, nombre_red, url });
    });
});

// Endpoint para editar una red social
router.put('/editars/:id', (req, res) => {
    const { id } = req.params;
    const { nombre_red, url } = req.body;

    if (!nombre_red || !url) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }

    const query = 'UPDATE redes_sociales SET nombre_red = ?, url = ? WHERE id = ?';
    db.query(query, [nombre_red, url, id], (err, result) => {
        if (err) {
            console.error('Error al actualizar red social:', err);
            return res.status(500).json({ message: 'Error al actualizar red social' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Red social no encontrada.' });
        }
        res.status(200).json({ message: 'Red social actualizada.' });
    });
});

// Endpoint para eliminar una red social
router.delete('/eliminars/:id', (req, res) => {
    const { id } = req.params;

    const query = 'DELETE FROM redes_sociales WHERE id = ?';
    db.query(query, [id], (err, result) => {
        if (err) {
            console.error('Error al eliminar red social:', err);
            return res.status(500).json({ message: 'Error al eliminar red social' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Red social no encontrada.' });
        }
        res.status(200).json({ message: 'Red social eliminada.' });
    });
});

// Endpoint adicional para obtener todas las redes sociales (opcional)
router.get('/sociales', (req, res) => {
    const query = 'SELECT * FROM redes_sociales';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error al obtener redes sociales:', err);
            return res.status(500).json({ message: 'Error al obtener redes sociales.' });
        }
        res.status(200).json(results);
    });
});

module.exports = router;
