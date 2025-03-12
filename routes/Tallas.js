const express = require('express');
const router = express.Router();
const db = require('../Config/db'); // Asegúrate de que la conexión a MySQL esté configurada correctamente

// Obtener todas las categorías
router.get('/tallas', async (req, res) => {
    try {
        const query = 'SELECT id, talla, fecha_creacion, fecha_actualizacion FROM tallas';
        const [tallas] = await db.promise().query(query);
        res.status(200).json(tallas);
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        res.status(500).json({ error: 'No se pudieron obtener las categorías' });
    }
});

// Insertar una nueva categoría
router.post('/agregartalla', async (req, res) => {
  const { talla} = req.body;

    if (!talla) {
        return res.status(400).json({ error: 'EL campo talla es obligatorio' });
        }
        try {
            const fechaCreacion = new Date();
            const query = 'INSERT INTO tallas (talla, fecha_creacion, fecha_actualizacion) VALUES (?, ?, ?)';
            const [result] = await db.promise().query(query, [talla, fechaCreacion, fechaCreacion]);
            res.status(201).json({ message: 'talla creada exitosamente', id: result.insertId });
        } catch (error) {
            console.error('Error al insertar talla:', error);
            res.status(500).json({ error: 'No se pudo insertar la talla' });
        }
    });

// Editar una categoría existente
router.put('/editartalla/:id', async (req, res) => {
    const { id } = req.params; // Obtener el ID de la categoría a editar
    const { talla } = req.body; // Obtener los nuevos valores
  
    if (!talla) {
      return res.status(400).json({ error: 'El campo talla es obligatorios' });
    }
  
    try {
      const fechaActualizacion = new Date();
      // Cambia 'id' por 'id_categoria'
      const query = 'UPDATE tallas SET talla = ?, fecha_actualizacion = ? WHERE id= ?';
      const [result] = await db.promise().query(query, [talla, fechaActualizacion, id]);
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'talla no encontrada' });
      }
  
      res.status(200).json({ message: 'talla actualizada exitosamente' });
    } catch (error) {
      console.error('Error al actualizar talla:', error);
      res.status(500).json({ error: 'No se pudo actualizar la talla' });
    }
  });
  
  

// Eliminar una categoría
router.delete('/eliminartalla/:id', async (req, res) => {
    const { id } = req.params; // Obtener el ID de la categoría a eliminar
  
    try {
      // Cambia 'id' por 'id_categoria'
      const query = 'DELETE FROM tallas WHERE id = ?';
      const [result] = await db.promise().query(query, [id]);
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'talla no encontrada' });
      }
  
      res.status(200).json({ message: 'talla eliminada exitosamente' });
    } catch (error) {
      console.error('Error al eliminar talla:', error);
      res.status(500).json({ error: 'No se pudo eliminar la talla' });
    }
  });
  

module.exports = router;