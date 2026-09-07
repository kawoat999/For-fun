'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Sparkles, AlertCircle, Key, RefreshCw, Eye, CheckCircle2 } from 'lucide-react';
import { ReceiptData } from '@/lib/types';
import { SAMPLE_RECEIPTS } from '@/lib/sample-data';

interface FileUploaderProps {
  onScanSuccess: (data: ReceiptData, previewImage: string | null) => void;
}

export default function FileUploader({ onScanSuccess }: FileUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [customApiKey, setCustomApiKey] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setError('กรุณาอัปโหลดไฟล์รูปภาพ (PNG, JPG, WEBP) หรือเอกสาร PDF เท่านั้น');
      return;
    }
    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleProcessOCR = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (customApiKey.trim()) {
        formData.append('customApiKey', customApiKey.trim());
      }

      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        if (result.missingApiKey) {
          setShowApiKeyInput(true);
        }
        throw new Error(result.error || 'การประมวลผล OCR ล้มเหลว');
      }

      onScanSuccess(result.data, previewUrl);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadSample = (sample: typeof SAMPLE_RECEIPTS[0]) => {
    setError(null);
    onScanSuccess(sample.data, null);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
            Gemini 2.5 Flash Multimodal OCR
          </div>
          <h2 className="text-2xl font-bold text-slate-800">
            อัปโหลดใบเสร็จ / บิลเพื่อแปลงเป็นใบเสนอราคา
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            รองรับรูปภาพถ่ายใบเสร็จ สลิป และเอกสารกำกับภาษี สแกนและจัดกลุ่มรายการให้อัตโนมัติ
          </p>
        </div>

        {/* API Key Toggle Button */}
        <button
          type="button"
          onClick={() => setShowApiKeyInput(!showApiKeyInput)}
          className="inline-flex items-center gap-2 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors"
        >
          <Key className="w-3.5 h-3.5 text-slate-500" />
          {customApiKey ? 'กำหนด Key แล้ว' : 'ตั้งค่า Gemini API Key'}
        </button>
      </div>

      {/* API Key Inline Form */}
      {showApiKeyInput && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-3">
            <Key className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-amber-900">
                ระบุ Gemini API Key (สำหรับเบราว์เซอร์นี้)
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                หากไม่ได้ระบุในไฟล์ <code className="bg-amber-100 px-1 py-0.5 rounded">.env.local</code> สามารถระบุ Key ที่นี่เพื่อทดสอบใช้งานได้ทันที (รับ Key ฟรีที่{' '}
                <a
                  href="https://aistudio.google.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-semibold hover:text-amber-950"
                >
                  Google AI Studio
                </a>
                )
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  type="password"
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  placeholder="วาง AIzaSy... ที่นี่"
                  className="flex-1 text-xs px-3 py-2 bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKeyInput(false)}
                  className="px-3 py-2 text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
                >
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drag & Drop Box */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          dragActive
            ? 'border-blue-500 bg-blue-50/50 scale-[1.01]'
            : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={handleChange}
          className="hidden"
        />

        {previewUrl ? (
          <div className="flex flex-col items-center">
            <div className="relative w-40 h-48 rounded-lg overflow-hidden border border-slate-300 shadow-sm mb-4 bg-white">
              {/* Preview image */}
              <img
                src={previewUrl}
                alt="Receipt Preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium gap-1">
                <RefreshCw className="w-4 h-4" /> เปลี่ยนรูปภาพ
              </div>
            </div>
            <p className="text-sm font-semibold text-slate-700 truncate max-w-xs">
              {selectedFile?.name}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              ขนาด {(Number(selectedFile?.size || 0) / 1024).toFixed(1)} KB
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
              <UploadCloud className="w-8 h-8" />
            </div>
            <p className="text-base font-semibold text-slate-700">
              ลากไฟล์มาวางที่นี่ หรือ <span className="text-blue-600 underline">คลิกเพื่อเลือกไฟล์</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              รองรับไฟล์รูปภาพ PNG, JPG, JPEG, WEBP หรือ PDF (สูงสุด 10MB)
            </p>
          </div>
        )}
      </div>

      {/* Error notification */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs text-red-700 flex-1">
            <p className="font-semibold text-red-800 mb-0.5">เกิดข้อผิดพลาด</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Scan Button */}
      {selectedFile && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            disabled={isLoading}
            onClick={handleProcessOCR}
            className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 transition-all text-sm"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                กำลังให้ Gemini 2.5 Flash อ่านใบเสร็จ...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                เริ่มสแกนใบเสร็จ (AI OCR Extract)
              </>
            )}
          </button>
        </div>
      )}

      {/* Quick Test Samples */}
      <div className="mt-8 pt-6 border-t border-slate-100">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          หรือทดสอบทันทีด้วยข้อมูลตัวอย่าง (ไม่ต้องใช้ API Key):
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SAMPLE_RECEIPTS.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleLoadSample(sample)}
              className="text-left p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-all group flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-blue-100 text-slate-600 group-hover:text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-800 group-hover:text-blue-700 truncate">
                  {sample.title}
                </div>
                <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                  {sample.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
