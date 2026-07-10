import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { api } from '../../services/api';
import { io } from 'socket.io-client';
import {
  Upload,
  Layers,
  Copy,
  Download,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const OcrTools: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [lang, setLang] = useState('eng');
  const [outputFormat, setOutputFormat] = useState('txt');
  const [processing, setProcessing] = useState(false);
  
  // Progress tracking
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  
  // Results
  const [extractedText, setExtractedText] = useState('');
  const [resultFileId, setResultFileId] = useState<string | null>(null);

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
      setExtractedText('');
      setResultFileId(null);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff'] },
    multiple: false
  });

  const handleStartOCR = async () => {
    if (!file) return;

    setProcessing(true);
    setProgress(0);
    setStatusMessage('Uploading document...');
    setExtractedText('');
    setResultFileId(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('lang', lang);
    formData.append('outputFormat', outputFormat);

    try {
      const response = await api.post('/process/ocr', formData, {
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
          setResultFileId(data.fileId);
          setProcessing(false);
          socket.disconnect();
          toast.success('OCR Complete!');
          fetchExtractedText(data.fileId);
        } else if (data.status === 'failed') {
          setProcessing(false);
          socket.disconnect();
          toast.error(data.message || 'OCR extraction failed.');
        }
      });
    } catch (error: any) {
      setProcessing(false);
      const msg = error.response?.data?.message || 'Failed to submit OCR task.';
      toast.error(msg);
    }
  };

  const fetchExtractedText = async (fileId: string) => {
    try {
      const res = await api.get(`/files/${fileId}/download`, {
        responseType: 'text'
      });
      setExtractedText(res.data);
    } catch (err) {
      console.warn('Could not load text preview:', err);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(extractedText);
    toast.success('Copied text to clipboard!');
  };

  const handleDownloadOutput = () => {
    if (!resultFileId) return;
    const token = localStorage.getItem('access_token');
    const url = `${api.defaults.baseURL}/files/${resultFileId}/download?token=${token}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-10 pb-12">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">AI OCR Text Isolation</h1>
        <p className="text-xs text-white/50 mt-1">
          Upload scanned documents or screen captures to isolate text.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Form panel */}
        <div className="flat-card space-y-6 self-start">
          <h3 className="font-bold text-sm text-light-primary border-b border-midnight/10 pb-4">Scanner Parameters</h3>

          {/* Language Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-light-secondary">OCR Language</label>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="w-full bg-midnight/5 border border-stone-accent rounded-xl px-3 py-2.5 text-xs text-light-primary focus:outline-none"
            >
              <option value="eng">English (Latin)</option>
              <option value="spa">Spanish (Español)</option>
              <option value="fra">French (Français)</option>
              <option value="deu">German (Deutsch)</option>
              <option value="chi_sim">Chinese Simplified (中文)</option>
            </select>
          </div>

          {/* Format Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-light-secondary">Compilation Export</label>
            <select
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value)}
              className="w-full bg-midnight/5 border border-stone-accent rounded-xl px-3 py-2.5 text-xs text-light-primary focus:outline-none"
            >
              <option value="txt">Plain Text File (.txt)</option>
              <option value="pdf">Searchable PDF (.pdf)</option>
              <option value="docx">Microsoft Word (.docx)</option>
            </select>
          </div>

          <button
            onClick={handleStartOCR}
            disabled={!file || processing}
            className="w-full py-3 btn-primary text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? <Loader2 size={14} className="animate-spin text-white" /> : <Layers size={14} />}
            {processing ? 'Scanning...' : 'Extract Text'}
          </button>
        </div>

        {/* Workspace */}
        <div className="md:col-span-2 space-y-6">
          <div
            {...getRootProps()}
            className={`flat-card p-10 text-center border-2 border-dashed border-stone-accent transition-colors cursor-pointer ${
              isDragActive ? 'border-orange-accent' : 'hover:border-orange-accent'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-midnight/5 flex items-center justify-center text-light-primary">
                <Upload size={20} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-light-primary">
                  {file ? file.name : 'Upload image for text extraction'}
                </h4>
                <p className="text-[10px] text-light-secondary mt-0.5">
                  {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Supports JPG, PNG, WEBP, BMP, and TIFF'}
                </p>
              </div>
            </div>
          </div>

          {/* Progress */}
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

          {/* OCR Result Viewport */}
          {extractedText && (
            <div className="flat-card space-y-4">
              <div className="flex items-center justify-between border-b border-midnight/10 pb-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-light-secondary flex items-center gap-2">
                  <CheckCircle size={15} className="text-success" /> Extracted Text Preview
                </h4>
                <div className="flex gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-accent text-[10px] font-bold hover:bg-midnight/5 text-light-primary transition-all"
                  >
                    Copy
                  </button>
                  <button
                    onClick={handleDownloadOutput}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-midnight hover:bg-midnight/80 text-white text-[10px] font-bold transition-all"
                  >
                    Download
                  </button>
                </div>
              </div>

              {/* Text box */}
              <textarea
                value={extractedText}
                onChange={(e) => setExtractedText(e.target.value)}
                rows={10}
                className="w-full bg-midnight/5 border border-stone-accent rounded-xl p-4 text-xs font-mono focus:outline-none focus:border-midnight/30 text-light-primary leading-relaxed"
              ></textarea>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
