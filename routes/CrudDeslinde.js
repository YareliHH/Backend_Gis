const express = require('express');
const router = express.Router();
const connection = require('../Config/db');


// Ruta para insertar un nuevo deslinde legal
router.post('/deslinde', (req, res) => {

    // Query para desactivar todos los registros actuales 
    const deactivateQuery = 'UPDATE tbldeslinde_legal SET estado = "inactivo"';

    connection.query(deactivateQuery, (err, result) => {
        if (err) {
            console.log('Error al desactivar los registros:', err);
            return res.status(500).send('Error en el servidor al actualizar los estados a inactivo');
        }

        console.log(`Filas afectadas: ${result.affectedRows}`); // Verifica cuántas filas fueron actualizadas.

        // Query para obtener la versión máxima actual
        const selectQuery = 'SELECT MAX(CAST(version AS DECIMAL(5,2))) AS maxVersion FROM tbldeslinde_legal';

        connection.query(selectQuery, (err, result) => {
            if (err) {
                console.log('Error al obtener la versión máxima:', err);
                return res.status(500).send('Error en el servidor al obtener la versión actual');
            }

            const maxVersion = result[0].maxVersion ? Math.floor(parseFloat(result[0].maxVersion)) + 1 : 1;

            // Insertar el nuevo deslinde con la versión calculada
            const insertQuery = 'INSERT INTO tbldeslinde_legal (titulo, contenido, estado, version) VALUES (?, ?, ?, ?)';
            const { titulo, contenido } = req.body;
            connection.query(insertQuery, [titulo, contenido, 'activo', maxVersion.toFixed(2)], (err) => {
                if (err) {
                    console.log('Error al insertar el deslinde:', err);
                    return res.status(500).send('Error en el servidor al insertar nueva política');
                }
                res.status(200).send(`Deslinde legal insertado con éxito, versión ${maxVersion.toFixed(2)}`);
            });
        });
    });
});

// Ruta para actualizar un deslinde
router.put('/updatedeslinde/:id', (req, res) => {
    const { titulo, contenido } = req.body;
    const { id } = req.params;

    // Primero obtenemos la última versión de esta deslinde para calcular la nueva versión
    const selectQuery = 'SELECT MAX(CAST(version AS DECIMAL(5,2))) AS maxVersion FROM tbldeslinde_legal WHERE id = ?';

    connection.query(selectQuery, [id], (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Error al obtener la versión actual');
        }

        // Obtener la versión más alta del deslinde y calcular la siguiente versión (decimal)
        const currentVersion = result[0].maxVersion;
        let newVersion;

        if (currentVersion) {
            // Si la versión ya tiene un decimal, simplemente incrementamos la parte decimal
            const versionParts = currentVersion.toString().split('.');
            if (versionParts.length === 1 || versionParts[1] === '00') {
                newVersion = `${versionParts[0]}.1`;
            } else {
                const majorVersion = versionParts[0];
                const minorVersion = parseInt(versionParts[1], 10) + 1;
                newVersion = `${majorVersion}.${minorVersion}`;
            }
        } else {
            // Si no hay versiones anteriores, comenzamos con la versión 1.1
            newVersion = '1.1';
        }

        // Desactivar la versión anterior de la deslinde
        const deactivateQuery = 'UPDATE  tbldeslinde_legal SET estado = "inactivo" WHERE id = ?';
        connection.query(deactivateQuery, [id], (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).send('Error al desactivar la versión anterior');
            }

            // Insertar la nueva política con la versión incrementada (decimal)
            const insertQuery = 'INSERT INTO  tbldeslinde_legal (titulo, contenido, estado, version) VALUES (?, ?, ?, ?)';
            const { titulo, contenido } = req.body;
            connection.query(insertQuery, [titulo, contenido, 'activo', newVersion], (err, result) => {
                if (err) {
                    console.log(err);
                    return res.status(500).send('Error al insertar la nueva versión de la deslinde');
                }
                res.status(200).send(`deslinde legal a la versión ${newVersion}`);
            });
        });
    });
});

// Ruta para eliminar (lógicamente) una política de privacidad
router.put('/deactivate/:id', (req, res) => {
    const { id } = req.params;

    const query = 'UPDATE  tbldeslinde_legal SET estado = ? WHERE id = ?';

    connection.query(query, ['inactivo', id], (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Error en el servidor');
        }
        res.status(200).send('deslinde legal  eliminada (lógicamente) con éxito');
    });
});

// Ruta para obtener todas las políticas de privacidad activass
router.get('/getdeslindeactivo', (req, res) => {
    const query = 'SELECT * FROM  tbldeslinde_legal WHERE estado = "activo" ORDER BY id';

    connection.query(query, (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Error en el servidor');
        }
        res.status(200).json(results);
    });
});

// Ruta para obtener todas las políticas (activas e inactivas)
router.get('/getdeslinde', (req, res) => {
    const query = 'SELECT * FROM tbldeslinde_legal ORDER BY version, CAST(version AS DECIMAL(5,2)) ASC';

    connection.query(query, (err, results) => {
        if (err) {
            console.error('Error al ejecutar la consulta:', err); // Detalles del error
            return res.status(500).json({
                message: 'Error al obtener los deslindes',
                error: err.message // Enviar el mensaje de error al frontend
            });
        }
        res.status(200).json(results);
    });
});

// Ruta para obtener deslinde legal activo
router.get('/deslinde/deslinde', (req, res) => {
    const query = 'SELECT * FROM tbldeslinde_legal WHERE estado = "activo"';
    connection.query(query, (err, results) => {
      if (err) {
        console.error('Error al obtener deslinde legal:', err);
        return res.status(500).json({ message: 'Error al obtener deslinde legal.' });
      }
      res.status(200).json(results);
    });
  });
  

module.exports = router;
