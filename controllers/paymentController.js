const axios = require('axios');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const Member = require('../models/Member');

const MERCHANT_KEY = "96434309-7796-489d-8924-ab56988a6076";
const MERCHANT_ID = "PGTESTPAYUAT86";

const MERCHANT_BASE_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay";
const MERCHANT_STATUS_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/status";

const redirectUrl = "https://userbackend-1.onrender.com/api/payment/status";
const successUrl = "https://userfrontend-psi.vercel.app/dashboard";
const failureUrl = "https://userfrontend-psi.vercel.app/dashboard";

const createOrder = async (req, res) => {
    try {
        const { membershipID, amount, membership_plan } = req.body;
        if (!membershipID || !amount || !membership_plan) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const member = await Member.findOne({ membershipID });
        if (!member) {
            return res.status(404).json({ error: "Member not found" });
        }

        const orderId = uuidv4();

        const paymentPayload = {
            merchantId: MERCHANT_ID,
            merchantUserId: membershipID,
            mobileNumber: member.mobileNumber,
            amount: amount * 100,
            merchantTransactionId: orderId,
            redirectUrl: `${redirectUrl}?id=${orderId}&membershipID=${membershipID}&membership_plan=${membership_plan}`,
            redirectMode: 'POST',
            paymentInstrument: { type: 'PAY_PAGE' }
        };

        const payload = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');
        const keyIndex = 1;
        const stringToHash = payload + '/pg/v1/pay' + MERCHANT_KEY;
        const sha256 = crypto.createHash('sha256').update(stringToHash).digest('hex');
        const checksum = sha256 + '###' + keyIndex;

        const options = {
            method: 'POST',
            url: MERCHANT_BASE_URL,
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
                'X-VERIFY': checksum
            },
            data: { request: payload }
        };

        const response = await axios.request(options);

        if (response.data.success === true) {
            return res.status(200).json({ msg: "OK", url: response.data.data.instrumentResponse.redirectInfo.url });
        } else {
            return res.status(400).json({ error: "Failed to create order", details: response.data });
        }
    } catch (error) {
        console.error("Error in createOrder:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

const checkPaymentStatus = async (req, res) => {
    try {
        const { id: merchantTransactionId, membershipID, membership_plan } = req.query;

        if (!merchantTransactionId || !membershipID || !membership_plan) {
            return res.status(400).json({ error: "Transaction ID, Membership ID, and Membership Plan are required" });
        }

        const keyIndex = 1;
        const stringToHash = `/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}` + MERCHANT_KEY;
        const sha256 = crypto.createHash('sha256').update(stringToHash).digest('hex');
        const checksum = sha256 + '###' + keyIndex;

        const options = {
            method: 'GET',
            url: `${MERCHANT_STATUS_URL}/${MERCHANT_ID}/${merchantTransactionId}`,
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
                'X-VERIFY': checksum,
                'X-MERCHANT-ID': MERCHANT_ID
            },
        };

        const response = await axios.request(options);

        const member = await Member.findOne({ membershipID });

        if (!member) {
            return res.status(404).json({ error: "Member not found" });
        }

        if (!response.data.success) {
            // ❌ Payment failed, update status explicitly
            await Member.findOneAndUpdate(
                { membershipID },
                { 
                    payment_status: "failed", 
                    membership_status: "Inactive" 
                }
            );
            return res.redirect(failureUrl);
        }

        // ✅ Payment is successful, update user details
        let renewalDate = new Date();

        if (membership_plan === "monthly") {
            renewalDate.setMonth(renewalDate.getMonth() + 1);
        } else if (membership_plan === "quarterly") {
            renewalDate.setMonth(renewalDate.getMonth() + 3);
        } else if (membership_plan === "annually") {
            renewalDate.setFullYear(renewalDate.getFullYear() + 1);
        } else {
            return res.status(400).json({ error: "Invalid membership plan" });
        }

        console.log(`Renewal Date for ${membershipID}:`, renewalDate);

        const updateResult = await Member.findOneAndUpdate(
            { membershipID },
            {
                payment_date: new Date(),
                renewal_date: renewalDate,
                amount_Paid: response.data.data.amount / 100,
                payment_status: "completed",
                membership_status: "Active",
                membership_plan: membership_plan,
                transactionID: merchantTransactionId
            },
            { new: true }
        );

        if (!updateResult) {
            return res.status(500).json({ error: "Failed to update member details" });
        }

        return res.redirect(successUrl);
    } catch (error) {
        console.error("Error in checkPaymentStatus:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

const getPaymentDetailsbyID = async (req, res) => {
    try {
        const { membershipID } = req.params;

        if (!membershipID) {
            return res.status(400).json({ error: "Membership ID is required" });
        }

        const member = await Member.findOne({ membershipID });

        if (!member) {
            return res.status(404).json({ error: "Member not found" });
        }

        return res.status(200).json({
            full_name: member.full_name,
            email: member.email,
            amount_Paid: member.amount_Paid || 0,
            payment_date: member.payment_date || null,
            renewal_date: member.renewal_date || null,
            membership_plan: member.membership_plan || "N/A",
            payment_status: member.payment_status || "Pending",
            transactionID: member.transactionID || "Not Available"
        });
    } catch (error) {
        console.error("Error in getPaymentDetailsbyID:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

const getPaymentDetails = async (req, res) => {
    try {
        const members = await Member.find({}, {
            full_name: 1,
            email: 1,
            amount_Paid: 1,
            payment_date: 1,
            renewal_date: 1,
            membership_plan: 1,
            payment_status: 1,
            transactionID: 1,
            _id: 0
        });

        if (!members.length) {
            return res.status(404).json({ error: "No members found" });
        }

        return res.status(200).json(members);
    } catch (error) {
        console.error("Error in getPaymentDetails:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

module.exports = { createOrder, checkPaymentStatus, getPaymentDetailsbyID, getPaymentDetails };
