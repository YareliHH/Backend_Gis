const express = require('express');
const router = express.Router();
const db = require('../Config/db'); // Asegúrate de que la conexión a MySQL esté configurada correctamente

// Obtener todas las categorías
router.get('/obtenercat', async (req, res) => {
    try {
        const query = 'SELECT id_categoria, nombre, descripcion, fecha_creacion, fecha_actualizacion FROM categorias';
        const [categorias] = await db.promise().query(query);
        res.status(200).json(categorias);
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        res.status(500).json({ error: 'No se pudieron obtener las categorías' });
    }
});

// Insertar una nueva categoría
router.post('/insertarcat', async (req, res) => {
  const { nombre, descripcion } = req.body;

    if (!nombre || !descripcion) {
        return res.status(400).json({ error: 'Los campos nombre y descripción son obligatorios' });
        }
        try {
            const fechaCreacion = new Date();
            const query = 'INSERT INTO categorias (nombre, descripcion, fecha_creacion, fecha_actualizacion) VALUES (?, ?, ?, ?)';
            const [result] = await db.promise().query(query, [nombre, descripcion, fechaCreacion, fechaCreacion]);
            res.status(201).json({ message: 'Categoría creada exitosamente', id: result.insertId });
        } catch (error) {
            console.error('Error al insertar categoría:', error);
            res.status(500).json({ error: 'No se pudo insertar la categoría' });
        }
    });

// Editar una categoría existente
router.put('/editar/:id', async (req, res) => {
    const { id } = req.params; // Obtener el ID de la categoría a editar
    const { nombre, descripcion } = req.body; // Obtener los nuevos valores
  
    if (!nombre || !descripcion) {
      return res.status(400).json({ error: 'Los campos nombre y descripción son obligatorios' });
    }
  
    try {
      const fechaActualizacion = new Date();
      // Cambia 'id' por 'id_categoria'
      const query = 'UPDATE categorias SET nombre = ?, descripcion = ?, fecha_actualizacion = ? WHERE id_categoria = ?';
      const [result] = await db.promise().query(query, [nombre, descripcion, fechaActualizacion, id]);
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
      }
  
      res.status(200).json({ message: 'Categoría actualizada exitosamente' });
    } catch (error) {
      console.error('Error al actualizar categoría:', error);
      res.status(500).json({ error: 'No se pudo actualizar la categoría' });
    }
  });
  
  

// Eliminar una categoría
router.delete('/eliminar/:id', async (req, res) => {
    const { id } = req.params; // Obtener el ID de la categoría a eliminar
  
    try {
      // Cambia 'id' por 'id_categoria'
      const query = 'DELETE FROM categorias WHERE id_categoria = ?';
      const [result] = await db.promise().query(query, [id]);
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
      }
  
      res.status(200).json({ message: 'Categoría eliminada exitosamente' });
    } catch (error) {
      console.error('Error al eliminar categoría:', error);
      res.status(500).json({ error: 'No se pudo eliminar la categoría' });
    }
  });
  

module.exports = router;