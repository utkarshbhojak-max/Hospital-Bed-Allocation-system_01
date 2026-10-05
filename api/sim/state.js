export default async function handler(req, res) {
  const baseUrl = process.env.HC_03_URL;
  if (!baseUrl) return res.status(500).json({ status: "error", error: "HC_03_URL not set" });
  
  try {
    const response = await fetch(new URL("/cmd", baseUrl).toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cmd: "state" }),
    });
    res.status(200).json(await response.json());
  } catch (err) {
    res.status(500).json({ status: "error", error: err.message });
  }
}
