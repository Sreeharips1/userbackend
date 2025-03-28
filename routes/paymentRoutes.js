const express = require('express');
const { createOrder, checkPaymentStatus, getPaymentDetails, getPaymentDetailsbyID } = require('../controllers/paymentController');

const router = express.Router();

router.post('/create-order', createOrder);
router.post('/status', checkPaymentStatus);
router.get('/status', checkPaymentStatus);
router.get('/payment-details/:membershipID', getPaymentDetailsbyID); // New route for getting payment details
router.get('/payment-details',getPaymentDetails);

module.exports = router;
