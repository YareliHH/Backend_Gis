const express = require('express');
const router = express.Router();
const db = require('../Config/db');

// Ruta para obtener datos de la tabla acercaDe
router.get('/acerca_de', (req, res) => {
    const sql = 'SELECT nombre, descripcion, mision, vision, valores FROM acercaDe'; // Consulta para obtener los datos
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error al obtener datos:', err);
            return res.status(500).json({ message: 'Error al obtener datos' });
        }
        res.status(200).json(results); // Devuelve los datos en formato JSON
    });
});

module.exports = router;

