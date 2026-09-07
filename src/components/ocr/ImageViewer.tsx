'use client';

import React, { useState, useRef } from 'react';
import { ZoomIn, ZoomOut, RotateCw, RotateCcw, Maximize2, RefreshCw, FileText } from 'lucide-react';

interface ImageViewerProps {
  imageUrl?: string | null;
  fileName?: string;
  onReplaceImage?: () => void;
}

export default function ImageViewer({ imageUrl, fileName, onReplaceImage }: ImageViewerProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3.5));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotateRight = () => setRotation((prev) => (prev + 90) % 360);
  const handleRotateLeft = () => setRotation((prev) => (prev - 90 + 360) % 360);
  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  if (!imageUrl) {
    return (
      <div className="h-full min-h-[420px] rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
          <FileText className="w-7 h-7" />
        </div>
        <p className="text-sm font-semibold text-slate-700">ไม่มีไฟล์ภาพต้นฉบับ</p>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          (รายการนี้สร้างจากข้อมูลตัวอย่าง หรือไฟล์ถูกเปิดขึ้นจากประวัติเก่า)
        </p>
        {onReplaceImage && (
          <button
            type="button"
            onClick={onReplaceImage}
            className="mt-4 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100 transition-colors shadow-sm"
          >
            อัปโหลดภาพบิลใหม่
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-md">
      {/* Viewer Controls Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 text-white text-xs">
        <span className="truncate max-w-[160px] text-slate-300 font-medium text-[11px]">
          {fileName || 'ใบเสร็จต้นฉบับ'}
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
            title="ซูมเข้า (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
            title="ซูมออก (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-mono text-slate-400 px-1">
            {Math.round(scale * 100)}%
          </span>

          <div className="w-[1px] h-3.5 bg-slate-700 mx-1"></div>

          <button
            type="button"
            onClick={handleRotateLeft}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
            title="หมุนซ้าย 90°"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleRotateRight}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
            title="หมุนขวา 90°"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors ml-1"
            title="รีเซ็ตมุมมอง"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Image Viewport */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`relative flex-1 min-h-[460px] max-h-[640px] overflow-hidden flex items-center justify-center p-4 bg-slate-900 select-none ${
          scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
        }`}
      >
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.2s ease-out',
          }}
          className="max-h-full max-w-full flex items-center justify-center"
        >
          <img
            src={imageUrl}
            alt="Original Receipt"
            className="max-h-[500px] w-auto object-contain rounded-lg shadow-2xl pointer-events-none"
          />
        </div>

        {onReplaceImage && (
          <button
            type="button"
            onClick={onReplaceImage}
            className="absolute bottom-3 left-3 bg-slate-950/80 hover:bg-slate-900 text-white text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            เปลี่ยนรูปภาพ
          </button>
        )}
      </div>
    </div>
  );
}
