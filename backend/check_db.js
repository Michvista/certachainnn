const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const wallet = 'FYPb8QapUBSvVHrzqNej29EQsAX5no2uBKnvXnfH8yj';
  const certificates = await prisma.certificate.findMany({
    where: { studentWallet: wallet }
  });
  console.log('Certificates for', wallet, ':', JSON.stringify(certificates, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
