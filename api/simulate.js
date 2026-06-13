const PROCEDURE_PROMPTS = {
  "implante-capilar": "BEFORE→AFTER clinical simulation. The input photo is the BEFORE state showing hair loss or baldness. Render the AFTER state of the SAME person 18 months after successful FUE hair transplant surgery. VISIBLE CHANGES: a natural hairline is restored at an age-appropriate position (not too low), hair density covers the previously bald areas, new hair matches the existing hair color and texture, hairline has a natural micro-irregular edge — not a straight artificial line. PRESERVE EXACTLY: same face, skin tone, eye color, nose, lips, ears, chin, expression, background, lighting. Only the hair/scalp area is changed. Ultra-photorealistic portrait.",
  "implante-barba": "BEFORE→AFTER clinical simulation. The input photo is the BEFORE state showing sparse or absent facial hair. Render the AFTER state of the SAME person with a full, naturally grown beard after FUE beard transplant. VISIBLE CHANGES: the beard area now has natural-density coverage matching the existing facial hair color and texture, well-groomed and masculine. PRESERVE EXACTLY: same face, skin tone, eyes, nose, hair on head, ears, neck, expression, background, lighting. Only the beard coverage changed. Ultra-photorealistic portrait.",
  "implante-sobrancelha": "BEFORE→AFTER clinical simulation. The input photo is the BEFORE state showing sparse or missing eyebrows. Render the AFTER state of the SAME person with full, naturally shaped eyebrows after FUE eyebrow transplant. VISIBLE CHANGES: eyebrows are full, well-shaped, frame the eyes beautifully with individual visible hair strokes at natural angles — not penciled or tattooed looking. PRESERVE EXACTLY: same face, skin tone, eyes, nose, lips, hair, expression, background. Only eyebrow density changed. Ultra-photorealistic portrait.",
  "tratamento-calvicie": "BEFORE→AFTER clinical simulation. The input photo is the BEFORE state showing hair thinning. Render the AFTER state of the SAME person with noticeably denser, fuller hair after professional anti-hair-loss treatment protocol. VISIBLE CHANGES: hair is visibly thicker, denser, and more voluminous — thinning areas are now covered, scalp is less visible. PRESERVE EXACTLY: same face, hair color and general style, skin tone, eyes, expression, background. Only hair density changed. Ultra-photorealistic portrait."
};
const CLINIC = { slug: 'icb-transplante-capilar', name: "ICB Transplante Capilar", tone: "Confiança acessível, escala. Fala 'pra você que pensou em desistir'. Médico-friendly." };

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { userB64, userMime, procedure } = req.body || {};
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY_MISSING' });
  const basePrompt = PROCEDURE_PROMPTS[procedure];
  if (!basePrompt) return res.status(400).json({ error: 'Procedure not supported' });
  const fullPrompt = [basePrompt, `Preview for ${CLINIC.name}.`, 'CRITICAL: photorealistic clinical preview, preserve patient identity perfectly.'].join('\n');
  try {
    const form = new FormData();
    form.append('model', 'gpt-image-2');
    form.append('prompt', fullPrompt);
    form.append('quality', 'high');
    // retrato 1024x1536 — classe Full HD (~1.6MP), formato adequado a fotos frontais
    form.append('size', '1024x1536');
    form.append('image', new Blob([Buffer.from(userB64, 'base64')], { type: userMime || 'image/png' }), 'photo.png');
    const r = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    const j = await r.json();
    if (!r.ok) {
      const code = j?.error?.code || '';
      if (r.status === 429 || code === 'insufficient_quota' || code === 'rate_limit_exceeded') {
        return res.status(503).json({ error: 'QUOTA_EXCEEDED', userMessage: 'O simulador está temporariamente indisponível por limite de uso. Agende uma consulta para ver o resultado ao vivo com nossa equipe!' });
      }
      return res.status(500).json({ error: j?.error?.message || 'OpenAI error' });
    }
    const b64 = j?.data?.[0]?.b64_json;
    if (!b64) return res.status(500).json({ error: 'No image in response' });
    return res.status(200).json({ ok: true, clinic: CLINIC.name, procedure, image: { mimeType: 'image/png', data: b64 } });
  } catch (err) { return res.status(500).json({ error: err.message }); }
}
