const express = require('express');
const router = express.Router();
const db = require('../Config/db'); // Asegúrate de que la conexión a MySQL esté configurada correctamente

// Obtener todas las categorías
router.get('/generos', async (req, res) => {
    try {
        const query = 'SELECT id, genero, fecha_creacion, fecha_actualizacion FROM genero';
        const [generos] = await db.promise().query(query);
        res.status(200).json(generos);
    } catch (error) {
        console.error('Error al obtener generos:', error);
        res.status(500).json({ error: 'No se pudieron obtener las generos' });
    }
});

// Insertar una nueva categoría
router.post('/agregargenero', async (req, res) => {
  const { genero} = req.body;

    if (!genero) {
        return res.status(400).json({ error: 'EL campo genero es obligatorio' });
        }
        try {
            const fechaCreacion = new Date();
            const query = 'INSERT INTO genero (genero, fecha_creacion, fecha_actualizacion) VALUES (?, ?, ?)';
            const [result] = await db.promise().query(query, [genero, fechaCreacion, fechaCreacion]);
            res.status(201).json({ message: 'talla creada exitosamente', id: result.insertId });
        } catch (error) {
            console.error('Error al insertar talla:', error);
            res.status(500).json({ error: 'No se pudo insertar la talla' });
        }
    });

// Editar una categoría existente
router.put('/editargenero/:id', async (req, res) => {
    const { id } = req.params; // Obtener el ID de la categoría a editar
    const { genero } = req.body; // Obtener los nuevos valores
  
    if (!genero) {
      return res.status(400).json({ error: 'El campo talla es obligatorios' });
    }
  
    try {
      const fechaActualizacion = new Date();
      // Cambia 'id' por 'id_categoria'
      const query = 'UPDATE genero SET genero = ?, fecha_actualizacion = ? WHERE id= ?';
      const [result] = await db.promise().query(query, [genero, fechaActualizacion, id]);
  
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
router.delete('/eliminargenero/:id', async (req, res) => {
    const { id } = req.params; // Obtener el ID de la categoría a eliminar
  
    try {
      // Cambia 'id' por 'id_categoria'
      const query = 'DELETE FROM genero WHERE id = ?';
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