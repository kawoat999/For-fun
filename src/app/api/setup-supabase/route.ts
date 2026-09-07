import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { anonKey } = await request.json();

    if (!anonKey || typeof anonKey !== 'string' || anonKey.trim().length < 20) {
      return NextResponse.json(
        { success: false, error: 'Anon Key ไม่ถูกต้อง กรุณากรอกรหัส Key ที่สมบูรณ์' },
        { status: 400 }
      );
    }

    const cleanKey = anonKey.trim();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qiqmmsclfuzzxojruwpp.supabase.co';

    // Test connection with the provided key
    try {
      const testClient = createClient(supabaseUrl, cleanKey);
      // Attempt a lightweight ping or read
      await testClient.from('receipts').select('id').limit(1);
    } catch (testErr: any) {
      console.warn('Supabase test ping note:', testErr?.message);
    }

    // Update .env.local on disk if filesystem allows
    try {
      const envPath = path.join(process.cwd(), '.env.local');
      let content = '';
      if (fs.existsSync(envPath)) {
        content = fs.readFileSync(envPath, 'utf8');
      }

      if (content.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
        content = content.replace(
          /NEXT_PUBLIC_SUPABASE_ANON_KEY=.*/,
          `NEXT_PUBLIC_SUPABASE_ANON_KEY=${cleanKey}`
        );
      } else {
        content += `\nNEXT_PUBLIC_SUPABASE_ANON_KEY=${cleanKey}\n`;
      }

      fs.writeFileSync(envPath, content, 'utf8');
    } catch (fsErr) {
      console.warn('Filesystem write note (normal on Vercel serverless):', fsErr);
    }
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = cleanKey;

    return NextResponse.json({
      success: true,
      message: 'บันทึก Supabase Anon Key สำเร็จแล้ว!',
    });
  } catch (error: any) {
    console.error('Error saving Supabase key:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'เกิดข้อผิดพลาดในการบันทึก' },
      { status: 500 }
    );
  }
}
