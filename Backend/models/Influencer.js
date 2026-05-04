const mongoose = require('mongoose');

const influencerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    instagramLink: {
        type: String,
        required: [true, 'Instagram link is required'],
        trim: true,
    },
    image: {
        url: { type: String },
        publicId: { type: String },
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    order: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
});

const Influencer = mongoose.model('Influencer', influencerSchema);

module.exports = Influencer;
