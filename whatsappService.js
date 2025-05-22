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
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Simula digitação no WhatsApp por um tempo antes de enviar a mensagem.
 * @param {string} phone
 * @param {number} durationMs
 */
async function simulateTyping(phone, durationMs = 4000) {
  const formatted = normalizePhone(phone);
  // enviando estado de digitação
  try {
    await axios.post(
      `${BASE_URL}/send-state`,
      { phone: formatted, state: "typing" },
      { headers: { "Client-Token": CLIENT_TOKEN } }
    );
  } catch (err) {
    console.error("Erro ao iniciar digitação:", err.response?.data || err.message);
  }
  // aguarda o tempo de digitação
  await sleep(durationMs);
}

/**
 * Envia texto após simular digitação de ~4s e espera mais 3s após envio.
 * @param {string} phone
 * @param {string} message
 */
async function sendText(phone, message) {
  if (!phone || !message) {
    throw new Error("Telefone e mensagem são obrigatórios.");
  }
  // simula digitação
  await simulateTyping(phone, 4000);

  const formatted = normalizePhone(phone);
  try {
    const response = await axios.post(
      `${BASE_URL}/send-text`,
      { phone: formatted, message },
      { headers: { "Client-Token": CLIENT_TOKEN } }
    );
    // aguarda 3s antes de permitir próxima mensagem
    await sleep(2000);
    return response.data;
  } catch (err) {
    console.error("Erro ao enviar mensagem:", err.response?.data || err.message);
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
  // simula digitação breve (pode ser menor que texto, ex: 2s)
  await simulateTyping(phone, 2000);

  const formatted = normalizePhone(phone);
  try {
    const response = await axios.post(
      `${BASE_URL}/send-document/pdf`,
      { phone: formatted, document: documentUrl, fileName },
      { headers: { "Client-Token": CLIENT_TOKEN } }
    );
    // aguarda 3s antes de próxima ação
    await sleep(3000);
    return response.data;
  } catch (err) {
    console.error("Erro ao enviar documento:", err.response?.data || err.message);
  }
}

module.exports = { normalizePhone, sendText, sendDocument };
