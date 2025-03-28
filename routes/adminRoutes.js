const express = require('express');
const router = express.Router();
const { 
    adminLogin, 
    adminRegister, 
    getMembers, 
    getMemberById, 
    editMember, 
    addMember, 
    deleteMember,  
    forgotPassword, 
    resetPassword 
} = require('../controllers/adminController');

// Admin authentication routes
router.post('/login', adminLogin);
router.post('/register', adminRegister); 

// Member management routes
router.get('/members', getMembers);
router.get('/members/:membershipID', getMemberById); 
router.put('/members/:membershipID', editMember);   
router.post('/members', addMember);
router.delete('/members/:membershipID', deleteMember); 

// Password reset routes
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;
