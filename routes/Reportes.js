const express = require('express');
const router = express.Router();
const connection = require('../Config/db');


// Endpoint para obtener intentos de login
router.get('/login-attempts', async (req, res) => {
    try {
      const attemptsSql = `
        SELECT id, ip_address, usuarios_id, fecha_hora, intentos_fallidos, fecha_bloqueo
        FROM login_attempts
      `;
      
      db.query(attemptsSql, async (err, attempts) => {
        if (err) {
          return res.status(500).json({ message: 'Error al obtener los intentos de inicio de sesión.' });
        }
  
        // También puedes agregar la configuración de intentos máximos y tiempo de bloqueo si es relevante
        const maxAttemptsSql = 'SELECT setting_value FROM config WHERE setting_name = "MAX_ATTEMPTS"';
        const lockTimeSql = 'SELECT setting_value FROM config WHERE setting_name = "LOCK_TIME_MINUTES"';
  
        const maxAttempts = await new Promise((resolve, reject) => {
          db.query(maxAttemptsSql, (err, result) => {
            if (err) reject(err);
            else resolve(parseInt(result[0].setting_value, 10));
          });
        });
  
        const lockTimeMinutes = await new Promise((resolve, reject) => {
          db.query(lockTimeSql, (err, result) => {
            if (err) reject(err);
            else resolve(parseInt(result[0].setting_value, 10));
          });
        });
  
        res.status(200).json({
          attempts,
          maxAttempts,
          lockTimeMinutes
        });
      });
    } catch (error) {
      res.status(500).json({ message: 'Error en el servidor.' });
    }
  });

// Endpoint para obtener logs
router.get('/logs', async (req, res) => {
    const query = 'SELECT * FROM logs';
    connection.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error al obtener logs' });
        }
        res.status(200).json(results);
    });
});

// Endpoint para obtener actividades


router.get('/reportes/actividades', (req, res) => {
  const query = `
      SELECT ra.id, ra.actividad, ra.fecha, u.nombre AS usuario
      FROM registro_actividades ra
      JOIN usuarios u ON ra.usuarios_id = u.id
      ORDER BY ra.fecha DESC
  `;

  connection.query(query, (err, results) => {
    if (err) {
      console.error('Error al obtener actividades:', err.message);
      return res.status(500).json({ message: 'Error interno del servidor.' });
    }

    if (results.length === 0) {
      console.warn('La consulta no devolvió resultados.');
      return res.status(404).json({ message: 'No se encontraron actividades.' });
    }

    console.log('Resultados de la consulta:', results);
    res.status(200).json(results);
  });
});

router.get('/usuarios/:id', (req, res) => {
    const usuarios_id = req.params.id;

    const query = 'SELECT * FROM usuarios WHERE id = ?';
    db.query(query, [usuariosId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error al obtener la información del usuario' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'usuario no encontrado' });
        }

        res.status(200).json(results[0]); 
    });
});

// Este endpoint actualizará 
router.post('/update-config', async (req, res) => {
    const { settingName, settingValue } = req.body;
  
    if (!settingName || !settingValue) {
      return res.status(400).json({ message: 'Nombre y valor de la configuración son requeridos.' });
    }
  
    const updateConfigSql = 'UPDATE config SET setting_value = ? WHERE setting_name = ?';
  
    db.query(updateConfigSql, [settingValue, settingName], (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Error al actualizar la configuración.' });
      }
      return res.status(200).json({ message: 'Configuración actualizada exitosamente.' });
    });
  });
  


module.exports = router;