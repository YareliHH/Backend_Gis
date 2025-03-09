const express = require("express");
const router = express.Router();
const db = require("../db");

// Agregar un producto al carrito
router.post("/agregar", async (req, res) => {
    const { usuario_id, producto_id } = req.body;

    try {
        // Verificar si el producto ya está en el carrito
        const [existe] = await db.query("SELECT * FROM carrito WHERE usuario_id = ? AND producto_id = ?", [usuario_id, producto_id]);

        if (existe.length === 0) {
            // Insertar solo si el producto no está en el carrito
            await db.query("INSERT INTO carrito (usuario_id, producto_id) VALUES (?, ?)", [usuario_id, producto_id]);
            res.status(200).json({ message: "Producto agregado al carrito" });
        } else {
            res.status(400).json({ message: "El producto ya está en el carrito" });
        }
    } catch (error) {
        res.status(500).json({ error: "Error al agregar el producto al carrito" });
    }
});

// Obtener los productos del carrito de un usuario
router.get("/:usuario_id", async (req, res) => {
    const { usuario_id } = req.params;

    try {
        const [carrito] = await db.query(`
            SELECT c.producto_id, p.nombre, c.fecha_creacion, c.fecha_actualizacion
            FROM carrito c
            INNER JOIN productos p ON c.producto_id = p.id
            WHERE c.usuario_id = ?`, [usuario_id]);

        res.status(200).json(carrito);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener el carrito" });
    }
});

// Eliminar un producto del carrito
router.delete("/eliminar/:usuario_id/:producto_id", async (req, res) => {
    const { usuario_id, producto_id } = req.params;

    try {
        await db.query("DELETE FROM carrito WHERE usuario_id = ? AND producto_id = ?", [usuario_id, producto_id]);
        res.status(200).json({ message: "Producto eliminado del carrito" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar el producto" });
    }
});

// Vaciar el carrito de un usuario
router.delete("/vaciar/:usuario_id", async (req, res) => {
    const { usuario_id } = req.params;

    try {
        await db.query("DELETE FROM carrito WHERE usuario_id = ?", [usuario_id]);
        res.status(200).json({ message: "Carrito vaciado correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error al vaciar el carrito" });
    }
});

module.exports = router;
