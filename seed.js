const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");
  
  const testWallet = "test_student_wallet";
  
  // Clear existing
  await prisma.certificate.deleteMany({
    where: { studentWallet: testWallet }
  });

  const certs = [
    {
      certId: crypto.randomUUID(),
      institutionWallet: "inst_123",
      studentName: "Alex Chen",
      studentWallet: testWallet,
      course: "Advanced Solana Smart Contracts",
      ipfsUrl: "ipfs://QmDummyHash1"
    },
    {
      certId: crypto.randomUUID(),
      institutionWallet: "inst_456",
      studentName: "Alex Chen",
      studentWallet: testWallet,
      course: "Web3 Security Fundamentals",
      ipfsUrl: "ipfs://QmDummyHash2"
    },
    {
      certId: crypto.randomUUID(),
      institutionWallet: "inst_789",
      studentName: "Alex Chen",
      studentWallet: testWallet,
      course: "Rust Programming Mastery",
      ipfsUrl: "ipfs://QmDummyHash3"
    }
  ];

  for (const cert of certs) {
    await prisma.certificate.create({
      data: cert
    });
  }

  console.log(`Seeded 3 certificates for wallet: ${testWallet}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
