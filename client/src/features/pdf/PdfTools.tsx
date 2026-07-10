import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { api } from '../../services/api';
import { io } from 'socket.io-client';
import {
  Upload,
  FileText,
  Loader2,
  Download,
  Merge,
  RotateCw,
  Trash2,
  Type,
  Lock,
  Unlock,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

type PdfToolType = 'merge' | 'split' | 'rotate' | 'rearrange' | 'watermark' | 'protect' | 'unlock' | 'wordToPdf' | 'pdfToWord';

export const PdfTools: React.FC = () => {
  const [activeTool, setActiveTool] = useState<PdfToolType>('merge');
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // Tool Specific States
  const [rearrangeOrder, setRearrangeOrder] = useState<string>('');
  const [watermarkText, setWatermarkText] = useState('ConvertEase');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.4);
  const [watermarkRotation, setWatermarkRotation] = useState(45);
  const [pdfPassword, setPdfPassword] = useState('');

  useEffect(() => {
    const pendingFile = (window as any).pendingUploadFile;
    if (pendingFile) {
      const ext = pendingFile.name.split('.').pop()?.toLowerCase();
      if (ext === 'docx' || ext === 'doc') {
        setActiveTool('wordToPdf');
      } else {
        setActiveTool('rotate');
      }
      setFiles([pendingFile]);
      delete (window as any).pendingUploadFile;
      sessionStorage.removeItem('dropped_file_meta');
    }
  }, []);

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setDownloadUrl(null);
    if (activeTool === 'merge') {
      setFiles((prev) => [...prev, ...acceptedFiles]);
    } else {
      setFiles([acceptedFiles[0]]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: activeTool === 'wordToPdf'
      ? { 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 'application/msword': ['.doc'] }
      : { 'application/pdf': ['.pdf'] },
    multiple: activeTool === 'merge'
  });

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleStartProcessing = async () => {
    if (files.length === 0) return;

    setProcessing(true);
    setProgress(0);
    setStatusMessage('Uploading document...');
    setDownloadUrl(null);

    const formData = new FormData();
    if (activeTool === 'merge') {
      files.forEach((f) => formData.append('files', f));
    } else {
      formData.append('file', files[0]);
    }

    let endpoint = '/process/pdf-op';
    if (activeTool === 'merge') {
      endpoint = '/process/merge';
    } else if (activeTool === 'wordToPdf' || activeTool === 'pdfToWord') {
      endpoint = '/process/convert';
      formData.append('targetFormat', activeTool === 'wordToPdf' ? 'pdf' : 'docx');
    } else {
      formData.append('operation', activeTool.toUpperCase());
      if (activeTool === 'rotate') {
        const testRot = [{ pageIndex: 0, degrees: 90 }];
        formData.append('rotations', JSON.stringify(testRot));
      } else if (activeTool === 'rearrange') {
        const indices = rearrangeOrder.split(',').map((x) => parseInt(x.trim())).filter((x) => !isNaN(x));
        formData.append('pageIndices', JSON.stringify(indices));
      } else if (activeTool === 'watermark') {
        formData.append('textValue', watermarkText);
        formData.append('opacity', watermarkOpacity.toString());
        formData.append('rotationAngle', watermarkRotation.toString());
        formData.append('scaleValue', '1');
      } else if (activeTool === 'protect' || activeTool === 'unlock') {
        formData.append('password', pdfPassword);
      }
    }

    try {
      const response = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const { fileId } = response.data.data;

      const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
      const socket = io(socketUrl, {
        withCredentials: true,
        transports: ['websocket', 'polling']
      });

      socket.on('connect', () => {
        socket.emit('join', fileId);
      });

      socket.on('conversion_progress', (data: any) => {
        setProgress(data.progress);
        setStatusMessage(data.message);

        if (data.status === 'completed') {
          setDownloadUrl(data.downloadUrl);
          setProcessing(false);
          socket.disconnect();
          toast.success('PDF Processed Successfully!');
        } else if (data.status === 'failed') {
          setProcessing(false);
          socket.disconnect();
          toast.error(data.message || 'PDF Operation failed.');
        }
      });
    } catch (error: any) {
      setProcessing(false);
      const msg = error.response?.data?.message || 'Processing error.';
      toast.error(msg);
    }
  };

  const handleDownload = () => {
    if (!downloadUrl) return;
    if (downloadUrl.startsWith('/stored_files/')) {
      const finalUrl = `${api.defaults.baseURL?.replace('/api', '')}${downloadUrl}`;
      window.open(finalUrl, '_blank');
    } else {
      window.open(downloadUrl, '_blank');
    }
  };

  const toolsList = [
    { type: 'merge', label: 'Merge PDFs', icon: Merge },
    { type: 'rotate', label: 'Rotate Pages', icon: RotateCw },
    { type: 'rearrange', label: 'Rearrange Pages', icon: RefreshCw },
    { type: 'watermark', label: 'Watermark PDF', icon: Type },
    { type: 'protect', label: 'Encrypt / Protect', icon: Lock },
    { type: 'unlock', label: 'Decrypt / Unlock', icon: Unlock },
    { type: 'wordToPdf', label: 'Word to PDF', icon: FileText },
    { type: 'pdfToWord', label: 'PDF to Word', icon: FileText }
  ];

  return (
    <div className="space-y-10 pb-12">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">PDF Utilities</h1>
        <p className="text-xs text-white/50 mt-1">
          Select document task, queue assets, and manage layout rearrangements.
        </p>
      </div>

      {/* Selector Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {toolsList.map((t) => (
          <button
            key={t.type}
            onClick={() => {
              setActiveTool(t.type as PdfToolType);
              setFiles([]);
              setDownloadUrl(null);
            }}
            className={`p-4 rounded-xl border text-left flex flex-col gap-3 transition-all ${
              activeTool === t.type
                ? 'border-orange-accent bg-white/5 text-orange-accent'
                : 'border-white/10 bg-white/[0.01] text-white/60 hover:border-white/20'
            }`}
          >
            <t.icon size={20} />
            <span className="text-xs font-bold">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Upload Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div
            {...getRootProps()}
            className={`flat-card p-10 text-center border-2 border-dashed border-stone-accent transition-all cursor-pointer ${
              isDragActive ? 'border-orange-accent scale-[1.01]' : 'hover:border-orange-accent'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-midnight/5 flex items-center justify-center text-light-primary">
                <Upload size={20} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-light-primary">
                  {activeTool === 'wordToPdf' ? 'Upload Word DOCX file' : 'Upload PDF document'}
                </h4>
                <p className="text-[10px] text-light-secondary mt-1">
                  Drag and drop files here (max 100MB)
                </p>
              </div>
            </div>
          </div>

          {/* Files List Card */}
          {files.length > 0 && (
            <div className="flat-card space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-light-secondary">Queue List ({files.length})</h4>
              <div className="space-y-2 max-h-[220px] overflow-y-auto">
                {files.map((f, idx) => (
                  <div key={idx} className="p-3 bg-midnight/5 rounded-xl flex justify-between items-center text-xs text-light-primary font-semibold">
                    <span className="truncate max-w-[80%]">{f.name}</span>
                    <button
                      onClick={() => handleRemoveFile(idx)}
                      className="p-1 text-light-secondary/50 hover:text-danger rounded hover:bg-midnight/10"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress bar */}
          {processing && (
            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span>{statusMessage}</span>
                <span className="text-orange-accent">{progress}%</span>
              </div>
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-orange-accent transition-all duration-200" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}

          {/* Completed Block */}
          {downloadUrl && (
            <div className="p-6 bg-success/15 border border-success/30 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/20 text-success flex items-center justify-center"><FileText size={20} /></div>
                <div>
                  <h4 className="font-bold text-sm text-white">Output compiled successfully</h4>
                  <p className="text-[10px] text-white/50">File is processed and cached in remote storage.</p>
                </div>
              </div>
              <button
                onClick={handleDownload}
                className="btn-primary text-xs font-bold px-4 py-2"
              >
                <Download size={14} className="mr-1" /> Get File
              </button>
            </div>
          )}
        </div>

        {/* Parameters Column */}
        <div className="flat-card space-y-6 self-start">
          <h3 className="font-bold text-sm text-light-primary border-b border-midnight/10 pb-4">Configurations</h3>

          {activeTool === 'merge' && (
            <p className="text-xs text-light-secondary leading-relaxed font-medium">
              Drop multiple PDF files. They will be merged sequentially in the order listed.
            </p>
          )}

          {activeTool === 'rotate' && (
            <p className="text-xs text-light-secondary leading-relaxed font-medium">
              This will apply a 90-degree clockwise rotation to all pages of the document.
            </p>
          )}

          {activeTool === 'rearrange' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-light-secondary">Page Index Order</label>
              <input
                type="text"
                placeholder="e.g. 0, 2, 1"
                value={rearrangeOrder}
                onChange={(e) => setRearrangeOrder(e.target.value)}
                className="w-full bg-midnight/5 border border-stone-accent rounded-xl px-3.5 py-2.5 text-xs text-light-primary focus:outline-none"
              />
              <p className="text-[9px] text-light-secondary">Provide page indexes separated by commas (e.g. 0,2,1 keeps page 1, 3, and 2, omitting others).</p>
            </div>
          )}

          {activeTool === 'watermark' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-light-secondary">Watermark Text</label>
                <input
                  type="text"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  className="w-full bg-midnight/5 border border-stone-accent rounded-xl px-3.5 py-2.5 text-xs text-light-primary focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-light-secondary font-bold">
                  <span>Opacity</span>
                  <span>{Math.round(watermarkOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={watermarkOpacity}
                  onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                  className="w-full accent-orange-accent bg-midnight/10 h-1 rounded"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-light-secondary font-bold">
                  <span>Rotation Angle</span>
                  <span>{watermarkRotation}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={watermarkRotation}
                  onChange={(e) => setWatermarkRotation(parseInt(e.target.value))}
                  className="w-full accent-orange-accent bg-midnight/10 h-1 rounded"
                />
              </div>
            </div>
          )}

          {(activeTool === 'protect' || activeTool === 'unlock') && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-light-secondary">Password</label>
              <input
                type="password"
                placeholder="password..."
                value={pdfPassword}
                onChange={(e) => setPdfPassword(e.target.value)}
                className="w-full bg-midnight/5 border border-stone-accent rounded-xl px-3.5 py-2.5 text-xs text-light-primary focus:outline-none"
              />
            </div>
          )}

          {(activeTool === 'wordToPdf' || activeTool === 'pdfToWord') && (
            <p className="text-xs text-light-secondary leading-relaxed font-medium">
              Convert between Word documents (.docx) and PDF format in one click.
            </p>
          )}

          <button
            onClick={handleStartProcessing}
            disabled={files.length === 0 || processing}
            className="w-full py-3 btn-primary text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? <Loader2 size={14} className="animate-spin text-white" /> : <ArrowRight size={14} />}
            {processing ? 'Processing...' : 'Run Operation'}
          </button>
        </div>

      </div>
    </div>
  );
};
