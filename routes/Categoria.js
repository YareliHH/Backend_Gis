const express = require('express');
const router = express.Router();
const db = require('../Config/db'); // Conexión a MySQL

// Obtener una categoría por ID
router.get("/categorias/:id", (req, res) => {
    const { id } = req.params;
    const query = "SELECT * FROM categorias WHERE id = ?";
    db.query(query, [id], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (result.length === 0) {
            res.status(404).json({ mensaje: "Categoría no encontrada" });
        } else {
            res.json(result[0]);
        }
    });
});


module.exports = router;