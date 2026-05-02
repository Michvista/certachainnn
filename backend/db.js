const fs = require('fs');
const path = require('path');

// Vercel serverless environment has a read-only filesystem except for /tmp
const isVercel = process.env.VERCEL === '1';
const DB_FILE = isVercel 
  ? path.join('/tmp', 'dev.json') 
  : path.join(__dirname, 'dev.json');

// Initialize DB if not exists
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ certificates: [], custodialWallets: [] }, null, 2));
}

const getData = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
const saveData = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));


const db = {
  certificate: {
    create: async ({ data }) => {
      const dbData = getData();
      const newItem = { ...data, id: dbData.certificates.length + 1, issueDate: new Date().toISOString() };
      dbData.certificates.push(newItem);
      saveData(dbData);
      return newItem;
    },
    findUnique: async ({ where }) => {
      const dbData = getData();
      return dbData.certificates.find(c => c.certId === where.certId) || null;
    },
    findMany: async ({ where, orderBy, take, select, distinct }) => {
      const dbData = getData();
      let results = dbData.certificates;
      
      if (where?.studentWallet) {
        results = results.filter(c => c.studentWallet === where.studentWallet);
      }
      
      if (orderBy?.issueDate === 'desc') {
        results.sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate));
      }
      
      if (distinct?.includes('studentWallet')) {
        const unique = new Map();
        results.forEach(r => unique.set(r.studentWallet, r));
        results = Array.from(unique.values());
      }
      
      if (select?.studentWallet) {
        results = results.map(r => ({ studentWallet: r.studentWallet }));
      }
      
      if (take) {
        results = results.slice(0, take);
      }
      
      return results;
    },
    update: async ({ where, data }) => {
      const dbData = getData();
      const index = dbData.certificates.findIndex(c => c.certId === where.certId);
      if (index !== -1) {
        dbData.certificates[index] = { ...dbData.certificates[index], ...data };
        saveData(dbData);
        return dbData.certificates[index];
      }
      throw new Error('Not found');
    },
    count: async () => {
      const dbData = getData();
      return dbData.certificates.length;
    }
  },
  custodialWallet: {
    upsert: async ({ where, update, create }) => {
      const dbData = getData();
      const index = dbData.custodialWallets.findIndex(c => c.email === where.email);
      if (index !== -1) {
        dbData.custodialWallets[index] = { ...dbData.custodialWallets[index], ...update };
      } else {
        dbData.custodialWallets.push({ ...create, id: dbData.custodialWallets.length + 1, createdAt: new Date().toISOString() });
      }
      saveData(dbData);
      return dbData.custodialWallets[index !== -1 ? index : dbData.custodialWallets.length - 1];
    },
    findUnique: async ({ where }) => {
      const dbData = getData();
      return dbData.custodialWallets.find(c => c.email === where.email || c.claimToken === where.claimToken) || null;
    }
  }
};

module.exports = db;
