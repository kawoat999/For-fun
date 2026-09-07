import { NextRequest, NextResponse } from 'next/server';
import { parseReceiptWithGemini } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let base64Data = '';
    let mimeType = 'image/jpeg';
    let userApiKey = request.headers.get('x-gemini-api-key') || '';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      if (!body.imageBase64) {
        return NextResponse.json(
          { success: false, error: 'กรุณาส่งรูปภาพในรูปแบบ Base64' },
          { status: 400 }
        );
      }
      base64Data = body.imageBase64.replace(/^data:[^;]+;base64,/, '');
      mimeType = body.mimeType || 'image/jpeg';
      if (body.customApiKey) {
        userApiKey = body.customApiKey;
      }
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const customApiKey = formData.get('customApiKey') as string | null;

      if (!file) {
        return NextResponse.json(
          { success: false, error: 'ไม่พบไฟล์ที่อัปโหลด' },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      base64Data = Buffer.from(arrayBuffer).toString('base64');
      mimeType = file.type || 'image/jpeg';
      if (customApiKey) {
        userApiKey = customApiKey;
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Unsupported Content-Type' },
        { status: 415 }
      );
    }

    // Temporary override process.env if user provided key via UI
    if (userApiKey && userApiKey.trim().length > 10) {
      process.env.GEMINI_API_KEY = userApiKey.trim();
    }

    const receiptData = await parseReceiptWithGemini(base64Data, mimeType);

    return NextResponse.json({
      success: true,
      data: receiptData,
    });
  } catch (error: any) {
    console.error('OCR Processing error:', error);
    const errorMessage = error?.message || 'เกิดข้อผิดพลาดในการประมวลผล OCR';
    const isMissingKey =
      errorMessage.includes('MISSING_API_KEY') ||
      errorMessage.includes('API_KEY_INVALID') ||
      errorMessage.includes('API key');

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        missingApiKey: isMissingKey,
      },
      { status: isMissingKey ? 401 : 500 }
    );
  }
}
