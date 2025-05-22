require("./src/scheduler");
const express = require("express");
const bodyParser = require("body-parser");
const { PrismaClient } = require("@prisma/client");
const { sendDocument, sendText, normalizePhone } = require("./whatsappService");
const prisma = new PrismaClient();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const LAUNCH_DATE = new Date(process.env.LAUNCH_DATE);

app.post("/api/lead", async (req, res) => {
  console.log(">>> req.body:", req.body);
  const { name, email, phone: rawPhone } = req.body;

  if (typeof rawPhone !== "string") {
    return res.status(400).json({
      error: "'phone' é obrigatório e deve ser uma string.",
      received: req.body,
    });
  }

  // Normaliza o telefone usando a função compartilhada
  const formatted = normalizePhone(rawPhone);

  // Persiste o lead no banco de dados
  const newLead = await prisma.lead.upsert({
    where: { phone: formatted },
    update: { name, email },
    create: { name, email, phone: formatted },
  });

  // Dispara mensagem de agradecimento
  await sendText(
    formatted,
    `Olá ${newLead.name}! Obrigado pelo cadastro. Já já te envio o material no WhatsApp 😉`
  );

  // Envia o material em PDF
  await sendDocument(
    formatted,
    "https://drive.google.com/uc?export=download&id=1vx7pkBN3ml-UkQNH_sZirP9lSXzGubjZ",
    "material.pdf"
  );

  // Agenda os lembretes: 7, 3 e 1 dia antes do lançamento
  const daysArray = [7, 3, 1];
  for (const days of daysArray) {
    const sendAt = new Date(LAUNCH_DATE);
    sendAt.setDate(sendAt.getDate() - days);
    await prisma.schedule.create({
      data: {
        text: `Faltam ${days} dias para o lançamento!`,
        sendAt,
        leadId: newLead.id,
      },
    });
  }

  return res.status(201).json({ success: true, lead: newLead });
});

app.listen(3000, () => console.log("Servidor rodando na porta 3000"));
