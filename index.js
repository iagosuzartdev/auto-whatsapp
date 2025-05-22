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

app.post("/webhook", (req, res) => {
  const token = req.headers["x-api-key"];
  if (token !== process.env.WEBHOOK_SECRET) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  console.log("[WEBHOOK] Payload recebido:", req.body);

  res.status(200).json({ ok: true });
});

app.post("/api/lead", async (req, res) => {
  console.log(">>> req.body:", req.body);
  const { name, email, phone: rawPhone } = req.body;

  if (typeof rawPhone !== "string") {
    return res.status(400).json({
      error: "'phone' é obrigatório e deve ser uma string.",
      received: req.body,
    });
  }

  const formatted = normalizePhone(rawPhone);

  const newLead = await prisma.lead.upsert({
    where: { phone: formatted },
    update: { name, email },
    create: { name, email, phone: formatted },
  });

  res.status(201).json({ success: true, lead: newLead });

  (async () => {
    try {
      await sendText(
        formatted,
        `Olá ${newLead.name}! Obrigado pelo cadastro. Já já te envio o material no WhatsApp 😉`
      );

      await sendDocument(
        formatted,
        "https://drive.google.com/uc?export=download&id=1vx7pkBN3ml-UkQNH_sZirP9lSXzGubjZ",
        "material.pdf"
      );

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
      console.log("[LEAD] Processo assíncrono concluído para:", formatted);
    } catch (err) {
      console.error("[LEAD] Erro no processo assíncrono:", err);
    }
  })();
});

app.listen(3000, () => console.log("Servidor rodando na porta 3000"));
