"use client";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export default function SlideOver({ isOpen, onClose, title, children }: any) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50"
          />
          <motion.div 
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full md:w-[500px] bg-[#050505] border-l border-neutral-800 z-50 p-8 shadow-2xl overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-lg font-bold text-white uppercase tracking-widest">{title}</h2>
              <button onClick={onClose} className="p-2 hover:bg-neutral-900 rounded-full transition-colors">
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}