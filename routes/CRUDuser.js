const express = require('express');
const router = express.Router();
const connection = require('../Config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const axios = require('axios');


const LOCK_TIME_MINUTES = 20;

// Login (mantener tu implementación actual con pequeñas modificaciones)
router.post('/login', async (req, res) => {
    const { correo, password, captchaValue } = req.body;

    // Validar reCAPTCHA antes de proceder con el login
    try {
        const recaptchaResponse = await axios.post(
            `https://www.google.com/recaptcha/api/siteverify?secret=6LcKwWEqAAAAAN5jWmdv3NLpvl6wSeIRRnm9Omjq&response=${captchaValue}`
        );

        if (!recaptchaResponse.data.success) {
            return res.status(400).json({ error: 'Error en la verificación de reCAPTCHA' });
        }
    } catch (error) {
        console.error('Error en la validación de reCAPTCHA:', error);
        return res.status(500).json({ error: 'Error en la verificación de reCAPTCHA' });
    }

    // Consulta a la base de datos para encontrar al usuario por correo
    const query = 'SELECT * FROM usuarios WHERE correo = ?';
    connection.query(query, [correo], (err, results) => {
        if (err) {
            console.error('Error en la base de datos:', err);
            return res.status(500).json({ error: 'Error en la base de datos' });
        }

        if (results.length === 0) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }

        const usuario = results[0];
        const currentTime = Date.now();

        // Verificar si el usuario está bloqueado
        const queryAttempts = 'SELECT * FROM login_attempts WHERE usuarios_id = ?';
        connection.query(queryAttempts, [usuario.id], (err, attemptsResult) => {
            if (err) {
                console.error('Error al consultar los intentos de login:', err);
                return res.status(500).json({ error: 'Error en la base de datos' });
            }

            let lockUntil = null;

            if (attemptsResult.length > 0) {
                const attempt = attemptsResult[0];
                lockUntil = attempt.fecha_bloqueo;
            }

            if (lockUntil && currentTime < lockUntil) {
                const remainingTime = Math.round((lockUntil - currentTime) / 60000);
                return res.status(403).json({ error: `Cuenta bloqueada. Inténtalo de nuevo en ${remainingTime} minutos.` });
            }

            // Comparar contraseñas
            bcrypt.compare(password, usuario.password, (err, isMatch) => {
                if (err) {
                    console.error('Error al comparar contraseñas:', err);
                    return res.status(500).json({ error: 'Error al comparar contraseñas' });
                }

                if (!isMatch) {
                    let loginAttempts = 1;
                    let newLockUntil = null;

                    if (attemptsResult.length > 0) {
                        loginAttempts = attemptsResult[0].intentos_fallidos + 1;
                    }

                    if (loginAttempts >= 5) {
                        newLockUntil = Date.now() + LOCK_TIME_MINUTES * 60 * 1000;
                        loginAttempts = 0;
                    }

                    const updateAttemptsQuery = `
                        INSERT INTO login_attempts (usuarios_id, intentos_fallidos, fecha_bloqueo)
                        VALUES (?, ?, ?)
                        ON DUPLICATE KEY UPDATE intentos_fallidos = ?, fecha_bloqueo = ?`;

                    connection.query(updateAttemptsQuery, [usuario.id, loginAttempts, newLockUntil, loginAttempts, newLockUntil], (err) => {
                        if (err) {
                            console.error('Error al actualizar intentos de login:', err);
                            return res.status(500).json({ error: 'Error al procesar el inicio de sesión' });
                        }

                        if (newLockUntil) {
                            return res.status(403).json({ error: `Cuenta bloqueada por ${LOCK_TIME_MINUTES} minutos debido a demasiados intentos fallidos.` });
                        }

                        return res.status(401).json({ error: 'Contraseña incorrecta' });
                    });
                } else {
                    // Generar token de sesión y guardarlo en cookie
                    const sessionToken = crypto.randomBytes(64).toString('hex');

                    const updateTokenQuery = 'UPDATE usuarios SET cookie = ? WHERE id = ?';
                    connection.query(updateTokenQuery, [sessionToken, usuario.id], (err) => {
                        if (err) {
                            console.error('Error al guardar el token en la base de datos:', err);
                            return res.status(500).json({ error: 'Error al procesar el inicio de sesión' });
                        }

                        // Registro de la actividad de inicio de sesión
                        const registroActividadQuery = `
                            INSERT INTO registro_actividades (usuarios_id, actividad, fecha)
                            VALUES (?, 'Inicio de sesión', NOW())
                        `;
                        connection.query(registroActividadQuery, [usuario.id], (err) => {
                            if (err) {
                                console.error('Error al registrar la actividad:', err);
                            }
                        });

                        // Configurar cookie visible (no httpOnly)
                        res.cookie('auth_cookie', sessionToken, {
                            httpOnly: false, // Para que sea visible en el navegador
                            secure: process.env.NODE_ENV === 'production',
                            sameSite: 'Lax',
                            maxAge: 24 * 60 * 60 * 1000, // 1 día
                            path: '/'
                        });
                        
                        res.json({
                            user: usuario.correo,
                            tipo: usuario.tipo,
                        });
                    });
                }
            });
        });
    });
});

// Verificar autenticación
router.get('/verificar-auth', (req, res) => {
    const token = req.cookies.auth_cookie;
    
    if (!token) {
        return res.json({ autenticado: false });
    }

    const query = 'SELECT * FROM usuarios WHERE cookie = ?';
    connection.query(query, [token], (err, results) => {
        if (err) {
            console.error('Error al verificar autenticación:', err);
            return res.status(500).json({ error: 'Error al verificar autenticación' });
        }

        if (results.length === 0) {
            return res.json({ autenticado: false });
        }

        const usuario = results[0];
        return res.json({
            autenticado: true,
            user: usuario.correo,
            tipo: usuario.tipo,
            id: usuario.id
        });
    });
});

// Logout
router.post('/logout', (req, res) => {
    const token = req.cookies.auth_cookie;
    
    if (token) {
        // Actualizar BD para eliminar la cookie
        const query = 'UPDATE usuarios SET cookie = NULL WHERE cookie = ?';
        connection.query(query, [token], (err) => {
            if (err) {
                console.error('Error al cerrar sesión en la base de datos:', err);
            }
        });
    }
    
    // Eliminar cookie del navegador
    res.clearCookie('auth_cookie', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
        path: '/'
    });
    
    res.json({ mensaje: 'Sesión cerrada correctamente' });
});

module.exports = router;
