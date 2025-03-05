const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../Config/db');
const nodemailer = require('nodemailer');
const cron = require('node-cron');

// Configuración de nodemailer para envío de correos
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'gisliveboutique@gmail.com',
        pass: 'mwns rexk emce qdan',
    },
});

// Función para eliminar registros incompletos después de 10 minutos
const eliminarRegistrosIncompletos = () => {
    const sql =
        `DELETE FROM usuarios
      WHERE registro_completo = 0 
      AND TIMESTAMPDIFF(MINUTE, fecha_creacion, NOW()) > 10`
        ;

    db.query(sql, (err, result) => {
        if (err) {
            console.error('Error al eliminar registros incompletos:', err);
        } else {
            console.log( `${result.affectedRows} registros incompletos eliminados.`);
        }
    });
};
// Configuración del cron job para ejecutar la limpieza cada 10 minutos
cron.schedule('*/10 * * * *', () => {
    console.log('Ejecutando limpieza de registros incompletos...');
    eliminarRegistrosIncompletos();
});


// Función para generar un token aleatorio de 6 dígitos
const generateToken = () => Math.floor(100000 + Math.random() * 900000).toString();

// Función para enviar el correo de verificación
const sendVerificationEmail = async (correo, verificationToken, res) => {
    const mailOptions = {
        from: '20221124@uthh.edu.mx',
        to: correo,
        subject: 'Confirmación de Correo - Gislive Boutique',
        html: `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <div style="text-align: center; padding: 20px;">
                    <h1 style="color: #1976d2;">Gislive Boutique</h1>
                    <p>Para completar el registro, usa el siguiente código de verificación:</p>
                    <div style="padding: 10px; background-color: #f0f0f0; border-radius: 5px; display: inline-block; margin: 20px 0;">
                        <span style="font-size: 24px; font-weight: bold; color: #1976d2;">${verificationToken}</span>
                    </div>
                    <p><b>Importante:</b> Este código expirará en 15 minutos.</p>
                    <hr style="margin: 20px 0;">
                </div>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Correo de verificación enviado.' });
    } catch (mailError) {
        console.error('Error al enviar el correo de verificación:', mailError);
        res.status(500).json({ message: 'Error al enviar el correo de verificación.' });
    }
};

// Endpoint para verificar si el correo existe y enviar código de verificación si no existe
router.post('/verificar-correo', (req, res) => {
    const { correo } = req.body;

    const query = `SELECT * FROM usuarios WHERE correo = ?`;
    db.query(query, [correo], (err, results) => {
        if (err) {
            console.error('Error al verificar el correo en la base de datos:', err);
            return res.status(500).json({ message: 'Error al verificar el correo' });
        }

        if (results.length > 0) {
            return res.status(200).json({ exists: true });
        } else {
            // Generar token y crear un registro temporal en la tabla 'usuarios'
            const verificationToken = generateToken();
            const tokenExpiration = new Date(Date.now() + 900000); // Expira en 15 minutos

            const sql = `
                INSERT INTO usuarios (correo, registro_completo, token_verificacion, token_expiracion, tipo, estado)
                VALUES (?, 0, ?, ?, 'usuario', 'pendiente')
            `;

            db.query(sql, [correo, verificationToken, tokenExpiration], (err) => {
                if (err) {
                    console.error('Error al crear el registro temporal del usuario:', err);
                    return res.status(500).json({ message: 'Error al crear el registro temporal.' });
                }

                sendVerificationEmail(correo, verificationToken, res);
            });
        }
    });
});

// Endpoint para verificar el token antes de completar el registro
router.post('/verify-token', (req, res) => {
    const { correo, token } = req.body;

    const query = `SELECT * FROM usuarios WHERE correo = ? AND token_verificacion = ? AND token_expiracion > NOW()`;
    db.query(query, [correo, token], (err, results) => {
        if (err) {
            console.error('Error al verificar el token:', err);
            return res.status(500).json({ message: 'Error al verificar el token' });
        }

        if (results.length > 0) {
            return res.status(200).json({ valid: true });
        } else {
            return res.status(400).json({ valid: false, message: 'Token inválido o expirado.' });
        }
    });
});

// Endpoint para registrar un usuario y marcar el registro como completo
router.post('/registro', (req, res) => {
    const { nombre, apellidoPaterno, apellidoMaterno, correo, telefono, password } = req.body;

    // Verificación de campos requeridos
    if (!nombre || !apellidoPaterno || !apellidoMaterno || !correo || !password) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios excepto el teléfono' });
    }

    // Hashear la contraseña con bcrypt
    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
            console.error('Error al hashear la contraseña:', err);
            return res.status(500).json({ message: 'Error al registrar el usuario' });
        }

        // Consulta SQL para actualizar el registro temporal y completar el registro
        const sql = `
            UPDATE usuarios 
            SET nombre = ?, apellido_paterno = ?, apellido_materno = ?, telefono = ?, password = ?, estado = 'activo', registro_completo = 1
            WHERE correo = ? AND registro_completo = 0
        `;

        db.query(sql, [nombre, apellidoPaterno, apellidoMaterno, telefono || null, hashedPassword, correo], (err, result) => {
            if (err) {
                console.error('Error al completar el registro del usuario en la base de datos:', err);
                return res.status(500).json({ message: 'Error al completar el registro del usuario' });
            }

            if (result.affectedRows === 0) {
                // No se encontró un registro temporal para este correo o ya está completo
                return res.status(400).json({ message: 'Registro incompleto o ya existente. Verifica el token de verificación.' });
            }

            res.status(201).json({ message: 'Usuario registrado exitosamente' });
        });
    });
});

// Endpoint para recuperación de contraseña
router.post('/recuperacion_contra', (req, res) => {
    const { correo } = req.body;

    // Verificar si el correo existe en la tabla `usuarios`
    const checkUserSql = 'SELECT * FROM usuarios WHERE correo = ?';
    db.query(checkUserSql, [correo], (err, result) => {
        if (err) {
            console.error('Error al verificar el correo electrónico en la base de datos:', err);
            return res.status(500).json({ message: 'Error al verificar el correo electrónico.' });
        }

        // Si el correo no existe, responder con un mensaje de error
        if (result.length === 0) {
            return res.status(404).json({ message: 'No existe una cuenta con este correo electrónico.' });
        }

        // Generar un token de recuperación y establecer expiración (15 minutos)
        const verificationToken = generateToken();
        const tokenExpiration = new Date(Date.now() + 15 * 60 * 1000); // Expira en 15 minutos

        // Actualizar la tabla `usuarios` con el token de verificación y la expiración
        const updateTokenSql = `
            UPDATE usuarios 
            SET token_verificacion = ?, token_expiracion = ? 
            WHERE correo = ?
        `;
        db.query(updateTokenSql, [verificationToken, tokenExpiration, correo], (err) => {
            if (err) {
                console.error('Error al actualizar el token de recuperación en la base de datos:', err);
                return res.status(500).json({ message: 'Error al generar el token de recuperación.' });
            }

            // Enviar correo de recuperación
            sendRecoveryEmail(correo, verificationToken, res);
        });
    });
});

// Función para enviar el correo de recuperación de contraseña
const sendRecoveryEmail = async (correo, verificationToken, res) => {
    const mailOptions = {
        from: '20221124@uthh.edu.mx',
        to: correo,
        subject: 'Recuperación de Contraseña - Gislive Boutique',
        html: `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <div style="text-align: center; padding: 20px;">
                    <h1 style="color: #1976d2;">Gislive Boutique</h1>
                    <p>Hemos recibido una solicitud para restablecer tu contraseña.</p>
                    <p>Utiliza el siguiente código para completar el proceso de recuperación:</p>
                    <div style="padding: 10px; background-color: #f0f0f0; border-radius: 5px; display: inline-block; margin: 20px 0;">
                        <span style="font-size: 24px; font-weight: bold; color: #1976d2;">${verificationToken}</span>
                    </div>
                    <p><b>Nota:</b> Este código expira en 15 minutos.</p>
                    <hr style="margin: 20px 0;">
                    <footer>
                        <p>Gislive Boutique - Cuidando tu experiencia de usuario</p>
                        <p>Este es un correo generado automáticamente, por favor no respondas a este mensaje.</p>
                    </footer>
                </div>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Se ha enviado un correo de recuperación.' });
    } catch (mailError) {
        console.error('Error al enviar el correo de recuperación:', mailError);
        res.status(500).json({ message: 'Error al enviar el correo de recuperación.' });
    }
};

// Endpoint para verificar el token de recuperación de contraseña
router.post('/verify-tokene', (req, res) => {
    const { correo, token } = req.body;

    if (!correo || !token) {
        return res.status(400).json({ message: 'Correo y token son requeridos.' });
    }

    // Consulta para verificar que el token existe y que no ha expirado
    const query = `
        SELECT * FROM usuarios 
        WHERE correo = ? 
          AND token_verificacion = ? 
          AND token_expiracion > NOW()
    `;
    db.query(query, [correo, token], (err, results) => {
        if (err) {
            console.error('Error al verificar el token en la base de datos:', err);
            return res.status(500).json({ message: 'Error al verificar el token.' });
        }

        // Si no se encuentra un registro, el token es inválido o ha expirado
        if (results.length === 0) {
            return res.status(400).json({ valid: false, message: 'Token inválido o expirado.' });
        }

        // Si el token es válido, retornar una respuesta exitosa
        res.status(200).json({ valid: true, message: 'Token verificado correctamente.' });
    });
});

// Endpoint para restablecer la contraseña
router.post('/resetPassword', async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ message: 'Token y nueva contraseña son requeridos.' });
    }

    try {
        // Verificar si el token es válido y no ha expirado
        const query = `
            SELECT * FROM usuarios 
            WHERE token_verificacion = ? 
              AND token_expiracion > NOW()
              AND registro_completo = 1
        `;
        db.query(query, [token], async (err, results) => {
            if (err) {
                console.error('Error al verificar el token:', err);
                return res.status(500).json({ message: 'Error al verificar el token.' });
            }

            // Si no se encuentra el token, es inválido o ha expirado
            if (results.length === 0) {
                return res.status(400).json({ message: 'El token es inválido o ha expirado.' });
            }

            const userId = results[0].id;

            // Hashear la nueva contraseña
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            // Actualizar la contraseña del usuario e invalidar el token
            const updateQuery = `
                UPDATE usuarios 
                SET password = ?, token_verificacion = NULL, token_expiracion = NULL
                WHERE id = ?
            `;
            db.query(updateQuery, [hashedPassword, userId], (updateErr) => {
                if (updateErr) {
                    console.error('Error al actualizar la contraseña:', updateErr);
                    return res.status(500).json({ message: 'Error al actualizar la contraseña.' });
                }
                // Registrar la actividad de cambio de contraseña
                const registroActividadQuery = `
                    INSERT INTO registro_actividades (usuarios_id, actividad, fecha)
                    VALUES (?, 'Cambio de contraseña', NOW())
                `;
                db.query(registroActividadQuery, [userId], (registroErr) => {
                    if (registroErr) {
                        console.error('Error al registrar la actividad de cambio de contraseña:', registroErr);
                        // No bloqueamos el flujo principal, pero registramos el error en logs.
                    }
                });
                res.status(200).json({ message: 'Contraseña actualizada correctamente.' });
            });
        });
    } catch (error) {
        console.error('Error en el proceso de restablecimiento de contraseña:', error);
        res.status(500).json({ message: 'Error al procesar la solicitud de restablecimiento de contraseña.' });
    }
});

module.exports = router;
