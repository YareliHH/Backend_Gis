const express = require('express');
const router = express.Router();
const db = require('../Config/db');

// Crear nueva dirección y vincular con usuario
router.post('/upsert', async (req, res) => {
  const {
    usuario_id, calle, numero, codigo_postal,
    estado, municipio, colonia, instrucciones, es_predeterminada
  } = req.body;

  try {
    // Verificar si la dirección ya existe para este usuario
    const queryCheck = `
      SELECT d.id FROM direcciones d
      JOIN usuarios_direcciones ud ON d.id = ud.direccion_id
      WHERE ud.usuario_id = ? AND d.calle = ? AND d.numero = ? 
        AND d.codigo_postal = ? AND d.estado = ? AND d.municipio = ? AND d.colonia = ?
    `;

    db.query(queryCheck, [usuario_id, calle, numero, codigo_postal, estado, municipio, colonia], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      if (results.length > 0) {
        return res.status(409).json({ mensaje: 'La dirección ya existe para este usuario.' });
      }

      // Insertar nueva dirección
      const insertDireccion = `
        INSERT INTO direcciones (usuario_id, calle, numero, codigo_postal, estado, municipio, colonia, instrucciones, fecha_registro) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;

      db.query(insertDireccion, [usuario_id, calle, numero, codigo_postal, estado, municipio, colonia, instrucciones], (err2, result) => {
        if (err2) return res.status(500).json({ error: err2.message });

        const direccion_id = result.insertId;

        // Si es predeterminada, resetear otras direcciones del usuario
        if (es_predeterminada) {
          db.query('UPDATE usuarios_direcciones SET es_predeterminada = 0 WHERE usuario_id = ?', [usuario_id]);
        }

        // Vincular dirección con usuario
        const insertUD = `
          INSERT INTO usuarios_direcciones (usuario_id, direccion_id, es_predeterminada)
          VALUES (?, ?, ?)
        `;
        
        db.query(insertUD, [usuario_id, direccion_id, es_predeterminada ? 1 : 0], (err3) => {
          if (err3) return res.status(500).json({ error: err3.message });
          res.json({ mensaje: 'Dirección registrada correctamente.', direccion_id });
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno en el servidor.' });
  }
});

// Obtener todas las direcciones de un usuario
router.get('/usuario/:usuario_id', (req, res) => {
  const { usuario_id } = req.params;

  const query = `
    SELECT d.*, ud.id as usuario_direccion_id, ud.es_predeterminada
    FROM direcciones d
    JOIN usuarios_direcciones ud ON d.id = ud.direccion_id
    WHERE ud.usuario_id = ?
    ORDER BY ud.es_predeterminada DESC, d.fecha_registro DESC
  `;

  db.query(query, [usuario_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Actualizar dirección específica
router.put('/actualizar/:direccion_id', (req, res) => {
  const { direccion_id } = req.params;
  const { calle, numero, codigo_postal, estado, municipio, colonia, instrucciones } = req.body;

  const query = `
    UPDATE direcciones SET 
      calle = ?, numero = ?, codigo_postal = ?, estado = ?, 
      municipio = ?, colonia = ?, instrucciones = ?
    WHERE id = ?
  `;

  db.query(query, [calle, numero, codigo_postal, estado, municipio, colonia, instrucciones, direccion_id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: 'Dirección no encontrada.' });
    }

    res.json({ mensaje: 'Dirección actualizada correctamente.' });
  });
});

// Establecer dirección como predeterminada
router.put('/predeterminada/:usuario_id/:direccion_id', (req, res) => {
  const { usuario_id, direccion_id } = req.params;

  // Primero resetear todas las direcciones del usuario
  const reset = 'UPDATE usuarios_direcciones SET es_predeterminada = 0 WHERE usuario_id = ?';
  
  // Luego establecer la nueva como predeterminada
  const setDefault = `
    UPDATE usuarios_direcciones SET es_predeterminada = 1 
    WHERE usuario_id = ? AND direccion_id = ?
  `;

  db.query(reset, [usuario_id], (err1) => {
    if (err1) return res.status(500).json({ error: err1.message });

    db.query(setDefault, [usuario_id, direccion_id], (err2, result) => {
      if (err2) return res.status(500).json({ error: err2.message });
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ mensaje: 'Dirección no encontrada.' });
      }
      
      res.json({ mensaje: 'Dirección establecida como predeterminada.' });
    });
  });
});

// Eliminar vinculación usuario-dirección
router.delete('/desvincular/:usuario_id/:direccion_id', (req, res) => {
  const { usuario_id, direccion_id } = req.params;

  // Primero verificar si es la única dirección
  const checkQuery = 'SELECT COUNT(*) as total FROM usuarios_direcciones WHERE usuario_id = ?';
  
  db.query(checkQuery, [usuario_id], (err1, countResult) => {
    if (err1) return res.status(500).json({ error: err1.message });
    
    const totalDirecciones = countResult[0].total;
    
    // Eliminar la vinculación
    const deleteLink = `
      DELETE FROM usuarios_direcciones 
      WHERE usuario_id = ? AND direccion_id = ?
    `;

    db.query(deleteLink, [usuario_id, direccion_id], (err2, result) => {
      if (err2) return res.status(500).json({ error: err2.message });
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ mensaje: 'Dirección no encontrada.' });
      }
      
      // Si había más de una dirección y eliminamos una, verificar si era predeterminada
      if (totalDirecciones > 1) {
        const checkDefault = `
          SELECT COUNT(*) as predeterminadas 
          FROM usuarios_direcciones 
          WHERE usuario_id = ? AND es_predeterminada = 1
        `;
        
        db.query(checkDefault, [usuario_id], (err3, defaultResult) => {
          if (err3) return res.status(500).json({ error: err3.message });
          
          // Si no hay predeterminada, establecer la primera como predeterminada
          if (defaultResult[0].predeterminadas === 0) {
            const setFirstAsDefault = `
              UPDATE usuarios_direcciones 
              SET es_predeterminada = 1 
              WHERE usuario_id = ? 
              ORDER BY id ASC 
              LIMIT 1
            `;
            db.query(setFirstAsDefault, [usuario_id]);
          }
        });
      }
      
      res.json({ mensaje: 'Dirección eliminada correctamente.' });
    });
  });
});

// Obtener dirección predeterminada de un usuario
router.get('/predeterminada/:usuario_id', (req, res) => {
  const { usuario_id } = req.params;

  const query = `
    SELECT d.*, ud.id as usuario_direccion_id
    FROM direcciones d
    JOIN usuarios_direcciones ud ON d.id = ud.direccion_id
    WHERE ud.usuario_id = ? AND ud.es_predeterminada = 1
    LIMIT 1
  `;

  db.query(query, [usuario_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (results.length === 0) {
      return res.status(404).json({ mensaje: 'No se encontró dirección predeterminada.' });
    }
    
    res.json(results[0]);
  });
});

module.exports = router;