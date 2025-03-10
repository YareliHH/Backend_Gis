const express = require('express');
const router = express.Router();
const db = require('../Config/db'); // Conexión a MySQL

// Obtener todas las preguntas frecuentes
router.get('/faqs', (req, res) => {
    const sql = 'SELECT id, pregunta, respuesta, fecha_creacion FROM faqs ORDER BY fecha_creacion DESC';
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error al obtener preguntas frecuentes:', err);
            return res.status(500).json({ message: 'Error al obtener las preguntas frecuentes' });
        }
        res.json(results);
    });
});

// Agregar una nueva pregunta frecuente
router.post('/agregar', (req, res) => {
    const { pregunta, respuesta } = req.body;

    if (!pregunta || !respuesta) {
        return res.status(400).json({ message: 'Pregunta y respuesta son obligatorios' });
    }

    const sql = `INSERT INTO faqs (pregunta, respuesta, fecha_creacion) VALUES (?, ?, NOW())`;
    
    db.query(sql, [pregunta, respuesta], (err, result) => {
        if (err) {
            console.error('Error al agregar la pregunta frecuente:', err);
            return res.status(500).json({ message: 'Error al agregar la pregunta frecuente' });
        }
        res.status(201).json({ message: 'Pregunta frecuente agregada exitosamente', idFaq: result.insertId });
    });
});

// Actualizar una pregunta frecuente
router.put('/actualizar', (req, res) => {
    const { id } = req.params;
    const { pregunta, respuesta } = req.body;

    if (!pregunta || !respuesta) {
        return res.status(400).json({ message: 'Pregunta y respuesta son obligatorios' });
    }

    const sql = `UPDATE faqs SET pregunta = ?, respuesta = ? WHERE id = ?`;
    
    db.query(sql, [pregunta, respuesta, id], (err, result) => {
        if (err) {
            console.error('Error al actualizar la pregunta frecuente:', err);
            return res.status(500).json({ message: 'Error al actualizar la pregunta frecuente' });
        }
        res.json({ message: 'Pregunta frecuente actualizada correctamente' });
    });
});

// Eliminar una pregunta frecuente
router.delete('/eliminar', (req, res) => {
    const { id } = req.params;

    const sql = `DELETE FROM faqs WHERE id = ?`;
    
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error al eliminar la pregunta frecuente:', err);
            return res.status(500).json({ message: 'Error al eliminar la pregunta frecuente' });
        }
        res.json({ message: 'Pregunta frecuente eliminada correctamente' });
    });
});

module.exports = router;
