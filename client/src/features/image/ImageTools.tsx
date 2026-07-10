import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { api } from '../../services/api';
import { io } from 'socket.io-client';
import {
  Upload,
  Loader2,
  Download,
  Settings2,
  ArrowRight,
  FileCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

type ImageActionType = 'convert' | 'compress';

export const ImageTools: React.FC = () => {
  const [activeAction, setActiveAction] = useState<ImageActionType>('convert');
  const [file, setFile] = useState<File | null>(null);
  
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // Configuration options
  const [targetFormat, setTargetFormat] = useState('png'); 
  const [quality, setQuality] = useState(80);
  const [targetSizeKb, setTargetSizeKb] = useState('');
  const [preserveMetadata, setPreserveMetadata] = useState(false);
  const [lossless, setLossless] = useState(false);

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
      setDownloadUrl(null);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.bmp', '.tiff', '.heic', '.ico'] },
    multiple: false
  });

  const handleStartProcessing = async () => {
    if (!file) return;

    setProcessing(true);
    setProgress(0);
    setStatusMessage('Uploading image...');
    setDownloadUrl(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('preserveMetadata', preserveMetadata.toString());

    let endpoint = '/process/convert';
    if (activeAction === 'compress') {
      endpoint = '/process/compress';
      formData.append('quality', quality.toString());
      if (targetSizeKb) formData.append('targetSizeKb', targetSizeKb);
    } else {
      formData.append('targetFormat', targetFormat);
      formData.append('quality', quality.toString());
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
          toast.success('Image processing completed!');
        } else if (data.status === 'failed') {
          setProcessing(false);
          socket.disconnect();
          toast.error(data.message || 'Processing failed.');
        }
      });
    } catch (error: any) {
      setProcessing(false);
      const msg = error.response?.data?.message || 'Processing failed.';
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

  return (
    <div className="space-y-10 pb-12">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Image Suite</h1>
        <p className="text-xs text-white/50 mt-1">
          Convert formats, optimize ratios, and compress image buffers.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-xl self-start w-52">
        {(['convert', 'compress'] as ImageActionType[]).map((act) => (
          <button
            key={act}
            onClick={() => {
              setActiveAction(act);
              setDownloadUrl(null);
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all ${
              activeAction === act
                ? 'bg-orange-accent text-white shadow-sm'
                : 'text-white/60 hover:text-white'
            }`}
          >
            {act}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Upload Column */}
        <div className="lg:col-span-2 space-y-6">
          <div
            {...getRootProps()}
            className={`flat-card p-12 text-center border-2 border-dashed border-stone-accent transition-all cursor-pointer ${
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
                  {file ? file.name : 'Upload image file'}
                </h4>
                <p className="text-[10px] text-light-secondary mt-1">
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Supports JPG, PNG, WEBP, SVG, BMP, TIFF, ICO'}
                </p>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          {processing && (
            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span>{statusMessage}</span>
                <span className="text-orange-accent">{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-orange-accent transition-all duration-200" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}

          {/* Completed block */}
          {downloadUrl && (
            <div className="p-6 bg-success/15 border border-success/30 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/20 text-success flex items-center justify-center"><FileCheck size={20} /></div>
                <div>
                  <h4 className="font-bold text-sm text-white">Image processed successfully</h4>
                  <p className="text-[10px] text-white/50">Optimized graphics buffer loaded to CDN.</p>
                </div>
              </div>
              <button
                onClick={handleDownload}
                className="btn-primary text-xs font-bold px-4 py-2"
              >
                <Download size={14} className="mr-1" /> Download Output
              </button>
            </div>
          )}
        </div>

        {/* Configurations Column */}
        <div className="flat-card space-y-6 self-start">
          <h3 className="font-bold text-sm text-light-primary border-b border-midnight/10 pb-4 flex items-center gap-2">
            <Settings2 size={16} /> Configurations
          </h3>

          {/* Format Selection */}
          {activeAction === 'convert' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-light-secondary">Target format</label>
              <select
                value={targetFormat}
                onChange={(e) => setTargetFormat(e.target.value)}
                className="w-full bg-midnight/5 border border-stone-accent rounded-xl px-3.5 py-2.5 text-xs text-light-primary focus:outline-none"
              >
                <option value="png">PNG (Portable Network)</option>
                <option value="jpeg">JPEG (Joint Photographic)</option>
                <option value="webp">WEBP (Web Graphic)</option>
                <option value="tiff">TIFF (Tagged Image)</option>
                <option value="bmp">BMP (Bitmap Image)</option>
                <option value="ico">ICO (Windows Icon)</option>
              </select>
            </div>
          )}

          {/* Quality Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-light-secondary">
              <span>Quality Factor</span>
              <span>{quality}%</span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={quality}
              onChange={(e) => setQuality(parseInt(e.target.value))}
              className="w-full accent-orange-accent bg-midnight/10 h-1 rounded cursor-pointer"
            />
          </div>

          {/* Target File Size */}
          {activeAction === 'compress' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-light-secondary">Target size limit (KB)</label>
              <input
                type="number"
                placeholder="e.g. 150"
                value={targetSizeKb}
                onChange={(e) => setTargetSizeKb(e.target.value)}
                className="w-full bg-midnight/5 border border-stone-accent rounded-xl px-3.5 py-2.5 text-xs text-light-primary focus:outline-none"
              />
              <p className="text-[9px] text-light-secondary">quantize iteratively to fit under this target size.</p>
            </div>
          )}

          {/* Toggles */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center">
              <input
                id="preserveMeta"
                type="checkbox"
                checked={preserveMetadata}
                onChange={(e) => setPreserveMetadata(e.target.checked)}
                className="w-4 h-4 rounded border-stone-accent accent-orange-accent text-orange-accent cursor-pointer"
              />
              <label htmlFor="preserveMeta" className="text-xs text-light-secondary ml-2 select-none cursor-pointer">
                Preserve EXIF metadata
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="lossless"
                type="checkbox"
                checked={lossless}
                onChange={(e) => setLossless(e.target.checked)}
                className="w-4 h-4 rounded border-stone-accent accent-orange-accent text-orange-accent cursor-pointer"
              />
              <label htmlFor="lossless" className="text-xs text-light-secondary ml-2 select-none cursor-pointer">
                Enable Lossless Compression
              </label>
            </div>
          </div>

          <button
            onClick={handleStartProcessing}
            disabled={!file || processing}
            className="w-full py-3 btn-primary text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {processing ? <Loader2 size={14} className="animate-spin text-white" /> : <ArrowRight size={14} />}
            {processing ? 'Processing...' : 'Run Operation'}
          </button>
        </div>

      </div>
    </div>
  );
};
