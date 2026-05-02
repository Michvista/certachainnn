const testAI = async () => {
  const credentials = [
    { course: "Advanced Solana Smart Contracts" },
    { course: "Web3 Security Fundamentals" }
  ];

  try {
    const res = await fetch('http://localhost:4002/api/ai/skill-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credentials })
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
};
testAI();
