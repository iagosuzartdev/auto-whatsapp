require("dotenv").config();
const axios = require("axios");
const https = require("https");

const BASE_URL = process.env.Z_API_URL;
const CLIENT_TOKEN = process.env.Z_API_CLIENT_TOKEN;

/**
 * Normaliza telefone para E.164 brasileiro: remove não dígitos e garante prefixo 55.
 * @param {string} raw
 * @returns {string}
 */
function normalizePhone(raw) {
  const digits = raw.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}

/**
 * Aguarda um determinado tempo em ms.
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Simula digitação no WhatsApp por um tempo antes de enviar a mensagem.
 * @param {string} phone
 * @param {number} durationMs
 */
async function simulateTyping(phone, durationMs = 3000) {
  const formatted = normalizePhone(phone);

  try {
    await axios.post(
      `${BASE_URL}/send-state`,
      { phone: formatted, state: "typing" },
      { headers: { "Client-Token": CLIENT_TOKEN } }
    );
  } catch (err) {
    console.error(
      "Erro ao iniciar digitação:",
      err.response?.data || err.message
    );
  }
  await sleep(durationMs);
}

/**
 * Envia texto após simular digitação de ~3s e espera mais 2s após envio.
 * @param {string} phone
 * @param {string} message
 */
async function sendText(phone, message) {
  if (!phone || !message) {
    throw new Error("Telefone e mensagem são obrigatórios.");
  }
  // simula digitação
  await simulateTyping(phone, 3000);

  const formatted = normalizePhone(phone);
  try {
    const response = await axios.post(
      `${BASE_URL}/send-text`,
      { phone: formatted, message },
      { headers: { "Client-Token": CLIENT_TOKEN } }
    );
    // aguarda 1s antes de permitir próxima mensagem
    await sleep(1000);
    return response.data;
  } catch (err) {
    console.error(
      "Erro ao enviar mensagem:",
      err.response?.data || err.message
    );
  }
}

/**
 * Envia documento após simular digitação breve e espera 3s após envio.
 * @param {string} phone
 * @param {string} documentUrl
 * @param {string} fileName
 */
async function sendDocument(phone, documentUrl, fileName) {
  if (!phone || !documentUrl || !fileName) {
    throw new Error("Telefone, URL do documento e fileName são obrigatórios.");
  }
  
  await simulateTyping(phone, 2000);

  const formatted = normalizePhone(phone);
  try {
    const response = await axios.post(
      `${BASE_URL}/send-document/pdf`,
      { phone: formatted, document: documentUrl, fileName },
      { headers: { "Client-Token": CLIENT_TOKEN } }
    );
    
    await sleep(1000);
    return response.data;
  } catch (err) {
    console.error(
      "Erro ao enviar documento:",
      err.response?.data || err.message
    );
  }
}

module.exports = { normalizePhone, sendText, sendDocument };
