const { PrismaClient } = require('@prisma/client');

const globalForPrisma = globalThis;
const trimQuotes = (value) => value?.trim().replace(/^['"]|['"]$/g, '');

const buildDatabaseUrlFromParts = () => {
  const host = trimQuotes(process.env.POSTGRES_HOST || process.env.DB_HOST);
  const port = trimQuotes(process.env.POSTGRES_PORT || process.env.DB_PORT);
  const user = trimQuotes(process.env.POSTGRES_USER || process.env.DB_USER);
  const password = trimQuotes(process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD);
  const database = trimQuotes(process.env.POSTGRES_DATABASE || process.env.POSTGRES_DB || process.env.DB_NAME);

  if (!host || !user || !database) {
    return null;
  }

  const auth = password ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}` : encodeURIComponent(user);
  const portSegment = port ? `:${port}` : '';
  return `postgresql://${auth}@${host}${portSegment}/${database}`;
};

const normalizeDatabaseUrl = () => {
  const raw = trimQuotes(process.env.DATABASE_URL);
  const fallback = buildDatabaseUrlFromParts();
  const candidate = raw || fallback;

  if (!candidate) {
    return null;
  }

  if (/^postgres(ql)?:\/\//i.test(candidate)) {
    return candidate;
  }

  if (candidate.includes('@') && candidate.includes('/')) {
    return `postgresql://${candidate.replace(/^\/+/, '')}`;
  }

  return `postgresql://${candidate}`;
};

const databaseUrl = normalizeDatabaseUrl();

if (databaseUrl) {
  process.env.DATABASE_URL = databaseUrl;
}

const prisma =
  globalForPrisma.__certachainPrisma ||
  new PrismaClient(databaseUrl ? { datasourceUrl: databaseUrl } : undefined);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__certachainPrisma = prisma;
}

const warnFallback = (modelName) => {
  console.warn(`[db] Prisma delegate "${modelName}" was unavailable. Falling back to raw SQL helpers.`);
};

const quoteIdentifier = (column) => `"${column}"`;

const buildWhereClause = (where = {}, startIndex = 1) => {
  const entries = Object.entries(where).filter(([, value]) => value !== undefined);

  if (entries.length === 0) {
    return { clause: '', params: [], nextIndex: startIndex };
  }

  const params = [];
  const conditions = entries.map(([column, value], index) => {
    params.push(value);
    return `${quoteIdentifier(column)} = $${startIndex + index}`;
  });

  return {
    clause: ` WHERE ${conditions.join(' AND ')}`,
    params,
    nextIndex: startIndex + entries.length
  };
};

const buildUpdateClause = (data = {}, startIndex = 1) => {
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);

  if (entries.length === 0) {
    return { clause: '', params: [], nextIndex: startIndex };
  }

  const params = [];
  const setters = entries.map(([column, value], index) => {
    params.push(value);
    return `${quoteIdentifier(column)} = $${startIndex + index}`;
  });

  return {
    clause: ` SET ${setters.join(', ')}`,
    params,
    nextIndex: startIndex + entries.length
  };
};

const buildOrderByClause = (orderBy) => {
  if (!orderBy || typeof orderBy !== 'object') {
    return '';
  }

  const [column, direction] = Object.entries(orderBy)[0] || [];
  if (!column) {
    return '';
  }

  const normalizedDirection = String(direction || 'asc').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
  return ` ORDER BY ${quoteIdentifier(column)} ${normalizedDirection}`;
};

const firstRow = (rows) => (Array.isArray(rows) ? rows[0] ?? null : null);

const certificateFallback = {
  async create({ data }) {
    const query = `
      INSERT INTO "Certificate" ("certId", "institutionWallet", "studentWallet", "studentName", "course", "ipfsUrl", "fileUrl")
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const rows = await prisma.$queryRawUnsafe(
      query,
      data.certId,
      data.institutionWallet,
      data.studentWallet ?? null,
      data.studentName ?? null,
      data.course ?? null,
      data.ipfsUrl ?? null,
      data.fileUrl ?? null
    );

    return firstRow(rows);
  },

  async findUnique({ where }) {
    const { clause, params } = buildWhereClause(where);
    const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "Certificate"${clause} LIMIT 1`, ...params);
    return firstRow(rows);
  },

  async findMany(args = {}) {
    const { where, orderBy, take, select, distinct } = args;
    const distinctColumn = Array.isArray(distinct) && distinct.length === 1 ? distinct[0] : null;
    const selectedColumns = select ? Object.keys(select).filter((key) => select[key]) : null;
    const projection = selectedColumns?.length
      ? selectedColumns.map(quoteIdentifier).join(', ')
      : '*';
    const distinctSql = distinctColumn ? `DISTINCT ${quoteIdentifier(distinctColumn)} ` : '';
    const { clause, params } = buildWhereClause(where);
    const orderByClause = buildOrderByClause(orderBy);
    const limitClause = Number.isFinite(take) && take > 0 ? ` LIMIT ${take}` : '';
    const rows = await prisma.$queryRawUnsafe(
      `SELECT ${distinctSql}${projection} FROM "Certificate"${clause}${orderByClause}${limitClause}`,
      ...params
    );

    return rows;
  },

  async update({ where, data }) {
    const updateParts = buildUpdateClause(data, 1);
    const whereParts = buildWhereClause(where, updateParts.nextIndex);

    const rows = await prisma.$queryRawUnsafe(
      `UPDATE "Certificate"${updateParts.clause}${whereParts.clause} RETURNING *`,
      ...updateParts.params,
      ...whereParts.params
    );

    return firstRow(rows);
  },

  async count() {
    const rows = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "Certificate"');
    return firstRow(rows)?.count ?? 0;
  }
};

const custodialWalletFallback = {
  async findUnique({ where }) {
    const { clause, params } = buildWhereClause(where);
    const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "CustodialWallet"${clause} LIMIT 1`, ...params);
    return firstRow(rows);
  },

  async upsert({ where, update, create }) {
    const existing = await this.findUnique({ where });

    if (existing) {
      const updateParts = buildUpdateClause(update, 1);
      const whereParts = buildWhereClause(where, updateParts.nextIndex);
      const rows = await prisma.$queryRawUnsafe(
        `UPDATE "CustodialWallet"${updateParts.clause}${whereParts.clause} RETURNING *`,
        ...updateParts.params,
        ...whereParts.params
      );
      return firstRow(rows);
    }

    const query = `
      INSERT INTO "CustodialWallet" ("email", "publicKey", "privateKey", "claimToken")
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const rows = await prisma.$queryRawUnsafe(
      query,
      create.email,
      create.publicKey,
      create.privateKey,
      create.claimToken
    );

    return firstRow(rows);
  }
};

const db = new Proxy(prisma, {
  get(target, prop, receiver) {
    if (prop === 'certificate') {
      const delegate = Reflect.get(target, prop, receiver);
      if (delegate) {
        return delegate;
      }

      warnFallback('certificate');
      return certificateFallback;
    }

    if (prop === 'custodialWallet') {
      const delegate = Reflect.get(target, prop, receiver);
      if (delegate) {
        return delegate;
      }

      warnFallback('custodialWallet');
      return custodialWalletFallback;
    }

    return Reflect.get(target, prop, receiver);
  }
});

module.exports = db;
