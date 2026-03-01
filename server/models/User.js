const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 16,
    },
    uniqueTag: {
        type: String,
        unique: true,
        // e.g. "Sachin#4821"
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        default: '',
    },

    // Stats
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    mmr: { type: Number, default: 1000 },
    gamesPlayed: { type: Number, default: 0 },
    captures: { type: Number, default: 0 },
    highestStreak: { type: Number, default: 0 },

    // Friends
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    sentRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Online status
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },

    // Match history (last 20)
    matchHistory: [{
        opponent: String,
        result: { type: String, enum: ['win', 'loss'] },
        mmrChange: Number,
        date: { type: Date, default: Date.now },
    }],
}, { timestamps: true });

// Auto-generate uniqueTag + hash password before save
userSchema.pre('save', async function () {
    if (this.isNew) {
        const tag = String(Math.floor(1000 + Math.random() * 9000));
        this.uniqueTag = `${this.username}#${tag}`;
    }
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
});

userSchema.methods.comparePassword = function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Never return password in JSON
userSchema.methods.toSafeObject = function () {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};

module.exports = mongoose.model('User', userSchema);
