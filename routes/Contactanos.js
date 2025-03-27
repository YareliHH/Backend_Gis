const express = require('express');
const router = express.Router();
const db = require('../Config/db');
const axios = require('axios');

// Endpoint para registrar un nuevo contacto
router.post('/contacto', async (req, res) => {
    const { nombre, correo, telefono, mensaje, recaptchaToken } = req.body;

    // Verificación de campos requeridos
    if (!nombre || !correo || !telefono || !mensaje) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }

    // Verificar reCAPTCHA
    try {
        const recaptchaResponse = await axios.post(
            'https://www.google.com/recaptcha/api/siteverify',
            null,
            {
                params: {
                    secret: '6LcKwWEqAAAAAN5jWmdv3NLpvl6wSeIRRnm9Omjq',
                    response: recaptchaToken
                }
            }
        );

        // Si la verificación de reCAPTCHA falla
        if (!recaptchaResponse.data.success) {
            return res.status(400).json({ message: 'Verificación de reCAPTCHA fallida' });
        }

        // Consulta SQL para insertar el contacto en la base de datos
        const sql = `INSERT INTO contactanos (nombre, correo, telefono, mensaje, fecha_creacion)
            VALUES (?, ?, ?, ?, NOW())`;

        db.query(sql, [nombre, correo, telefono, mensaje], (err, result) => {
            if (err) {
                console.error('Error al registrar el contacto en la base de datos:', err);
                return res.status(500).json({ message: 'Error al registrar el contacto' });
            }

            res.status(201).json({ 
                message: 'Contacto registrado exitosamente', 
                idContacto: result.insertId 
            });
        });

    } catch (error) {
        console.error('Error en la verificación de reCAPTCHA:', error);
        return res.status(500).json({ message: 'Error en la verificación de reCAPTCHA' });
    }
});

// Obtener todos los mensajes de contacto
router.get('/contactos', (req, res) => {
    const sql = 'SELECT * FROM contactanos ORDER BY fecha_creacion DESC';
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error al obtener los mensajes de contacto:', err);
            return res.status(500).json({ message: 'Error al obtener los mensajes' });
        }
        res.status(200).json(results);
    });
});

// Eliminar un mensaje por ID
router.delete('/contacto/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM contactanos WHERE id = ?';
    
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error al eliminar el mensaje de contacto:', err);
            return res.status(500).json({ message: 'Error al eliminar el mensaje' });
        }
        res.status(200).json({ message: 'Mensaje eliminado correctamente' });
    });
});

module.exports = router;