const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authorizeAdmin } = require('../middleware/auth');

// ── GET /api/admin/categories?type=category|look|theme|collection ─────────────
router.get('/', authorizeAdmin, categoryController.getAdminCategories);

// ── POST /api/admin/categories  (body: { name, type, ... }) ──────────────────
router.post('/', authorizeAdmin, categoryController.createCategory);

// ── POST /api/admin/categories/seed  (idempotent — safe to run anytime) ──────
router.post('/seed', authorizeAdmin, categoryController.seedFashionTaxonomy);

// ── PUT /api/admin/categories/reorder  ───────────────────────────────────────
router.put('/reorder', authorizeAdmin, categoryController.reorderCategories);

// ── PUT /api/admin/categories/:id  ───────────────────────────────────────────
router.put('/:id', authorizeAdmin, categoryController.updateCategory);

// ── DELETE /api/admin/categories/:id  ────────────────────────────────────────
router.delete('/:id', authorizeAdmin, categoryController.deleteCategory);

module.exports = router;

