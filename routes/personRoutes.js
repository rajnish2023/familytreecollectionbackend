const express = require('express');
const router = express.Router();
const personController = require('../controllers/personController');
const auth = require('../middleware/authMiddleware');
const { canEdit, requireViewer } = require('../middleware/rbacMiddleware');
const { updateEmail } = require('../controllers/personController');

// Create a new person (admin and sub-admin only)
router.post('/', auth, canEdit, personController.createPerson);

// Get all persons (all authenticated users)
router.get('/', auth, requireViewer, personController.getAllPersons);

// Get eligible spouses for new form (admin and sub-admin only)
router.get('/eligible-spouses', auth, canEdit, personController.getEligibleSpousesNewMember);

// Get all eligible spouse for edit form (admin and sub-admin only)
router.get('/edit-spouses', auth, canEdit, personController.getEligibleSpousesEdit);

// Get previous occupations from family (all authenticated users)
router.get('/occupations', auth, requireViewer, personController.getOccupations);

// Get eligible parents (admin and sub-admin only)
router.get('/eligible-parents', auth, canEdit, personController.getEligibleParents);

// Generate family tree (all authenticated users)
router.get('/family-tree', auth, requireViewer, personController.getFamilyTree);

// Get single person (all authenticated users)
router.get('/:id', auth, requireViewer, personController.getPerson);

// Update a person by ID (admin and sub-admin only)
router.put('/:id', auth, canEdit, personController.updatePerson);

// Delete a person by ID (admin and sub-admin only)
router.delete('/:id', auth, canEdit, personController.deletePerson);

module.exports = router; 