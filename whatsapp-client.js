require("dotenv").config();
const axios = require("axios");
const BASE_URL = process.env.Z_API_URL;

if (!BASE_URL) throw new Error("🛑 Z_API_URL_TXT não está definida no .env");

async function sendDocument(phone, fileUrl) {
  await axios.post(`${BASE_URL}/send-document`, {
    phone,
    documentType: "FileURL",
    fileUrl,
    extension: "pdf",
  });
}

async function sendText(phone, text) {
  await axios.post(`${BASE_URL}/send-text`, {
    phone,
    message: text,
  });
}

module.exports = { sendDocument, sendText };
