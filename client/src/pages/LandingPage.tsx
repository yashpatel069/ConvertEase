import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { Navbar } from '../layouts/Navbar';
import {
  FileText,
  Image as ImageIcon,
  Crop,
  Layers,
  Upload,
  ArrowRight,
  Shield,
  Zap,
  CheckCircle,
  Star,
  Plus,
  Minus,
  FileUp,
  Scissors,
  Lock,
  Unlock,
  Eye,
  Minimize2,
  FileEdit,
  Sparkles
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    const ext = file.name.split('.').pop()?.toLowerCase();

    const fileData = {
      name: file.name,
      size: file.size,
      type: file.type
    };
    sessionStorage.setItem('dropped_file_meta', JSON.stringify(fileData));
    (window as any).pendingUploadFile = file;

    if (ext === 'pdf') {
      navigate('/tools/pdf');
    } else if (['jpg', 'jpeg', 'png', 'webp', 'svg', 'bmp', 'tiff', 'heic', 'ico'].includes(ext || '')) {
      navigate('/tools/image');
    } else {
      navigate('/tools/ocr');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false
  });

  const tools = [
    { title: 'PDF to Word', desc: 'Isolate layout parameters and export text blocks to DOCX.', icon: FileText, path: '/tools/pdf' },
    { title: 'Word to PDF', desc: 'Convert DOCX text sheets to high-quality PDF files.', icon: FileUp, path: '/tools/pdf' },
    { title: 'Merge PDF', desc: 'Sequentially combine multiple PDF files into one output.', icon: FileText, path: '/tools/pdf' },
    { title: 'Split PDF', desc: 'Extract select pages or partition files by page bounds.', icon: Scissors, path: '/tools/pdf' },
    { title: 'Compress PDF', desc: 'Quantize images and resources inside PDF structures.', icon: Minimize2, path: '/tools/pdf' },
    { title: 'Protect PDF', desc: 'Encrypt document records with 128-bit key locks.', icon: Lock, path: '/tools/pdf' },
    { title: 'Unlock PDF', desc: 'Remove decryption passwords from document nodes.', icon: Unlock, path: '/tools/pdf' },
    { title: 'Image to PDF', desc: 'Compile image catalogs into a clean PDF document.', icon: FileUp, path: '/tools/pdf' },
    { title: 'Compress Image', desc: 'Optimize JPG, PNG and WEBP file size buffers.', icon: Minimize2, path: '/tools/image' },
    { title: 'Resize Image', desc: 'Adjust dimension boundaries by scale or aspect ratio.', icon: Crop, path: '/tools/editor' },
    { title: 'Crop Image', desc: 'Trim edge parameters using our responsive canvas.', icon: Crop, path: '/tools/editor' },
    { title: 'Chroma Remover', desc: 'Strip solid backdrops using chroma-key transparency.', icon: Sparkles, path: '/tools/editor' },
    { title: 'OCR Scanner', desc: 'Scan document shapes and extract layout text lines.', icon: Layers, path: '/tools/ocr' }
  ];

  const faqs = [
    { q: 'Is my data secure?', a: 'Yes. Transfers are encrypted via SSL. Converted files are stored on secure storage provider buckets, and regular sweeps delete them after 24 hours.' },
    { q: 'How does the background processing queue work?', a: 'When you upload files, conversions are executed as asynchronous jobs on our Node backend queue. Socket.IO pushes progress updates in real-time.' },
    { q: 'Can I use OCR to extract text from images?', a: 'Yes! Our OCR module integrates Tesseract.js engine on the server to recognize and extract text in multiple languages.' }
  ];

  return (
    <div className="bg-midnight min-h-screen pt-28 text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="px-6 md:px-12 max-w-7xl mx-auto py-16 md:py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6 max-w-4xl mx-auto"
        >
          <span className="text-xs font-bold text-orange-accent tracking-widest uppercase">
            ⚡ Handcrafted Processing Workspace
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-none text-white max-w-4xl mx-auto">
            Convert Documents & Images Instantly
          </h1>
          <p className="text-white/70 text-base md:text-lg max-w-xl mx-auto leading-relaxed">
            Fast, premium, and clean conversion suites with a professional canvas workspace.
          </p>
        </motion.div>

        {/* Immediate Upload Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="max-w-3xl mx-auto mt-12"
        >
          <div
            {...getRootProps()}
            className={`cursor-pointer flat-card p-12 text-center border-2 border-dashed border-stone-accent transition-all duration-200 ${
              isDragActive ? 'border-orange-accent scale-[1.01]' : 'hover:border-orange-accent'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-midnight/5 flex items-center justify-center text-midnight">
                <Upload size={24} />
              </div>
              <div>
                <h3 className="font-bold text-xl text-light-primary">
                  {isDragActive ? 'Drop file here...' : 'Drag & drop a file here'}
                </h3>
                <p className="text-xs text-light-secondary mt-1">
                  Supports PDF, DOCX, PNG, JPG, WEBP, SVG, TIFF (up to 100MB)
                </p>
              </div>
              <button className="btn-primary text-xs font-bold px-6 py-3 mt-2">
                Browse Files
              </button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Tools Section */}
      <section className="px-6 md:px-12 max-w-7xl mx-auto py-20 border-t border-white/10">
        <div className="text-center space-y-3 mb-16">
          <h2 className="text-3xl md:text-4xl font-bold">Handcrafted Tools</h2>
          <p className="text-white/60 max-w-lg mx-auto text-sm">Everything you need to handle document editing, image resizing, and OCR isolating.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tools.map((feat, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.03 }}
              key={feat.title}
              className="flat-card flat-card-hover flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-midnight/5 flex items-center justify-center text-midnight mb-6">
                  <feat.icon size={20} />
                </div>
                <h3 className="text-base font-bold mb-2 text-light-primary">{feat.title}</h3>
                <p className="text-xs text-light-secondary leading-relaxed mb-6">{feat.desc}</p>
              </div>
              <Link to={feat.path} className="inline-flex items-center gap-1 text-xs font-bold text-orange-accent hover:text-orange-accent/80 transition-colors">
                Launch Tool <ArrowRight size={14} />
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="px-6 md:px-12 max-w-7xl mx-auto py-16 border-t border-white/10">
        <div className="text-center space-y-3 mb-16">
          <h2 className="text-3xl md:text-4xl font-bold">ConvertEase is Free Forever</h2>
          <p className="text-white/60 max-w-md mx-auto text-xs">Access all premium tools, high-speed conversions, and secure cloud storage at zero cost.</p>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="flat-card border border-stone-accent flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-5 right-5 px-3 py-1 rounded-full bg-orange-accent/15 text-[9px] font-bold text-orange-accent tracking-wider">
              UNLIMITED ACCESS
            </div>
            <div>
              <h3 className="font-bold text-lg text-light-primary">100% Free Plan</h3>
              <p className="text-xs text-light-secondary mb-6">Enjoy enterprise-grade PDF, Image, and OCR processing without any subscription fees.</p>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-3xl font-black text-light-primary">$0</span>
                <span className="text-xs text-light-secondary">/ forever</span>
              </div>

              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <li className="flex items-center gap-2 text-xs text-light-secondary font-medium">
                  <CheckCircle size={14} className="text-orange-accent" /> Max file size: 100 MB
                </li>
                <li className="flex items-center gap-2 text-xs text-light-secondary font-medium">
                  <CheckCircle size={14} className="text-orange-accent" /> Unlimited conversions
                </li>
                <li className="flex items-center gap-2 text-xs text-light-secondary font-medium">
                  <CheckCircle size={14} className="text-orange-accent" /> OCR & Custom Watermarks
                </li>
                <li className="flex items-center gap-2 text-xs text-light-secondary font-medium">
                  <CheckCircle size={14} className="text-orange-accent" /> Professional Image Editor
                </li>
                <li className="flex items-center gap-2 text-xs text-light-secondary font-medium">
                  <CheckCircle size={14} className="text-orange-accent" /> S3 & Cloudinary storage access
                </li>
                <li className="flex items-center gap-2 text-xs text-light-secondary font-medium">
                  <CheckCircle size={14} className="text-orange-accent" /> Interactive PDF page edit tool
                </li>
              </ul>
            </div>
            <Link to="/signup" className="btn-primary text-xs py-3.5 text-center font-bold">
              Sign Up Free Now
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 md:px-12 max-w-4xl mx-auto py-20">
        <div className="text-center space-y-3 mb-16">
          <h2 className="text-3xl font-bold">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="border border-white/10 rounded-xl overflow-hidden bg-white/[0.01]"
            >
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full flex justify-between items-center p-5 text-left font-bold text-xs text-white hover:bg-white/5 transition-all"
              >
                <span>{faq.q}</span>
                {activeFaq === idx ? <Minus size={14} /> : <Plus size={14} />}
              </button>
              
              {activeFaq === idx && (
                <div className="px-5 pb-5 pt-1 text-xs text-white/60 leading-relaxed border-t border-white/10 bg-black/10">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/20 py-16 px-6 md:px-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="space-y-4">
            <span className="font-bold text-base tracking-tight text-white">
              Convert<span className="text-orange-accent">Ease</span>
            </span>
            <p className="text-xs text-white/50 leading-relaxed">
              Premium document and image processing ecosystem. Built with React, Node.js and MongoDB.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-xs mb-4 uppercase tracking-wider text-white/50">Product</h4>
            <ul className="space-y-2 text-xs text-white/60">
              <li><Link to="/tools/pdf">PDF Utilities</Link></li>
              <li><Link to="/tools/image">Image Converter</Link></li>
              <li><Link to="/tools/editor">Canvas Editor</Link></li>
              <li><Link to="/tools/ocr">OCR Scanner</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-xs mb-4 uppercase tracking-wider text-white/50">Security</h4>
            <ul className="space-y-2 text-xs text-white/60">
              <li>Rate Limiting</li>
              <li>CSRF / XSS Blocks</li>
              <li>JWT Encrypted Keys</li>
              <li>SSL Security</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-xs mb-4 uppercase tracking-wider text-white/50">Support</h4>
            <p className="text-xs text-white/60">Email: support@convertease.ai</p>
            <p className="text-[10px] text-white/40 mt-2">ConvertEase AI Inc. &copy; 2026. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
