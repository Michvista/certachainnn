require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const pinataSDK = require('@pinata/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Keypair, PublicKey } = require('@solana/web3.js');
const crypto = require('crypto');
const { z } = require('zod');
const nodemailer = require('nodemailer');
const multer = require('multer');
const stream = require('stream');

const app = express();
const PORT = process.env.PORT || 3000;
const CLIENT_APP_URL = process.env.CLIENT_APP_URL || 'http://localhost:5173';

app.use(cors());
app.use(express.json());

// Multer setup for file uploads
const upload = multer({ storage: multer.memoryStorage() });

const prisma = new PrismaClient();

if (!process.env.PINATA_API_KEY || process.env.PINATA_API_KEY === 'mock_pinata_key') {
  console.error("WARNING: Invalid PINATA_API_KEY provided.");
}
const pinata = new pinataSDK(process.env.PINATA_API_KEY, process.env.PINATA_SECRET_API_KEY);

if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'mock_gemini_key') {
  console.error("WARNING: Invalid GEMINI_API_KEY provided.");
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const PROGRAM_ID = new PublicKey(process.env.SOLANA_PROGRAM_ID);
const PROGRAM_DETAILS = {
  programId: PROGRAM_ID.toBase58(),
  owner: process.env.SOLANA_PROGRAM_OWNER,
  programDataAddress: process.env.SOLANA_PROGRAM_DATA_ADDRESS,
  authority: process.env.SOLANA_PROGRAM_AUTHORITY,
  lastDeployedSlot: process.env.SOLANA_PROGRAM_LAST_DEPLOYED_SLOT,
  dataLength: process.env.SOLANA_PROGRAM_DATA_LENGTH,
  balanceSol: process.env.SOLANA_PROGRAM_BALANCE_SOL,
  cluster: process.env.SOLANA_CLUSTER
};

const toGatewayUrl = (ipfsUrl) => {
  if (!ipfsUrl?.startsWith('ipfs://')) {
    return null;
  }

  return `https://gateway.pinata.cloud/ipfs/${ipfsUrl.replace('ipfs://', '')}`;
};

// --- Nodemailer Setup ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// --- Zod Validation Schemas ---
const issueSchema = z.object({
  institutionWallet: z.string().min(1, "Institution wallet is required"),
  studentDetails: z.object({
    name: z.string().optional().default('Certificate of Completion'),
    description: z.string().optional().default('Issued by Institution'),
    institution: z.string().min(1, "Institution is required"),
    course: z.string().min(1, "Course is required"),
    student_name: z.string().min(1, "Student name is required"),
    student_wallet: z.string().optional(),
    grade: z.string().min(1, "Grade is required")
  })
});

const skillReportSchema = z.object({
  credentials: z.array(z.any()).min(1, "Credentials array cannot be empty")
});

const claimSchema = z.object({
  email: z.string().email("Invalid email address"),
  certId: z.string().min(1, "Certificate ID is required")
});

// Validation Middleware
const validateRequest = (schema) => (req, res, next) => {
  try {
    // For multipart/form-data, we need to parse studentDetails string if it exists
    const dataToValidate = req.body.studentDetails && typeof req.body.studentDetails === 'string'
      ? { ...req.body, studentDetails: JSON.parse(req.body.studentDetails) }
      : req.body;

    schema.parse(dataToValidate);
    next();
  } catch (error) {
    return res.status(400).json({ success: false, error: error.errors });
  }
};

app.post('/api/certificates/issue', upload.single('file'), validateRequest(issueSchema), async (req, res) => {
  try {
    const { institutionWallet, studentDetails: studentDetailsStr } = req.body;
    const studentDetails = typeof studentDetailsStr === 'string' ? JSON.parse(studentDetailsStr) : studentDetailsStr;

    const certId = crypto.randomUUID();
    const issueDate = new Date().toISOString().split('T')[0];
    let fileUrl = null;

    // 1. Upload File to IPFS if present
    if (req.file) {
      const readableStreamForFile = new stream.Readable();
      readableStreamForFile.push(req.file.buffer);
      readableStreamForFile.push(null);

      const fileOptions = {
        pinataMetadata: { name: `CertFile-${certId}` }
      };

      const filePinRes = await pinata.pinFileToIPFS(readableStreamForFile, fileOptions);
      fileUrl = `ipfs://${filePinRes.IpfsHash}`;
    }

    // 2. Upload Metadata to IPFS
    const metadataPayload = {
      name: studentDetails.name || 'Certificate of Completion',
      description: studentDetails.description || `Issued by ${studentDetails.institution}`,
      institution: studentDetails.institution,
      course: studentDetails.course,
      student_name: studentDetails.student_name,
      student_wallet: studentDetails.student_wallet || null,
      grade: studentDetails.grade,
      issue_date: issueDate,
      certificate_id: certId,
      file_url: fileUrl,
      valid: true
    };

    const options = {
      pinataMetadata: { name: `CertMeta-${certId}` }
    };

    const pinataRes = await pinata.pinJSONToIPFS(metadataPayload, options);
    const ipfsUrl = `ipfs://${pinataRes.IpfsHash}`;

    // 3. Save to DB
    await prisma.certificate.create({
      data: {
        certId,
        institutionWallet,
        studentName: studentDetails.student_name,
        course: studentDetails.course,
        studentWallet: studentDetails.student_wallet || null,
        ipfsUrl,
        fileUrl
      }
    });

    res.status(201).json({
      success: true,
      message: "Certificate issued successfully",
      certId,
      ipfsUrl,
      fileUrl,
      ipfsGatewayUrl: toGatewayUrl(ipfsUrl),
      fileGatewayUrl: toGatewayUrl(fileUrl),
      program: PROGRAM_DETAILS
    });
  } catch (error) {
    console.error("Error issuing certificate:", error.message);
    res.status(500).json({ success: false, error: "Failed to issue certificate: " + error.message });
  }
});

app.get('/api/certificates/verify/:certId', async (req, res) => {
  try {
    const { certId } = req.params;

    const certificate = await prisma.certificate.findUnique({
      where: { certId }
    });

    if (!certificate) {
      return res.status(404).json({ success: false, error: "Certificate not found on chain/database" });
    }

    res.status(200).json({
      success: true,
      certId: certificate.certId,
      metadata: {
        studentName: certificate.studentName,
        course: certificate.course,
        studentWallet: certificate.studentWallet
      },
      institution: certificate.institutionWallet,
      isValid: true,
      issueDate: certificate.issueDate,
      ipfsUrl: certificate.ipfsUrl,
      ipfsGatewayUrl: toGatewayUrl(certificate.ipfsUrl),
      fileUrl: certificate.fileUrl,
      fileGatewayUrl: toGatewayUrl(certificate.fileUrl),
      program: PROGRAM_DETAILS
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/students/:walletAddress/credentials', async (req, res) => {
  try {
    const { walletAddress } = req.params;

    const credentials = await prisma.certificate.findMany({
      where: { studentWallet: walletAddress },
      orderBy: { issueDate: 'desc' }
    });

    res.status(200).json({
      success: true,
      walletAddress,
      credentials: credentials.map((certificate) => ({
        ...certificate,
        ipfsGatewayUrl: toGatewayUrl(certificate.ipfsUrl),
        fileGatewayUrl: toGatewayUrl(certificate.fileUrl),
        program: PROGRAM_DETAILS
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/ai/skill-report', validateRequest(skillReportSchema), async (req, res) => {
  try {
    const { credentials } = req.body;

    const systemInstruction = `You are a professional credential analyst. Given a list of verified blockchain credentials, generate a structured Skill Verification Report. You MUST return ONLY a JSON object matching this exact schema:
{
  "summary": "A 1-2 sentence overview of the candidate's verified skills",
  "skillsVerified": ["Skill 1", "Skill 2", "Skill 3"],
  "recommendations": ["Skill gap 1", "Skill gap 2"],
  "overallScore": 85
}`;
    const userPrompt = `Student credentials: ${JSON.stringify(credentials)}. Generate the report based on these credentials. Return ONLY JSON without markdown formatting.`;

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction
    });

    console.log("Generating AI skill report for credentials count:", credentials.length);
    const result = await model.generateContent(userPrompt);

    let aiResponseText = result.response.text();
    aiResponseText = aiResponseText.replace(/```json\n|\n```|```/g, '').trim();

    let skillReport;
    try {
      skillReport = JSON.parse(aiResponseText);
    } catch (e) {
      console.error("AI Response Parsing Error:", aiResponseText);
      return res.status(500).json({
        success: false,
        error: "Failed to parse AI response. Ensure valid JSON.",
        rawResponse: aiResponseText
      });
    }

    res.status(200).json({ success: true, skillReport });
  } catch (error) {
    console.error("Gemini AI Error:", error.message);
    if (error.message.includes("429") || error.message.includes("quota")) {
      return res.status(429).json({ success: false, error: "AI Service Quota Exceeded. Please try again later." });
    }
    res.status(500).json({ success: false, error: "AI Generation Failed: " + error.message });
  }
});

app.post('/api/users/claim', validateRequest(claimSchema), async (req, res) => {
  try {
    const { email, certId } = req.body;
    const certificate = await prisma.certificate.findUnique({
      where: { certId }
    });

    if (!certificate) {
      return res.status(404).json({ success: false, error: 'Certificate not found' });
    }

    const newWallet = Keypair.generate();
    const publicKey = newWallet.publicKey.toBase58();
    const privateKey = Buffer.from(newWallet.secretKey).toString('hex');
    const claimToken = crypto.randomBytes(32).toString('hex');
    const claimLink = `${CLIENT_APP_URL.replace(/\/$/, '')}/claim?token=${claimToken}`;

    await prisma.custodialWallet.upsert({
      where: { email },
      update: { publicKey, privateKey, claimToken },
      create: { email, publicKey, privateKey, claimToken }
    });

    await prisma.certificate.update({
      where: { certId },
      data: { studentWallet: publicKey }
    });

    try {
      await transporter.sendMail({
        from: '"CertaChain" <no-reply@certachain.app>',
        to: email,
        subject: "Claim Your On-Chain Certificate",
        text: `Congratulations! Your institution has issued you a certificate on Solana. Claim your wallet here: ${claimLink}`,
        html: `<p>Congratulations! Your institution has issued you a certificate on Solana.</p><a href="${claimLink}">Claim your wallet here</a>`
      });
      console.log(`Email sent successfully to ${email}`);
    } catch (emailErr) {
      console.error("Failed to send claim email. Have you set up your Nodemailer SMTP credentials?:", emailErr.message);
    }

    res.status(200).json({
      success: true,
      message: "Custodial wallet created, certificate assigned, and email queued.",
      custodialWalletAddress: publicKey,
      claimLink,
      certId
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const totalCertificates = await prisma.certificate.count();
    const distinctStudents = await prisma.certificate.findMany({
      select: { studentWallet: true },
      distinct: ['studentWallet']
    });

    res.status(200).json({
      success: true,
      totalCertificates,
      totalStudents: distinctStudents.length,
      avgVerificationTime: null
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/certificates', async (req, res) => {
  try {
    const take = Number.parseInt(req.query.limit, 10);
    const certificates = await prisma.certificate.findMany({
      orderBy: { issueDate: 'desc' },
      take: Number.isFinite(take) && take > 0 ? take : 10
    });
    res.status(200).json({
      success: true,
      certificates: certificates.map((certificate) => ({
        ...certificate,
        ipfsGatewayUrl: toGatewayUrl(certificate.ipfsUrl),
        fileGatewayUrl: toGatewayUrl(certificate.fileUrl),
        program: PROGRAM_DETAILS
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`CertaChain API running on port ${PORT}`);
});
