import { GoogleGenAI } from '@google/genai';
import { ReceiptData } from './types';

export async function parseReceiptWithGemini(
  base64Data: string,
  mimeType: string = 'image/jpeg'
): Promise<ReceiptData> {
  const apiKey =
    process.env.GEMINI_API_KEY?.trim() ||
    'AQ.Ab8RN6LfQGTgAkkZm3uBpUAEl-fA9LNmxTpk_y4NpEPgwpeRhw';

  if (!apiKey) {
    throw new Error(
      'MISSING_API_KEY: ไม่พบ GEMINI_API_KEY ในระบบ กรุณาระบุ API Key ในไฟล์ .env.local หรือส่งผ่าน Header'
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
You are an expert OCR & Document Parser specialized in Thai and International receipts, invoices, tax invoices, and payment slips.
Analyze the provided receipt/invoice document image and extract all structured details accurately.

Rules:
1. Extract the merchant/vendor name, tax identification number (เลขประจำตัวผู้เสียภาษี 13 หลัก if available), address, phone, receipt/invoice number, and date.
2. Extract all line items: item name/description (Thai or English as shown), quantity (default 1 if not specified), unit (e.g., ชิ้น, อัน, เครื่อง, กล่อง, ชม. or empty string), unit price, and total line price.
3. Extract subtotal, discount, tax rate (e.g., 7 for 7% VAT), tax amount, grand total amount, payment method, and any notes or terms.
4. If an item total is present but unit price is missing, calculate unit price = totalPrice / quantity.
5. All numeric values must be numbers (not strings). If not present, default to 0.
6. Return ONLY a valid JSON object matching the schema below, without any markdown formatting or commentary.

JSON Schema format:
{
  "merchantName": "string",
  "taxId": "string",
  "address": "string",
  "phone": "string",
  "receiptNumber": "string",
  "date": "YYYY-MM-DD",
  "items": [
    {
      "name": "string",
      "quantity": 1,
      "unit": "string",
      "unitPrice": 100.0,
      "totalPrice": 100.0
    }
  ],
  "subtotal": 100.0,
  "taxRate": 7.0,
  "taxAmount": 7.0,
  "discount": 0.0,
  "totalAmount": 107.0,
  "paymentMethod": "string",
  "notes": "string"
}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const rawText = response.text || '';
    // Clean potential markdown blocks if present
    const cleanedJson = rawText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const parsed = JSON.parse(cleanedJson);

    // Normalize and add IDs to items
    const items = Array.isArray(parsed.items)
      ? parsed.items.map((it: any, index: number) => ({
          id: `item-${Date.now()}-${index}`,
          name: String(it.name || `รายการที่ ${index + 1}`),
          quantity: Number(it.quantity) || 1,
          unit: String(it.unit || 'รายการ'),
          unitPrice: Number(it.unitPrice) || 0,
          totalPrice: Number(it.totalPrice) || (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0),
        }))
      : [];

    const subtotal = Number(parsed.subtotal) || items.reduce((sum: number, it: any) => sum + it.totalPrice, 0);
    const taxRate = Number(parsed.taxRate) || 7;
    const taxAmount = Number(parsed.taxAmount) || (subtotal * taxRate) / 100;
    const discount = Number(parsed.discount) || 0;
    const totalAmount = Number(parsed.totalAmount) || subtotal - discount + taxAmount;

    return {
      merchantName: String(parsed.merchantName || 'ไม่ระบุชื่อร้านค้า'),
      taxId: parsed.taxId ? String(parsed.taxId) : undefined,
      address: parsed.address ? String(parsed.address) : undefined,
      phone: parsed.phone ? String(parsed.phone) : undefined,
      receiptNumber: parsed.receiptNumber ? String(parsed.receiptNumber) : undefined,
      date: parsed.date ? String(parsed.date) : new Date().toISOString().split('T')[0],
      items,
      subtotal,
      taxRate,
      taxAmount,
      discount,
      totalAmount,
      paymentMethod: parsed.paymentMethod ? String(parsed.paymentMethod) : undefined,
      notes: parsed.notes ? String(parsed.notes) : undefined,
    };
  } catch (error: any) {
    console.error('Error generating content with Gemini 2.5 Flash:', error);
    throw error;
  }
}
