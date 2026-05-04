const express = require('express');
const router = express.Router();
const influencerController = require('../controllers/influencerController');
const { authorizeAdmin } = require('../middleware/auth');

// ── GET /api/admin/influencers ───────────────────────────────────────────────
router.get('/', authorizeAdmin, influencerController.getAdminInfluencers);

// ── POST /api/admin/influencers ──────────────────────────────────────────────
router.post('/', authorizeAdmin, influencerController.createInfluencer);

// ── PUT /api/admin/influencers/reorder ───────────────────────────────────────
router.put('/reorder', authorizeAdmin, influencerController.reorderInfluencers);

// ── PUT /api/admin/influencers/:id ───────────────────────────────────────────
router.put('/:id', authorizeAdmin, influencerController.updateInfluencer);

// ── DELETE /api/admin/influencers/:id ────────────────────────────────────────
router.delete('/:id', authorizeAdmin, influencerController.deleteInfluencer);

module.exports = router;
