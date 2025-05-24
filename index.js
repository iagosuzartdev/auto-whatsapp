require("./src/scheduler");
const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const { sendDocument, sendText, normalizePhone } = require("./whatsappService");
const prisma = new PrismaClient();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const LAUNCH_DATE = new Date(process.env.LAUNCH_DATE);

app.post("/webhook", (req, res) => {
  const token = req.headers["x-api-key"];
  if (token !== process.env.WEBHOOK_SECRET) {
    return res.status(403).json({ success: false, error: "Unauthorized" });
  }

  console.log("[WEBHOOK] Payload recebido:", req.body);

  res.status(200).json({
    success: true,
    message: "Webhook recebido com sucesso",
  });
});

app.post("/api/lead", async (req, res) => {
  console.log(">>> req.body:", req.body);
  const { name, email, phone: rawPhone } = req.body;

  if (typeof rawPhone !== "string") {
    return res.status(200).json({
      success: false,
      error: "'phone' é obrigatório e deve ser uma string.",
      received: req.body,
    });
  }

  const formatted = normalizePhone(rawPhone);

   try {
    const newLead = await prisma.lead.upsert({
      where: { phone: formatted },
      update: { name, email },
      create: { name, email, phone: formatted },
    });

    // Responde para o Elementor de forma clara
    res.status(200).json({
      success: true,
      lead: newLead,
      message: "Cadastro realizado com sucesso! Em breve você receberá nosso PDF pelo WhatsApp 😊"
    });

    // Processamento assíncrono
    (async () => {
      try {
        await sendText(
          formatted,
          `Olá ${newLead.name}! Obrigado pelo cadastro. Já já te envio o material 😉`
        );

        await sendDocument(
          formatted,
          "https://drive.google.com/uc?export=download&id=1vx7pkBN3ml-UkQNH_sZirP9lSXzGubjZ",
          "material"
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

  } catch (error) {
    console.error("[LEAD] Erro no upsert:", error);
    res.status(200).json({
      success: false,
      error: "Erro interno ao processar o cadastro.",
      details: error.message
    });
  }
});

app.listen(3000, () => console.log("Servidor rodando na porta 3000"));
