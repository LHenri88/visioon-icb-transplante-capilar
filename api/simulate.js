import { GoogleGenAI } from '@google/genai';
const PROCEDURE_PROMPTS = {
  "implante-capilar": "Realistic FUE hair transplant simulation. Restore hairline with natural irregular micro-irregular front edge (not a straight line), proper angle/direction matching existing hair, density of ~40-50 FU/cm². Cover receding areas and crown if visible. PRESERVE: face, skin, ears, eyebrows, lighting, hair color and texture.",
  "implante-sobrancelha": "Eyebrow transplant simulation. Reconstruct eyebrow with natural directional hair growth (medial-upward, lateral-downward), preserving the existing brow arch shape. PRESERVE: face, skin, expression.",
  "tratamento-capilar": "Scalp/hair treatment preview. Improve hair density, scalp coverage and shine without altering hairline shape. PRESERVE: face, skin, color."
};
const CLINIC = { slug: 'icb-transplante-capilar', name: "ICB Transplante Capilar", tone: "Confiança acessível, escala. Fala 'pra você que pensou em desistir'. Médico-friendly." };

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { userB64, userMime, procedure } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY_MISSING' });
  const basePrompt = PROCEDURE_PROMPTS[procedure];
  if (!basePrompt) return res.status(400).json({ error: 'Procedure not supported' });
  const fullPrompt = [basePrompt, `Preview for ${CLINIC.name}.`, 'CRITICAL: photorealistic clinical preview, preserve patient identity perfectly.'].join('\n');
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: { parts: [{ inlineData: { data: userB64, mimeType: userMime } }, { text: fullPrompt }] },
    });
    return res.status(200).json({ ok: true, clinic: CLINIC.name, procedure, response });
  } catch (err) { return res.status(500).json({ error: err.message }); }
}
