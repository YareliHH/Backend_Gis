const express = require('express');
const router = express.Router();
const db = require('../Config/db'); // Asegúrate de que la conexión a MySQL esté configurada correctamente

// Obtener todas las categorías
router.get('/colores', async (req, res) => {
    try {
        const query = 'SELECT id, color, fecha_creacion, fecha_actualizacion FROM color';
        const [colores] = await db.promise().query(query);
        res.status(200).json(colores);
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        res.status(500).json({ error: 'No se pudieron obtener las categorías' });
    }
});

// Insertar una nueva categoría
router.post('/agregarcolor', async (req, res) => {
  const { color} = req.body;

    if (!color) {
        return res.status(400).json({ error: 'EL campo color es obligatorio' });
        }
        try {
            const fechaCreacion = new Date();
            const query = 'INSERT INTO color (color, fecha_creacion, fecha_actualizacion) VALUES (?, ?, ?)';
            const [result] = await db.promise().query(query, [color, fechaCreacion, fechaCreacion]);
            res.status(201).json({ message: 'color creada exitosamente', id: result.insertId });
        } catch (error) {
            console.error('Error al insertar color:', error);
            res.status(500).json({ error: 'No se pudo insertar la color' });
        }
    });

// Editar una categoría existente
router.put('/editarcolor/:id', async (req, res) => {
    const { id } = req.params; // Obtener el ID de la categoría a editar
    const { color } = req.body; // Obtener los nuevos valores
  
    if (!color) {
      return res.status(400).json({ error: 'El campo color es obligatorios' });
    }
  
    try {
      const fechaActualizacion = new Date();
      // Cambia 'id' por 'id_categoria'
      const query = 'UPDATE color SET color = ?, fecha_actualizacion = ? WHERE id= ?';
      const [result] = await db.promise().query(query, [color, fechaActualizacion, id]);
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'color no encontrada' });
      }
  
      res.status(200).json({ message: 'color actualizada exitosamente' });
    } catch (error) {
      console.error('Error al actualizar color:', error);
      res.status(500).json({ error: 'No se pudo actualizar la color' });
    }
  });
  
  

// Eliminar una categoría
router.delete('/eliminarcolor/:id', async (req, res) => {
    const { id } = req.params; // Obtener el ID de la categoría a eliminar
  
    try {
      // Cambia 'id' por 'id_categoria'
      const query = 'DELETE FROM color WHERE id = ?';
      const [result] = await db.promise().query(query, [id]);
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'color no encontrada' });
      }
  
      res.status(200).json({ message: 'color eliminada exitosamente' });
    } catch (error) {
      console.error('Error al eliminar color:', error);
      res.status(500).json({ error: 'No se pudo eliminar la color' });
    }
  });
  

module.exports = router;