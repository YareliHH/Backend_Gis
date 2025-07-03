const express = require('express');
const router = express.Router();
const db = require('../Config/db');

// ✅ Obtener todas las promociones
router.get('/promo/get', async (req, res) => {
 try {
  console.log("promo get");
    const query = 'SELECT * FROM promocion'

    const [rows] = await db.promise().query(query);
    res.json(rows);
  } catch (err) {
    console.log(err);
    console.error('promociones ' + err);
    
    res.status(500).json({ error: 'Error al obtener promociones ' + err });
  }
});

// ✅ Crear una nueva promoción
router.post('/promo/create', async (req, res) => {
  const {
    id_producto,
    titulo,
    descripcion,
    tipo,
    fecha_inicio,
    fecha_fin,
    estado
  } = req.body;

  if (!id_producto || !titulo || !tipo || !fecha_inicio || !fecha_fin || !estado) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    const query = `
      INSERT INTO promocion (
        id_producto, titulo, descripcion, tipo,
        fecha_inicio, fecha_fin, estado
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.promise().execute(query, [
      id_producto,
      titulo,
      descripcion || '',
      tipo,
      fecha_inicio,
      fecha_fin,
      estado
    ]);

    res.status(201).json({
      message: 'Promoción creada exitosamente',
      id: result.insertId
    });
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: 'Error al crear promoción',
      details: error.message
    });
  }
});

// ✅ Actualizar promoción
router.put('/promo/update/:id', async (req, res) => {
  const { id } = req.params;
  const {
    id_producto,
    titulo,
    descripcion,
    tipo,
    fecha_inicio,
    fecha_fin,
    estado
  } = req.body;

  try {
    const query = `
      UPDATE promocion SET 
        id_producto = ?, titulo = ?, descripcion = ?, tipo = ?, 
        fecha_inicio = ?, fecha_fin = ?, estado = ?
      WHERE id_promocion = ?
    `;

    await db.promise().execute(query, [
      id_producto,
      titulo,
      descripcion,
      tipo,
      fecha_inicio,
      fecha_fin,
      estado,
      id
    ]);

    res.json({ message: 'Promoción actualizada exitosamente' });
  } catch (error) {
    res.status(500).json({
      error: 'Error al actualizar promoción',
      details: error.message
    });
  }
});

// ✅ Eliminar promoción
router.delete('/promo/delete/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await db.promise().execute('DELETE FROM promocion WHERE id_promocion = ?', [id]);
    res.json({ message: 'Promoción eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({
      error: 'Error al eliminar promoción',
      details: error.message
    });
  }
});

module.exports = router;