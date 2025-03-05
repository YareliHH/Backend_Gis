const express = require('express');
const router = express.Router();
const connection = require('../Config/db');

// Ruta para insertar datos en la tabla acerca_de
router.post('/acerca_de', (req, res) => {
  const { nombre, descripcion, mision, vision, valores } = req.body;
  
  const query = 'INSERT INTO acerca_de (nombre, descripcion, mision, vision, valores) VALUES (?, ?, ?, ?, ?)';
  connection.query(query, [nombre, descripcion, mision, vision, valores], (err, results) => {
    if (err) {
      console.error('Error en la inserción: ', err);
      res.status(500).send('Error en la inserción');
      return;
    }
    res.status(200).send('Datos insertados correctamente');
  });
});


module.exports = router;