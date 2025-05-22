const { generate } = require('@prisma/client/generator-build')  // v6+
;(async () => {
  try {
    await generate({
      schemaPath: './prisma/schema.prisma',
      clientPath: './node_modules/@prisma/client'
    })
    console.log('✅ Prisma Client gerado via JS')
  } catch (e) {
    console.error('❌ Erro ao gerar Prisma Client via JS', e)
    process.exit(1)
  }
})()
