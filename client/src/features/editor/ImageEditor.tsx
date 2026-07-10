import React, { useRef, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  RotateCw,
  RefreshCw,
  Sparkles,
  Download,
  Undo2,
  Redo2,
  Trash2,
  Sliders,
  Type,
  Square,
  Circle,
  Paintbrush,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';

type SideTabType = 'adjust' | 'filters' | 'draw' | 'watermark' | 'ai' | 'export';
type DrawToolType = 'brush' | 'rect' | 'circle' | 'text' | 'eraser' | 'none';

export const ImageEditor: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<SideTabType>('adjust');
  const [drawTool, setDrawTool] = useState<DrawToolType>('none');
  const [zoom, setZoom] = useState(100);

  // Canvas Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);

  // History Stack
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Sliders
  const [brightness, setBrightness] = useState(100); 
  const [contrast, setContrast] = useState(100); 
  const [saturation, setSaturation] = useState(100); 
  const [hue, setHue] = useState(0); 
  const [exposure, setExposure] = useState(0); 
  const [blur, setBlur] = useState(0); 
  const [filter, setFilter] = useState('none');

  // Draw Configs
  const [brushColor, setBrushColor] = useState('#161616');
  const [brushSize, setBrushSize] = useState(5);
  const [drawTextVal, setDrawTextVal] = useState('Stamp text');

  // Watermark
  const [watermarkText, setWatermarkText] = useState('ConvertEase');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.4);
  const [watermarkRotation, setWatermarkRotation] = useState(30);
  const [watermarkScale, setWatermarkScale] = useState(1.5);

  // Export
  const [exportFormat, setExportFormat] = useState('png'); 
  const [exportQuality, setExportQuality] = useState(90);
  const [exportFilename, setExportFilename] = useState('handcrafted-edit');

  useEffect(() => {
    const pendingFile = (window as any).pendingUploadFile;
    if (pendingFile) {
      setFile(pendingFile);
      delete (window as any).pendingUploadFile;
      sessionStorage.removeItem('dropped_file_meta');
    }
  }, []);

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setHistory([]);
      setHistoryIndex(-1);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.bmp'] },
    multiple: false
  });

  useEffect(() => {
    if (!file) return;

    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      originalImageRef.current = img;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const dataUrl = canvas.toDataURL();
      setHistory([dataUrl]);
      setHistoryIndex(0);
      
      resetSliders();
    };
  }, [file]);

  const resetSliders = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setHue(0);
    setExposure(0);
    setBlur(0);
    setFilter('none');
  };

  const saveStateToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(dataUrl);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex <= 0) return;
    restoreHistoryState(historyIndex - 1);
  };

  const handleRedo = () => {
    if (historyIndex >= history.length - 1) return;
    restoreHistoryState(historyIndex + 1);
  };

  const restoreHistoryState = (index: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = history[index];
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      setHistoryIndex(index);
    };
  };

  const rotateImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.height;
    tempCanvas.height = canvas.width;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.translate(canvas.height / 2, canvas.width / 2);
    tempCtx.rotate((90 * Math.PI) / 180);
    tempCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);

    canvas.width = tempCanvas.width;
    canvas.height = tempCanvas.height;
    ctx.drawImage(tempCanvas, 0, 0);

    saveStateToHistory();
    toast.success('Rotated 90°');
  };

  const flipImage = (direction: 'h' | 'v') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (direction === 'h') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    } else {
      ctx.translate(0, canvas.height);
      ctx.scale(1, -1);
    }
    
    const img = new Image();
    img.src = history[historyIndex];
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      ctx.restore();
      saveStateToHistory();
      toast.success(direction === 'h' ? 'Flipped Horizontally' : 'Flipped Vertically');
    };
  };

  const commitCanvasFilters = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    let filterString = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) hue-rotate(${hue}deg) blur(${blur}px)`;
    if (filter === 'sepia') filterString += ' sepia(100%)';
    else if (filter === 'grayscale') filterString += ' grayscale(100%)';
    else if (filter === 'vintage') filterString += ' sepia(50%) contrast(125%) saturate(140%)';
    else if (filter === 'neon') filterString += ' saturate(200%) hue-rotate(60deg)';

    tempCtx.filter = filterString;
    
    const img = new Image();
    img.src = history[historyIndex];
    img.onload = () => {
      tempCtx.drawImage(img, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(tempCanvas, 0, 0);
      saveStateToHistory();
      resetSliders();
      toast.success('Filters committed to buffer.');
    };
  };

  let isDrawing = false;
  let startX = 0;
  let startY = 0;

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (drawTool === 'none') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    isDrawing = true;
    startX = x;
    startY = y;

    ctx.beginPath();
    ctx.moveTo(x, y);

    if (drawTool === 'brush' || drawTool === 'eraser') {
      ctx.strokeStyle = drawTool === 'eraser' ? '#FFFFFF' : brushColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || drawTool === 'none') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    if (drawTool === 'brush' || drawTool === 'eraser') {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || drawTool === 'none') return;
    isDrawing = false;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    if (drawTool === 'rect') {
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
      ctx.strokeRect(startX, startY, x - startX, y - startY);
    } else if (drawTool === 'circle') {
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
      const radius = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
      ctx.beginPath();
      ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (drawTool === 'text') {
      ctx.fillStyle = brushColor;
      ctx.font = `${brushSize * 3}px Inter, sans-serif`;
      ctx.fillText(drawTextVal, startX, startY);
    }

    saveStateToHistory();
  };

  const removeBackgroundChroma = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    const rTarget = data[0];
    const gTarget = data[1];
    const bTarget = data[2];
    const tolerance = 40;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const distance = Math.sqrt(
        Math.pow(r - rTarget, 2) +
        Math.pow(g - gTarget, 2) +
        Math.pow(b - bTarget, 2)
      );

      if (distance < tolerance) {
        data[i + 3] = 0; 
      }
    }

    ctx.putImageData(imgData, 0, 0);
    saveStateToHistory();
    toast.success('Background Chroma-Key Removed.');
  };

  const applyWatermark = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((watermarkRotation * Math.PI) / 180);
    
    ctx.font = `bold ${28 * watermarkScale}px Inter, sans-serif`;
    ctx.fillStyle = `rgba(22, 22, 22, ${watermarkOpacity})`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillText(watermarkText, 0, 0);
    ctx.restore();

    saveStateToHistory();
    toast.success('Watermark stamped.');
  };

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    toast.loading('Compiling export...', { id: 'export-toast' });
    const format = exportFormat.toLowerCase();
    const finalFilename = `${exportFilename}.${format === 'pdf' ? 'pdf' : format}`;

    if (format === 'pdf') {
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
      pdf.save(finalFilename);
      toast.success('Downloaded PDF export!', { id: 'export-toast' });
    } else {
      const mime = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';
      const link = document.createElement('a');
      link.download = finalFilename;
      link.href = canvas.toDataURL(mime, exportQuality / 100);
      link.click();
      toast.success('Export downloaded!', { id: 'export-toast' });
    }
  };

  return (
    <div className="space-y-6 pb-12 w-full max-w-full">
      {/* Title Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">ConvertEase Editor</h1>
        <p className="text-xs text-white/50 mt-1">HANDCRAFTED PROFESSIONAL WORKSPACE</p>
      </div>

      {!file ? (
        <div
          {...getRootProps()}
          className="border-2 border-dashed border-stone-accent p-24 rounded-2xl text-center cursor-pointer hover:border-orange-accent transition-colors bg-white/5"
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-orange-accent flex items-center justify-center text-white"><Upload size={24} /></div>
            <div>
              <h3 className="font-bold text-base text-white">Import Image to Start Drawing</h3>
              <p className="text-xs text-white/50 mt-1">Supports PNG, JPG, JPEG, WEBP and BMP formats</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 border border-white/10 rounded-2xl overflow-hidden bg-white/5 min-h-[600px]">
          
          {/* 1. LEFT SIDEBAR: Selection Toolboxes */}
          <div className="lg:col-span-1 border-r border-white/10 bg-midnight flex flex-row lg:flex-col items-center justify-start py-4 gap-4 px-2 overflow-x-auto lg:overflow-x-visible">
            {[
              { id: 'adjust', label: 'Adjust', icon: Sliders },
              { id: 'filters', label: 'Filters', icon: ImageIcon },
              { id: 'draw', label: 'Draw', icon: Paintbrush },
              { id: 'watermark', label: 'Watermark', icon: Type },
              { id: 'ai', label: 'AI Tools', icon: Sparkles },
              { id: 'export', label: 'Export', icon: Download }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as SideTabType);
                  if (tab.id !== 'draw') setDrawTool('none');
                }}
                className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center transition-all ${
                  activeTab === tab.id
                    ? 'bg-orange-accent text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
                title={tab.label}
              >
                <tab.icon size={18} />
                <span className="text-[8px] font-bold mt-1 uppercase tracking-wider hidden lg:block">{tab.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>

          {/* 2. MAIN CENTER: Canvas Preview Workspace */}
          <div className="lg:col-span-8 flex flex-col justify-between items-center bg-midnight/30 p-6 relative">
            
            {/* Top Actions Toolbar */}
            <div className="w-full flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  className="p-2 rounded-lg border border-white/10 hover:border-white/20 disabled:opacity-30"
                  title="Undo"
                >
                  <Undo2 size={15} />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  className="p-2 rounded-lg border border-white/10 hover:border-white/20 disabled:opacity-30"
                  title="Redo"
                >
                  <Redo2 size={15} />
                </button>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={rotateImage}
                  className="px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 text-xs font-semibold flex items-center gap-1.5"
                >
                  <RotateCw size={13} /> Rotate 90°
                </button>
                <button
                  onClick={() => flipImage('h')}
                  className="px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 text-xs font-semibold flex items-center gap-1.5"
                >
                  <RefreshCw size={13} /> Flip H
                </button>
              </div>
            </div>

            {/* Canvas Container */}
            <div className="flex-grow flex items-center justify-center overflow-auto max-w-full max-h-[460px] p-2 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] rounded-xl border border-white/10 w-full">
              <canvas
                ref={canvasRef}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                className="max-w-full max-h-[420px] shadow-lg rounded border border-white/10 transition-all duration-75 bg-transparent cursor-crosshair"
                style={{
                  transform: `scale(${zoom / 100})`,
                  filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) hue-rotate(${hue}deg) blur(${blur}px) ${
                    filter === 'sepia'
                      ? 'sepia(100%)'
                      : filter === 'grayscale'
                      ? 'grayscale(100%)'
                      : filter === 'vintage'
                      ? 'sepia(50%) contrast(125%) saturate(140%)'
                      : filter === 'neon'
                      ? 'saturate(200%) hue-rotate(60deg)'
                      : ''
                  }`
                }}
              />
            </div>

            {/* Bottom Status bar */}
            <div className="w-full flex items-center justify-between border-t border-white/10 pt-4 mt-4 text-xs text-white/50">
              <div className="flex items-center gap-2">
                <button onClick={() => setZoom(Math.max(25, zoom - 25))} className="p-1 rounded hover:bg-white/5"><ZoomOut size={14} /></button>
                <span>{zoom}%</span>
                <button onClick={() => setZoom(Math.min(200, zoom + 25))} className="p-1 rounded hover:bg-white/5"><ZoomIn size={14} /></button>
              </div>
              
              <button
                onClick={() => {
                  if (window.confirm('Reset all layers?')) {
                    restoreHistoryState(0);
                    resetSliders();
                  }
                }}
                className="text-[10px] hover:text-danger text-white/40 font-bold"
              >
                Reset Image
              </button>
            </div>

          </div>

          {/* 3. RIGHT SIDEBAR: Parameters Properties */}
          <div className="lg:col-span-3 border-l border-white/10 bg-midnight p-6 flex flex-col justify-between">
            <div className="space-y-6">
              <h3 className="font-bold text-xs uppercase tracking-wider text-white/50 border-b border-white/10 pb-3">Properties</h3>

              {/* Adjustments */}
              {activeTab === 'adjust' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-white/60 font-semibold"><span>Brightness</span><span>{brightness}%</span></div>
                    <input type="range" min="0" max="200" value={brightness} onChange={(e) => setBrightness(parseInt(e.target.value))} className="w-full accent-orange-accent h-1 bg-white/10 rounded cursor-pointer" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-white/60 font-semibold"><span>Contrast</span><span>{contrast}%</span></div>
                    <input type="range" min="0" max="200" value={contrast} onChange={(e) => setContrast(parseInt(e.target.value))} className="w-full accent-orange-accent h-1 bg-white/10 rounded cursor-pointer" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-white/60 font-semibold"><span>Saturation</span><span>{saturation}%</span></div>
                    <input type="range" min="0" max="200" value={saturation} onChange={(e) => setSaturation(parseInt(e.target.value))} className="w-full accent-orange-accent h-1 bg-white/10 rounded cursor-pointer" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-white/60 font-semibold"><span>Hue Angle</span><span>{hue}°</span></div>
                    <input type="range" min="0" max="360" value={hue} onChange={(e) => setHue(parseInt(e.target.value))} className="w-full accent-orange-accent h-1 bg-white/10 rounded cursor-pointer" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-white/60 font-semibold"><span>Gaussian Blur</span><span>{blur}px</span></div>
                    <input type="range" min="0" max="15" value={blur} onChange={(e) => setBlur(parseInt(e.target.value))} className="w-full accent-orange-accent h-1 bg-white/10 rounded cursor-pointer" />
                  </div>
                  <button onClick={commitCanvasFilters} className="w-full py-2.5 btn-primary text-xs font-bold">
                    Flatten Layers
                  </button>
                </div>
              )}

              {/* Filters */}
              {activeTab === 'filters' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'none', label: 'Original' },
                      { id: 'sepia', label: 'Sepia' },
                      { id: 'grayscale', label: 'B&W' },
                      { id: 'vintage', label: 'Vintage' },
                      { id: 'neon', label: 'Neon' }
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={`p-2.5 text-xs font-bold rounded-lg border text-center transition-all ${
                          filter === f.id
                            ? 'border-orange-accent bg-white/5 text-orange-accent'
                            : 'border-white/10 bg-white/[0.01]'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <button onClick={commitCanvasFilters} className="w-full py-2.5 btn-primary text-xs font-bold">
                    Commit Filter
                  </button>
                </div>
              )}

              {/* Draw */}
              {activeTab === 'draw' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'brush', label: 'Brush' },
                      { id: 'rect', label: 'Rectangle' },
                      { id: 'circle', label: 'Circle' },
                      { id: 'text', label: 'Text' },
                      { id: 'eraser', label: 'Eraser' }
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setDrawTool(t.id as DrawToolType)}
                        className={`p-2 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all ${
                          drawTool === t.id
                            ? 'border-orange-accent bg-white/5 text-orange-accent'
                            : 'border-white/10 bg-white/[0.01]'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {drawTool === 'text' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-white/50 uppercase">Text Value</label>
                      <input
                        type="text"
                        value={drawTextVal}
                        onChange={(e) => setDrawTextVal(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs focus:outline-none"
                      />
                    </div>
                  )}

                  {drawTool !== 'none' && (
                    <>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-white/50 uppercase text-[10px]">Color</span>
                        <input
                          type="color"
                          value={brushColor}
                          onChange={(e) => setBrushColor(e.target.value)}
                          className="w-6 h-6 rounded-md cursor-pointer border-0 p-0"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-white/60 font-semibold">
                          <span>Size</span>
                          <span>{brushSize}px</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="50"
                          value={brushSize}
                          onChange={(e) => setBrushSize(parseInt(e.target.value))}
                          className="w-full accent-orange-accent h-1 bg-white/10 rounded"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Watermark */}
              {activeTab === 'watermark' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/50 uppercase">Watermark Text</label>
                    <input
                      type="text"
                      value={watermarkText}
                      onChange={(e) => setWatermarkText(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-white/60 font-semibold"><span>Opacity</span><span>{Math.round(watermarkOpacity * 100)}%</span></div>
                    <input type="range" min="0.1" max="1" step="0.1" value={watermarkOpacity} onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))} className="w-full accent-orange-accent h-1 bg-white/10 rounded cursor-pointer" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-white/60 font-semibold"><span>Rotation</span><span>{watermarkRotation}°</span></div>
                    <input type="range" min="0" max="360" value={watermarkRotation} onChange={(e) => setWatermarkRotation(parseInt(e.target.value))} className="w-full accent-orange-accent h-1 bg-white/10 rounded cursor-pointer" />
                  </div>
                  <button onClick={applyWatermark} className="w-full py-2.5 btn-primary text-xs font-bold">
                    Stamp Watermark
                  </button>
                </div>
              )}

              {/* AI Tools */}
              {activeTab === 'ai' && (
                <div className="space-y-3">
                  <button
                    onClick={removeBackgroundChroma}
                    className="w-full py-2.5 rounded-lg border border-dashed border-orange-accent bg-orange-accent/5 text-orange-accent text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Sparkles size={14} /> Remove Background
                  </button>
                  <p className="text-[9px] text-white/40 leading-relaxed text-center">
                    Runs pixel-level chroma-key transparency algorithms. Works best on solid backdrops.
                  </p>
                </div>
              )}

              {/* Export settings */}
              {activeTab === 'export' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/50 uppercase">Filename</label>
                    <input
                      type="text"
                      value={exportFilename}
                      onChange={(e) => setExportFilename(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/50 uppercase">Export Format</label>
                    <select
                      value={exportFormat}
                      onChange={(e) => setExportFormat(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/80 focus:outline-none"
                    >
                      <option value="png">PNG Format</option>
                      <option value="jpeg">JPEG Format</option>
                      <option value="webp">WEBP Format</option>
                      <option value="pdf">PDF Document</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Export Trigger */}
            {activeTab === 'export' && (
              <button
                onClick={handleExport}
                className="w-full py-3 btn-primary text-xs font-bold"
              >
                Download Export
              </button>
            )}
          </div>

        </div>
      )}
    </div>
  );
};
