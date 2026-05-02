const getDefaultApiBaseUrl = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:5050/api';
  }

  const { origin, hostname } = window.location;
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';

  if (isLocalHost) {
    return 'http://localhost:5050/api';
  }

  return `${origin}/_/backend/api`;
};

const getApiBaseUrl = () => {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();

  if (!configured) {
    return getDefaultApiBaseUrl();
  }

  if (typeof window !== 'undefined') {
    const isWindowLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isConfiguredLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(configured);

    if (!isWindowLocal && isConfiguredLocal) {
      return getDefaultApiBaseUrl();
    }
  }

  return configured.replace(/\/$/, '');
};

const API_BASE_URL = getApiBaseUrl();

const parseError = async (response, fallbackMessage) => {
  const errorData = await response.json().catch(() => null);

  if (Array.isArray(errorData?.error)) {
    return errorData.error.map((issue) => issue.message).join(', ');
  }

  return errorData?.error || fallbackMessage;
};

export const copyToClipboard = async (text) => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for non-secure contexts
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return true;
      } catch (err) {
        document.body.removeChild(textArea);
        return false;
      }
    }
  } catch (err) {
    return false;
  }
};

export const issueCertificate = async (payload) => {
  // If payload is FormData, we don't set Content-Type header (browser does it with boundary)
  const isFormData = payload instanceof FormData;
  
  const response = await fetch(`${API_BASE_URL}/certificates/issue`, {
    method: 'POST',
    headers: isFormData ? {} : { 'Content-Type': 'application/json' },
    body: isFormData ? payload : JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to issue certificate'));
  }
  return response.json();
};

export const verifyCertificate = async (certId) => {
  const response = await fetch(`${API_BASE_URL}/certificates/verify/${certId}`);
  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to verify certificate'));
  }
  return response.json();
};

export const getStudentCredentials = async (walletAddress) => {
  const response = await fetch(`${API_BASE_URL}/students/${walletAddress}/credentials`);
  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to fetch credentials'));
  }
  return response.json();
};

export const generateSkillReport = async (credentials) => {
  const response = await fetch(`${API_BASE_URL}/ai/skill-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credentials })
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to generate skill report'));
  }
  return response.json();
};

export const claimWallet = async (email, certId) => {
  const response = await fetch(`${API_BASE_URL}/users/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, certId })
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to claim wallet'));
  }
  return response.json();
};

export const getWalletByToken = async (token) => {
  const response = await fetch(`${API_BASE_URL}/users/claim/${token}`);
  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to retrieve wallet'));
  }
  return response.json();
};

export const getStats = async () => {
  const response = await fetch(`${API_BASE_URL}/stats`);
  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to fetch stats'));
  }
  return response.json();
};

export const getAllCertificates = async (limit) => {
  const query = typeof limit === 'number' ? `?limit=${limit}` : '';
  const response = await fetch(`${API_BASE_URL}/certificates${query}`);
  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to fetch certificates'));
  }
  return response.json();
};
