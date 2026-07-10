import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Menu, X, LogOut, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navLinks = [
    { label: 'PDF Tools', path: '/tools/pdf' },
    { label: 'Image Tools', path: '/tools/image' },
    { label: 'Pricing', path: '/#pricing' },
    { label: 'About', path: '/#about' },
    { label: 'Contact', path: '/#contact' }
  ];

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-midnight border-b border-white/10 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Logo Left */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-orange-accent flex items-center justify-center text-white font-bold text-base shadow-sm group-hover:scale-105 transition-transform duration-200">
            CE
          </div>
          <span className="font-bold text-lg tracking-tight text-white">
            Convert<span className="text-orange-accent">Ease</span>
          </span>
        </Link>

        {/* Navigation Center */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            link.path.startsWith('/#') ? (
              <a
                key={link.label}
                href={link.path}
                className="text-sm font-medium text-white/70 hover:text-white transition-colors duration-200"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.path}
                to={link.path}
                className="text-sm font-medium text-white/70 hover:text-white transition-colors duration-200"
              >
                {link.label}
              </Link>
            )
          ))}
        </div>

        {/* CTA Button Right */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard"
                className="btn-primary text-xs px-4 py-2"
              >
                <LayoutDashboard size={14} className="mr-1.5" />
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="text-white/60 hover:text-danger p-2 transition-colors duration-200"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className="text-sm font-medium text-white/70 hover:text-white transition-colors duration-200"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="btn-primary text-xs px-4 py-2"
              >
                Start Converting
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu trigger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-white/75 hover:text-white md:hidden transition-colors"
          aria-label="Toggle menu"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 w-full bg-midnight border-b border-white/10 px-6 py-6 flex flex-col gap-4 shadow-xl z-40"
          >
            {navLinks.map((link) => (
              link.path.startsWith('/#') ? (
                <a
                  key={link.label}
                  href={link.path}
                  onClick={() => setIsOpen(false)}
                  className="text-base font-semibold py-2 border-b border-white/5 text-white/70 hover:text-white transition-colors"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className="text-base font-semibold py-2 border-b border-white/5 text-white/70 hover:text-white transition-colors"
                >
                  {link.label}
                </Link>
              )
            ))}

            {user ? (
              <div className="flex flex-col gap-3 mt-2">
                <Link
                  to="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="btn-primary py-2.5 text-center font-semibold text-sm"
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    handleLogout();
                  }}
                  className="btn-secondary py-2.5 text-center text-danger hover:border-danger font-semibold text-sm"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 mt-2">
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="btn-secondary py-2.5 text-center font-semibold text-sm"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setIsOpen(false)}
                  className="btn-primary py-2.5 text-center font-semibold text-sm"
                >
                  Start Converting
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
