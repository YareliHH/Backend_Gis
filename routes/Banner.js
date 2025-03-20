const express = require("express");
const router = express.Router();
const db = require('../Config/db'); 


// Obtener todos los banners
app.get("/obtener", (req, res) => {
  const sql = "SELECT * FROM banners";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Insertar un nuevo banner
app.post("/insertar", (req, res) => {
  const { titulo, descripcion, url } = req.body;
  const sql = "INSERT INTO banners (titulo, descripcion, url) VALUES (?, ?, ?)";
  db.query(sql, [titulo, descripcion, url], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: result.insertId, titulo, descripcion, url });
  });
});

//  Actualizar un banner por ID
app.put("/bannersact/:id", (req, res) => {
  const { id } = req.params;
  const { titulo, descripcion, url } = req.body;
  const sql = "UPDATE banners SET titulo=?, descripcion=?, url=? WHERE id=?";
  db.query(sql, [titulo, descripcion, url, id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ mensaje: "Banner actualizado" });
  });
});

// Eliminar un banner por ID
app.delete("/banners/:id", (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM banners WHERE id=?";
  db.query(sql, [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ mensaje: "Banner eliminado" });
  });
});

module.exports = router;
