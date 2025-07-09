const express = require('express');
const connection = require('../Config/db'); // Asegúrate de que esta sea la ruta correcta a tu configuración de base de datos
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 10 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg' || file.mimetype === 'image/png') {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos JPEG, JPG y PNG'), false);
        }
    },
});

cloudinary.config({
    cloud_name: 'dqshjerfz',
    api_key: '621792211413143',
    api_secret: '7Y2SiySDJ_WzYdaN96uoyUdtyt54',
});

// Endpoint para insertar el perfil de empresa
router.post('/perfiles', upload.single('logo'), async (req, res) => {
    const { nombre_empresa, direccion, telefono, correo_electronico, descripcion, slogan } = req.body;
    if (!nombre_empresa || !correo_electronico) return res.status(400).send('Nombre de empresa y correo electrónico son obligatorios');

    let logoUrl = null;
    if (req.file) {
        try {
            const uploadResult = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { resource_type: 'image', folder: 'logos_empresas' },
                    (error, result) => {
                        if (error) reject(error);
                        resolve(result);
                    }
                );
                stream.end(req.file.buffer);
            });
            logoUrl = uploadResult.secure_url;
        } catch (uploadError) {
            console.error(uploadError);
            return res.status(500).send('Error al subir el logo a Cloudinary');
        }
    }

    const query = `INSERT INTO perfil_empresa (nombre_empresa, direccion, telefono, correo_electronico, descripcion, logo, slogan) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    connection.query(query, [nombre_empresa, direccion, telefono, correo_electronico, descripcion, logoUrl, slogan], (err) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Error en el servidor');
        }
        res.status(200).send('Perfil de empresa insertado con éxito');
    });
});

// Endpoint para actualizar el perfil de empresa
router.put('/updateDatos', upload.single('logo'), async (req, res) => {
    const { id_empresa, nombre_empresa, direccion, telefono, correo_electronico, descripcion, slogan} = req.body;
    let logoUrl = null;
    if (req.file) {
        try {
            const uploadResult = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { resource_type: 'image', folder: 'logos_empresas' },
                    (error, result) => {
                        if (error) reject(error);
                        resolve(result);
                    }
                );
                stream.end(req.file.buffer);
            });
            logoUrl = uploadResult.secure_url;
        } catch (uploadError) {
            console.error(uploadError);
            return res.status(500).send('Error al subir el logo a Cloudinary');
        }
    }

    const query = `UPDATE perfil_empresa SET nombre_empresa = ?, direccion = ?, telefono = ?, correo_electronico = ?, descripcion = ?, 
                   slogan = ?, logo = ? WHERE id_empresa = ?`;
    const values = [nombre_empresa, direccion, telefono, correo_electronico, descripcion, slogan, logoUrl, id_empresa];

    connection.query(query, values, (err) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Error en el servidor');
        }
        res.status(200).send('Perfil de empresa actualizado con éxito');
    });
});




// Endpoint para actualizar el logo de la empresa
router.put('/updateLogo', (req, res, next) => {
    upload.single('logo')(req, res, (err) => {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).send('El archivo es demasiado grande. El tamaño máximo permitido es de 10MB.');
        } else if (err) {
            return res.status(400).send(err.message);
        }
        next();
    });
}, (req, res) => {
    const { id_empresa } = req.body;
    const logo = req.file ? req.file.buffer : null;

    if (!id_empresa) {
        return res.status(400).send('El id_empresa es obligatorio para actualizar el logo');
    }

    if (!logo) {
        return res.status(400).send('No se ha proporcionado un logo para actualizar');
    }

    const query = `UPDATE perfil_empresa SET logo = ? WHERE id_empresa = ?`;

    db.query(query, [logo, id_empresa], (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Error en el servidor al actualizar el logo');
        }

        if (result.affectedRows === 0) {
            return res.status(404).send('Perfil de empresa no encontrado');
        }

        res.status(200).send('Logo actualizado con éxito');
    });
});

// Endpoint para obtener el perfil de la empresa
router.get('/perfil_empresa/get', async (req, res) => {
    const query = `SELECT * FROM perfil_empresa`;

    connection.query(query, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error en el servidor');
        }

        if (results.length === 0) {
            return res.status(404).send('No se encontraron perfiles de empresa');
        }

        res.status(200).json(results); // Devuelve todos los resultados como JSON
    });
});


// Endpoint para actualizar
router.put('/updateDatos', (req, res) => {
    console.log(req.body);  // <-- Verifica los datos que estás recibiendo en el backend
    const { id_empresa, nombre_empresa, direccion, telefono, correo_electronico, descripcion, slogan, titulo_pagina } = req.body;

    if (!id_empresa) {
        return res.status(400).send('El id_empresa es obligatorio para actualizar los datos');
    }

    if (!nombre_empresa || !correo_electronico) {
        return res.status(400).send('Nombre de empresa y correo electrónico son obligatorios');
    }

    const query = `UPDATE perfil_empresa SET nombre_empresa = ?, direccion = ?, telefono = ?, correo_electronico = ?, descripcion = ?, slogan = ?, titulo_pagina = ? WHERE id_empresa = ?`;

    const queryParams = [nombre_empresa, direccion, telefono, correo_electronico, descripcion, slogan, titulo_pagina, id_empresa];

    db.query(query, queryParams, (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Error en el servidor al actualizar los datos');
        }

        if (result.affectedRows === 0) {
            return res.status(404).send('Perfil de empresa no encontrado');
        }

        res.status(200).send('Datos de la empresa actualizados con éxito');
    });
});


// Endpoint para eliminar el perfil de empresa
router.delete('/delete/:id', (req, res) => {
    const { id } = req.params;

    const query = `DELETE FROM perfil_empresa WHERE id_empresa = ?`;
    db.query(query, [id], (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Error en el servidor');
        }
        res.status(200).send('Perfil de empresa eliminado con éxito');
    });
});

// Endpoint para obtener el logo y el título de la página
router.get('/getTitleAndLogo', (req, res) => {
    const query = `SELECT titulo_pagina, logo FROM perfil_empresa LIMIT 1`;

    db.query(query, (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Error en el servidor al obtener los datos');
        }

        if (results.length === 0) {
            return res.status(404).send('No se encontraron datos');
        }

        const perfilEmpresa = results[0];

        // Convertir el logo a base64 para enviarlo al frontend
        if (perfilEmpresa.logo) {
            perfilEmpresa.logo = perfilEmpresa.logo.toString('base64');
        }

        // Enviar el título de la página y el logo
        res.status(200).json({
            titulo_pagina: perfilEmpresa.titulo_pagina,
            logo: perfilEmpresa.logo,
        });
    });
});

// Exportar el router
module.exports = router;