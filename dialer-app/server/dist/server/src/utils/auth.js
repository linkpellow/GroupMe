"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAuthToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwt_config_1 = require("../config/jwt.config");
const generateAuthToken = (userId) => {
    return jsonwebtoken_1.default.sign({ _id: userId }, jwt_config_1.JWT_SECRET, {
        expiresIn: jwt_config_1.JWT_EXPIRATION,
    });
};
exports.generateAuthToken = generateAuthToken;
