const { PrismaClient } = require("@prisma/client");
const { CronJob } = require("cron");
const { sendText } = require("../whatsappService");
const prisma = new PrismaClient();

console.log("[CRON] Agendador iniciado!");

const job = new CronJob(
  "*/15 * * * *",
  async () => {
    console.log("[CRON] Verificando agendamentos...");

    const now = new Date();
    try {
      const jobs = await prisma.schedule.findMany({
        where: { sendAt: { lte: now }, sent: false },
        include: { lead: true },
      });

      if (jobs.length === 0) {
        console.log("[CRON] Nenhum agendamento pendente no momento.");
        return;
      }

      for (const schedule of jobs) {
        const phone = schedule.lead.phone;
        const text = schedule.text;
        console.log(
          `[CRON] Disparando agendamento #${schedule.id} para ${phone}: "${text}"`
        );
        try {
          await sendText(phone, text);
          await prisma.schedule.update({
            where: { id: schedule.id },
            data: { sent: true },
          });
          console.log(
            `[CRON] Agendamento #${schedule.id} marcado como enviado.`
          );
        } catch (err) {
          console.error(
            `[CRON] Erro ao processar agendamento #${schedule.id}:`,
            err
          );
        }
      }
    } catch (err) {
      console.error("[CRON] Erro ao buscar agendamentos:", err);
    }
  },
  null,
  true,
  process.env.CRON_TIMEZONE || undefined
);

job.start();
