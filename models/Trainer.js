const mongoose = require('mongoose');

const trainerSchema = new mongoose.Schema({
    trainerID: { type: String, unique: true, required: true }, // Unique Trainer ID
    trainer_name: { type: String, required: true, unique: true },
    specialization: { type: String },
    phone_number: { type: String },
    availability: { type: Boolean, default: true },
    assigned_Members: { type: Number, default: 0 }
});

const Trainer = mongoose.model('Trainer', trainerSchema);
module.exports = Trainer;