require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const pinataSDK = require('@pinata/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Keypair, PublicKey } = require('@solana/web3.js');
const crypto = require('crypto');
const { z } = require('zod');
const nodemailer = require('nodemailer');
const multer = require('multer');
const stream = require('stream');
const pdf = require('pdf-parse');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const CLIENT_APP_URL = process.env.CLIENT_APP_URL || 'http://localhost:5173';

app.use(cors());
app.use(express.json());

// Vercel routes all backend traffic to /_/backend, but our Express routes expect /api/...
// This middleware strips the Vercel mounting prefix so Express finds the correct routes.
app.use((req, res, next) => {
  if (req.url.startsWith('/_/backend')) {
    req.url = req.url.replace('/_/backend', '');
  }
  next();
});

// Multer setup for file uploads
const upload = multer({ storage: multer.memoryStorage() });

const prisma = db;

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

const getRequestOrigin = (req) => {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const forwardedHost = req.headers['x-forwarded-host'];
  const proto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  const host = Array.isArray(forwardedHost) ? forwardedHost[0] : (forwardedHost || req.headers.host);

  if (!host) {
    return null;
  }

  return `${proto || req.protocol || 'https'}://${host}`;
};

const getClientAppUrl = (req) => {
  if (process.env.CLIENT_APP_URL) {
    return process.env.CLIENT_APP_URL.replace(/\/$/, '');
  }

  const origin = getRequestOrigin(req);
  if (!origin) {
    return CLIENT_APP_URL.replace(/\/$/, '');
  }

  const host = origin.replace(/^https?:\/\//, '');
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host)) {
    return CLIENT_APP_URL.replace(/\/$/, '');
  }

  return origin.replace(/\/$/, '');
};

const toGatewayUrl = (ipfsUrl) => {
  if (!ipfsUrl?.startsWith('ipfs://')) {
    return null;
  }

  return `https://gateway.pinata.cloud/ipfs/${ipfsUrl.replace('ipfs://', '')}`;
};

const trimText = (value, maxLength = 1800) => {
  if (!value) {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
};

const detectBufferMimeType = (buffer, headerValue) => {
  const normalizedHeader = (Array.isArray(headerValue) ? headerValue[0] : headerValue || '').split(';')[0].trim().toLowerCase();
  if (normalizedHeader && normalizedHeader !== 'application/octet-stream') {
    return normalizedHeader;
  }

  if (!buffer || buffer.length < 12) {
    return 'application/octet-stream';
  }

  if (buffer.slice(0, 5).toString() === '%PDF-') {
    return 'application/pdf';
  }

  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png';
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  if (buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WEBP') {
    return 'image/webp';
  }

  return 'application/octet-stream';
};

const fetchCertificateMetadata = async (certificate) => {
  const gatewayUrl = toGatewayUrl(certificate.ipfsUrl);
  if (!gatewayUrl) {
    return null;
  }

  try {
    const response = await axios.get(gatewayUrl, { timeout: 12000 });
    if (response?.data && typeof response.data === 'object') {
      return response.data;
    }
    return null;
  } catch (error) {
    console.error(`Failed to hydrate metadata for ${certificate.certId}:`, error.message);
    return null;
  }
};

const hydrateCertificate = async (certificate) => {
  const metadata = await fetchCertificateMetadata(certificate);
  const enrichedFileUrl = certificate.fileUrl || metadata?.file_url || null;

  return {
    ...certificate,
    studentName: certificate.studentName || metadata?.student_name || null,
    course: certificate.course || metadata?.course || null,
    institutionName: metadata?.institution || null,
    description: metadata?.description || null,
    grade: metadata?.grade || null,
    issueDate: certificate.issueDate || metadata?.issue_date || null,
    fileUrl: enrichedFileUrl,
    fileGatewayUrl: toGatewayUrl(enrichedFileUrl),
    ipfsGatewayUrl: toGatewayUrl(certificate.ipfsUrl),
    metadata,
    program: PROGRAM_DETAILS
  };
};

const hydrateCertificates = async (certificates = []) => (
  Promise.all(certificates.map((certificate) => hydrateCertificate(certificate)))
);

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
    student_wallet: z.string().nullable().optional(),
    student_email: z.string().email("Invalid student email address").optional(),
    grade: z.string().min(1, "Grade is required")
  })
});

const skillReportSchema = z.object({
  credentials: z.array(z.any()).min(1, "Credentials array cannot be empty"),
  jobDescription: z.string().max(4000).optional()
});

const claimSchema = z.object({
  email: z.string().email("Invalid email address"),
  certId: z.string().min(1, "Certificate ID is required")
});

const emailCredentialLookupSchema = z.object({
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
      file_type: req.file?.mimetype || null,
      valid: true
    };
    metadataPayload.issuer_wallet = institutionWallet;
    metadataPayload.network = process.env.SOLANA_CLUSTER || 'devnet';
    metadataPayload.program_id = PROGRAM_DETAILS.programId;
    metadataPayload.external_url = `${getClientAppUrl(req)}/verifier?certificate=${certId}`;

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

    // 4. If issued via email, auto-create custodial wallet and send claim email (all in one request)
    let claimLink = null;
    const studentEmail = studentDetails.student_email;
    if (studentEmail) {
      try {
        const newWallet = Keypair.generate();
        const publicKey = newWallet.publicKey.toBase58();
        const privateKey = Buffer.from(newWallet.secretKey).toString('hex');
        const claimToken = crypto.randomBytes(32).toString('hex');
        claimLink = `${getClientAppUrl(req)}/claim?token=${claimToken}`;

        await prisma.custodialWallet.upsert({
          where: { email: studentEmail },
          update: { publicKey, privateKey, claimToken },
          create: { email: studentEmail, publicKey, privateKey, claimToken }
        });

        await prisma.certificate.update({
          where: { certId },
          data: { studentWallet: publicKey }
        });

        await transporter.sendMail({
          from: `"CertaChain" <${process.env.EMAIL_USER}>`,
          to: studentEmail,
          subject: `Your Certificate of ${studentDetails.course} is Ready to Claim`,
          text: `Congratulations ${studentDetails.student_name}! Your institution has issued you a certificate on Solana. Claim your wallet here: ${claimLink}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#f8f9ff;border-radius:12px;">
              <h2 style="color:#4f46e5;">🎓 Your Certificate is Ready!</h2>
              <p>Hi <strong>${studentDetails.student_name}</strong>,</p>
              <p>Your institution has issued you a <strong>${studentDetails.course}</strong> certificate, minted on the Solana blockchain.</p>
              <a href="${claimLink}" style="display:inline-block;background:#4f46e5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">
                Claim Your Certificate Wallet
              </a>
              <p style="color:#888;font-size:12px;">Certificate ID: ${certId}</p>
            </div>
          `
        });
        console.log(`Claim email sent successfully to ${studentEmail}`);
      } catch (emailErr) {
        console.error("Auto-claim email failed (non-fatal):", emailErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: "Certificate issued successfully",
      certId,
      ipfsUrl,
      fileUrl,
      claimLink,
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

    const hydratedCertificate = await hydrateCertificate(certificate);

    res.status(200).json({
      success: true,
      certId: hydratedCertificate.certId,
      metadata: {
        studentName: hydratedCertificate.studentName,
        course: hydratedCertificate.course,
        studentWallet: hydratedCertificate.studentWallet,
        grade: hydratedCertificate.grade
      },
      institution: hydratedCertificate.institutionWallet,
      institutionName: hydratedCertificate.institutionName,
      isValid: true,
      issueDate: hydratedCertificate.issueDate,
      ipfsUrl: hydratedCertificate.ipfsUrl,
      ipfsGatewayUrl: hydratedCertificate.ipfsGatewayUrl,
      fileUrl: hydratedCertificate.fileUrl,
      fileGatewayUrl: hydratedCertificate.fileGatewayUrl,
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

    const hydratedCredentials = await hydrateCertificates(credentials);

    res.status(200).json({
      success: true,
      walletAddress,
      credentials: hydratedCredentials
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/students/email-credentials', validateRequest(emailCredentialLookupSchema), async (req, res) => {
  try {
    const { email, certId } = req.body;

    const wallet = await prisma.custodialWallet.findUnique({
      where: { email }
    });

    if (!wallet) {
      return res.status(404).json({ success: false, error: 'No email-issued wallet found for this email address' });
    }

    const certificate = await prisma.certificate.findUnique({
      where: { certId }
    });

    if (!certificate) {
      return res.status(404).json({ success: false, error: 'Certificate not found' });
    }

    if (certificate.studentWallet !== wallet.publicKey) {
      return res.status(403).json({ success: false, error: 'This certificate does not belong to the supplied email credentials' });
    }

    const credentials = await prisma.certificate.findMany({
      where: { studentWallet: wallet.publicKey },
      orderBy: { issueDate: 'desc' }
    });
    const hydratedCredentials = await hydrateCertificates(credentials);

    res.status(200).json({
      success: true,
      email,
      walletAddress: wallet.publicKey,
      credentials: hydratedCredentials
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/ai/skill-report', validateRequest(skillReportSchema), async (req, res) => {
  try {
    const { credentials, jobDescription } = req.body;

    const systemInstruction = `You are CertaChain's credential intelligence engine. Analyze only evidence that appears in verified credential records and uploaded certificate files.
    You must explicitly state whether uploaded files were analyzed, and if so whether they were PDFs, images, or both.
    Keep the tone professional and hiring-oriented.
    Return ONLY valid JSON in this exact shape:
{
  "summary": "1-2 sentence overview that mentions file analysis coverage.",
  "skillsVerified": ["Skill 1", "Skill 2"],
  "strongestAreas": ["Area 1", "Area 2"],
  "skillGaps": ["Gap 1", "Gap 2"],
  "overallScore": 0,
  "recommendation": "Plain-English hiring recommendation."
}`;

    const multimodalParts = [];
    const fileEvidence = [];
    let pdfCount = 0;
    let imageCount = 0;

    for (const cert of credentials) {
      const gatewayUrl = cert.fileGatewayUrl || toGatewayUrl(cert.fileUrl);
      if (!gatewayUrl) {
        continue;
      }

      try {
        const response = await axios.get(gatewayUrl, { responseType: 'arraybuffer', timeout: 15000 });
        const buffer = Buffer.from(response.data);
        const mimeType = detectBufferMimeType(buffer, response.headers['content-type']);
        const courseLabel = cert.course || cert.title || cert.certId;

        if (mimeType === 'application/pdf') {
          const data = await pdf(buffer);
          pdfCount += 1;
          fileEvidence.push(`[${courseLabel}] PDF text extracted: ${trimText(data.text, 1800)}`);
          continue;
        }

        if (mimeType.startsWith('image/')) {
          imageCount += 1;
          fileEvidence.push(`[${courseLabel}] Certificate image attached for visual analysis.`);
          multimodalParts.push({
            inlineData: {
              mimeType,
              data: buffer.toString('base64')
            }
          });
          continue;
        }

        fileEvidence.push(`[${courseLabel}] Uploaded file detected but MIME type ${mimeType} is unsupported for deep analysis.`);
      } catch (e) {
        console.error("Failed to fetch/parse file:", e.message);
        fileEvidence.push(`[${cert.course || cert.certId}] Uploaded file could not be fetched for analysis.`);
      }
    }

    const userPrompt = `
Student credentials:
${JSON.stringify(credentials, null, 2)}

Job description:
${jobDescription ? jobDescription : 'No job description provided.'}

File analysis summary:
${fileEvidence.length ? fileEvidence.join('\n') : 'No uploaded files were available for analysis.'}

Coverage counts:
- PDFs analyzed: ${pdfCount}
- Images analyzed: ${imageCount}
`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction
    });

    console.log("Generating AI skill report for credentials count:", credentials.length);
    const result = await model.generateContent([
      { text: userPrompt },
      ...multimodalParts
    ]);

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
    const claimLink = `${getClientAppUrl(req)}/claim?token=${claimToken}`;

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

app.get('/api/users/claim/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const wallet = await prisma.custodialWallet.findUnique({
      where: { claimToken: token }
    });

    if (!wallet) {
      return res.status(404).json({ success: false, error: 'Invalid or expired claim token' });
    }

    res.status(200).json({
      success: true,
      custodialWalletAddress: wallet.publicKey,
      privateKey: wallet.privateKey,
      email: wallet.email,
      claimedViaToken: true
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const institutionWallet = typeof req.query.institutionWallet === 'string' && req.query.institutionWallet.trim()
      ? req.query.institutionWallet.trim()
      : null;
    const where = institutionWallet ? { institutionWallet } : undefined;

    const totalCertificates = await prisma.certificate.count({ where });
    const distinctStudents = await prisma.certificate.findMany({
      where,
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
    const includeMetadata = req.query.includeMetadata === 'true';
    const institutionWallet = typeof req.query.institutionWallet === 'string' && req.query.institutionWallet.trim()
      ? req.query.institutionWallet.trim()
      : null;
    const certificates = await prisma.certificate.findMany({
      where: institutionWallet ? { institutionWallet } : undefined,
      orderBy: { issueDate: 'desc' },
      take: Number.isFinite(take) && take > 0 ? take : 10
    });
    res.status(200).json({
      success: true,
      certificates: includeMetadata
        ? await hydrateCertificates(certificates)
        : certificates.map((certificate) => ({
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


// Only start the HTTP server when running locally (not on Vercel serverless)
if (process.env.VERCEL !== '1') {
  console.log("Starting server...");
  const server = app.listen(PORT, () => {
    console.log(`CertaChain API running on port ${PORT}`);
    console.log("Server is now listening for requests.");
  });

  server.on('error', (err) => {
    console.error("SERVER ERROR:", err);
  });
}

// Export for Vercel serverless
module.exports = app;
