const express = require('express');
const router = express.Router();
const db = require('../Config/db');


// 🔹 Actualizar dirección por ID
router.put('/actualizar/:direccion_id', (req, res) => {
  const { direccion_id } = req.params;
  const {
    calle,
    numero,
    codigo_postal,
    estado,
    municipio,
    colonia,
    instrucciones
  } = req.body;

  const query = `
    UPDATE direcciones SET 
      calle = ?, numero = ?, codigo_postal = ?, estado = ?, 
      municipio = ?, colonia = ?, instrucciones = ?
    WHERE id = ?
  `;

  db.query(
    query,
    [calle, numero, codigo_postal, estado, municipio, colonia, instrucciones, direccion_id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });

      if (result.affectedRows === 0) {
        return res.status(404).json({ mensaje: 'Dirección no encontrada.' });
      }

      res.json({ mensaje: 'Dirección actualizada correctamente.' });
    }
  );
});

// 🔹 Crear dirección y vincular con usuario
router.post('/upsert', async (req, res) => {
  const {
    usuario_id,
    calle,
    numero,
    codigo_postal,
    estado,
    municipio,
    colonia,
    instrucciones,
    es_predeterminada
  } = req.body;

  try {
    const queryCheck = `
      SELECT d.id FROM direcciones d
      JOIN usuarios_direcciones ud ON d.id = ud.direccion_id
      WHERE ud.usuario_id = ? AND d.calle = ? AND d.numero = ? 
        AND d.codigo_postal = ? AND d.estado = ? AND d.municipio = ? AND d.colonia = ?
    `;

    db.query(
      queryCheck,
      [usuario_id, calle, numero, codigo_postal, estado, municipio, colonia],
      (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        if (results.length > 0) {
          return res.status(409).json({ mensaje: 'La dirección ya existe para este usuario.' });
        }

        const insertDireccion = `
          INSERT INTO direcciones 
          (calle, numero, codigo_postal, estado, municipio, colonia, instrucciones) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(
          insertDireccion,
          [calle, numero, codigo_postal, estado, municipio, colonia, instrucciones],
          (err2, result) => {
            if (err2) return res.status(500).json({ error: err2.message });

            const direccion_id = result.insertId;

            // Si es predeterminada, resetear otras
            if (es_predeterminada) {
              db.query(
                'UPDATE usuarios_direcciones SET es_predeterminada = 0 WHERE usuario_id = ?',
                [usuario_id]
              );
            }

            const insertUD = `
              INSERT INTO usuarios_direcciones (usuario_id, direccion_id, es_predeterminada)
              VALUES (?, ?, ?)
            `;
            db.query(insertUD, [usuario_id, direccion_id, es_predeterminada ? 1 : 0], (err3) => {
              if (err3) return res.status(500).json({ error: err3.message });
              res.json({ mensaje: 'Dirección registrada y vinculada correctamente.', direccion_id });
            });
          }
        );
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Error interno en el servidor.' });
  }
});

// 🔹 Obtener direcciones del usuario
router.get('/usuario/:usuario_id', (req, res) => {
  const { usuario_id } = req.params;

  const query = `
    SELECT d.*, ud.id as usuario_direccion_id, ud.es_predeterminada
    FROM direcciones d
    JOIN usuarios_direcciones ud ON d.id = ud.direccion_id
    WHERE ud.usuario_id = ?
  `;

  db.query(query, [usuario_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// 🔹 Establecer una dirección como predeterminada
router.put('/predeterminada/:usuario_id/:direccion_id', (req, res) => {
  const { usuario_id, direccion_id } = req.params;

  const reset = `
    UPDATE usuarios_direcciones SET es_predeterminada = 0 WHERE usuario_id = ?
  `;
  const setDefault = `
    UPDATE usuarios_direcciones SET es_predeterminada = 1 
    WHERE usuario_id = ? AND direccion_id = ?
  `;

  db.query(reset, [usuario_id], (err1) => {
    if (err1) return res.status(500).json({ error: err1.message });

    db.query(setDefault, [usuario_id, direccion_id], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ mensaje: 'Dirección marcada como predeterminada.' });
    });
  });
});

// 🔹 Eliminar dirección vinculada
router.delete('/desvincular/:usuario_id/:direccion_id', (req, res) => {
  const { usuario_id, direccion_id } = req.params;

  const deleteLink = `
    DELETE FROM usuarios_direcciones 
    WHERE usuario_id = ? AND direccion_id = ?
  `;

  db.query(deleteLink, [usuario_id, direccion_id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ mensaje: 'Dirección desvinculada del usuario.' });
  });
});

module.exports = router;
