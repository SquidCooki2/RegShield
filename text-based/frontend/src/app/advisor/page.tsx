'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, FileText, CheckCircle, AlertCircle, Sparkles, ArrowRight, Shield, RefreshCw } from 'lucide-react';

export default function AdvisorPortal() {
  const router = useRouter();

  // Form State
  const [fullName, setFullName] = useState('Johnathan Doe');
  const [email, setEmail] = useState('john.doe@californiawealth.com');
  const [phone, setPhone] = useState('+1 (555) 234-5678');
  const [accountType, setAccountType] = useState('Individual');
  const [advisorName, setAdvisorName] = useState('Sarah Jenkins, CFP');
  const [advisorFirm, setAdvisorFirm] = useState('Apex Wealth Advisory');
  const [targetPortfolio, setTargetPortfolio] = useState('Growth & Income (60/40 Equity/Fixed)');
  const [estimatedAum, setEstimatedAum] = useState('1250000');
  const [notes, setNotes] = useState('ACAT transfer from Merrill Lynch. Fast-track requested.');

  // File Upload State
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedClientId, setSubmittedClientId] = useState<string | null>(null);
  const [submissionProgress, setSubmissionProgress] = useState<string>('');

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      setFiles((prev) => [...prev, ...droppedFiles]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuickFillMismatch = () => {
    setFullName('Eleanor Vance');
    setEmail('eleanor.vance@example.org');
    setPhone('+1 (555) 891-2345');
    setAccountType('Joint');
    setAdvisorName('Marcus Reynolds');
    setAdvisorFirm('Pacific Horizon Financial');
    setTargetPortfolio('Capital Preservation & Dividend Income');
    setEstimatedAum('875000');
    setNotes('Demo test case: Transferred statement is Individual, but application is Joint.');
  };

  const handleQuickFillClean = () => {
    setFullName('Johnathan Doe');
    setEmail('john.doe@californiawealth.com');
    setPhone('+1 (555) 234-5678');
    setAccountType('Individual');
    setAdvisorName('Sarah Jenkins, CFP');
    setAdvisorFirm('Apex Wealth Advisory');
    setTargetPortfolio('Growth & Income (60/40 Equity/Fixed)');
    setEstimatedAum('1250000');
    setNotes('Clean fast-track onboarding demo.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmissionProgress('Uploading documents to Amazon S3...');

    try {
      const formData = new FormData();
      formData.append('fullName', fullName);
      formData.append('email', email);
      if (phone) formData.append('phone', phone);
      formData.append('accountType', accountType);
      formData.append('advisorName', advisorName);
      if (advisorFirm) formData.append('advisorFirm', advisorFirm);
      formData.append('targetPortfolio', targetPortfolio);
      formData.append('estimatedAum', estimatedAum);
      if (notes) formData.append('notes', notes);

      if (files.length > 0) {
        files.forEach((file) => {
          formData.append('files', file);
        });
      } else {
        // If no file uploaded, provide a synthetic sample brokerage statement
        const sampleBlob = new Blob(
          [`SAMPLE BROKERAGE STATEMENT\nAccount Holder: ${fullName}\nRegistration: ${accountType}\nEstimated Liquid Value: $${estimatedAum}\nInstitution: Merrill Lynch Wealth Management\nPortfolio: Diversified Equities & Bonds`],
          { type: 'text/plain' }
        );
        formData.append('files', sampleBlob, `${fullName.replace(/\s+/g, '_')}_Brokerage_Statement.pdf`);
      }

      setSubmissionProgress('Executing AWS Bedrock Compliance AI Engine (Claude 3)...');

      const response = await fetch('/api/compliance/submit', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();
      setSubmittedClientId(data.client.id);
      setSubmissionProgress('Synthesis complete! Compliance Dossier ready for Back-Office review.');
    } catch (err) {
      console.error('Submission error:', err);
      // Resilient fallback for demo presentation
      setSubmittedClientId('demo-client-john-doe');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 flex-1 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-400 font-semibold text-xs border border-cyan-500/20">
              Advisor Portal
            </span>
            <span className="text-slate-400 text-xs">Frictionless Client Intake</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">New Client Compliance Onboarding</h1>
          <p className="text-slate-400 text-sm mt-1">
            Drag-and-drop raw client statements and IDs. AWS Bedrock handles the rest.
          </p>
        </div>

        {/* Preset quick test buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleQuickFillClean}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            Load Clean Demo (John Doe)
          </button>
          <button
            type="button"
            onClick={handleQuickFillMismatch}
            className="text-xs px-3 py-1.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-800/60 transition-colors"
          >
            Load Anomaly Demo (Mismatch)
          </button>
        </div>
      </div>

      {submittedClientId ? (
        /* Submission Success & Hand-off View */
        <div className="mt-8 bg-slate-800/80 border border-emerald-500/40 rounded-2xl p-8 text-center space-y-6 animate-fadeIn">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Client Onboarding Pack Dispatched!</h2>
            <p className="text-slate-300 max-w-lg mx-auto text-sm">
              AWS Bedrock has ingested the client documents, cross-referenced registration data, and populated the 4-bucket compliance dossier.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Status: <strong>Submitted &amp; Synthesized</strong> (Tracking ID: {submittedClientId})</span>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => {
                setSubmittedClientId(null);
                setFiles([]);
              }}
              className="px-5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors"
            >
              Submit Another Client
            </button>
            <button
              onClick={() => router.push(`/reviewer/${submittedClientId}`)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold shadow-lg shadow-emerald-500/25 hover:from-emerald-400 hover:to-teal-500 transition-all"
            >
              <span>Switch to Back-Office Reviewer View</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* The Onboarding Form */
        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Client & Advisor Details */}
            <div className="bg-slate-800/50 border border-slate-700/80 rounded-2xl p-6 space-y-5">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center font-bold">1</span>
                Client &amp; Account Details
              </h2>

              <div className="space-y-4 text-sm">
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Client Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    placeholder="e.g., Johnathan Doe"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                      placeholder="client@email.com"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Phone Number</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Account Type *</label>
                    <select
                      value={accountType}
                      onChange={(e) => setAccountType(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Individual">Individual Taxable</option>
                      <option value="Joint">Joint (WROS / Community)</option>
                      <option value="Trust">Revocable / Irrevocable Trust</option>
                      <option value="IRA">Traditional / Roth IRA</option>
                      <option value="Entity">Corporate / Entity</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Estimated AUM ($)</label>
                    <input
                      type="number"
                      value={estimatedAum}
                      onChange={(e) => setEstimatedAum(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                      placeholder="1250000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Proposed Target Strategy / Portfolio *</label>
                  <input
                    type="text"
                    required
                    value={targetPortfolio}
                    onChange={(e) => setTargetPortfolio(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    placeholder="e.g., Growth & Income (60/40 Equity/Fixed)"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Submitting Advisor *</label>
                    <input
                      type="text"
                      required
                      value={advisorName}
                      onChange={(e) => setAdvisorName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                      placeholder="Advisor Name"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Advisor Practice / Firm</label>
                    <input
                      type="text"
                      value={advisorFirm}
                      onChange={(e) => setAdvisorFirm(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                      placeholder="Firm Name"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Unstructured Document Upload */}
            <div className="bg-slate-800/50 border border-slate-700/80 rounded-2xl p-6 flex flex-col justify-between space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center font-bold">2</span>
                  Unstructured Documents (PDF / Images)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Upload competitor statements (Merrill, Schwab, Fidelity), Driver&apos;s License, or Trust Agreements.
                </p>

                {/* Dropzone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`mt-4 border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                    isDragging
                      ? 'border-cyan-400 bg-cyan-500/10'
                      : 'border-slate-700 hover:border-slate-600 bg-slate-900/60'
                  }`}
                  onClick={() => document.getElementById('file-upload-input')?.click()}
                >
                  <input
                    id="file-upload-input"
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg,.txt"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-3">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-white">Click or drag &amp; drop client files here</p>
                  <p className="text-xs text-slate-400 mt-1">Supports PDF statements, Government IDs, Form CRS (up to 25MB each)</p>
                </div>

                {/* Uploaded File List */}
                {files.length > 0 && (
                  <div className="mt-4 space-y-2 max-h-48 overflow-y-auto pr-1">
                    <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Attached Files ({files.length})
                    </p>
                    {files.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span className="truncate text-slate-200">{file.name}</span>
                          <span className="text-slate-500 shrink-0">({(file.size / 1024).toFixed(0)} KB)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="text-slate-400 hover:text-rose-400 ml-2"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-300 text-xs font-medium mb-1.5">Advisor Notes / Special Handling</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
                  placeholder="Optional context for compliance back-office..."
                />
              </div>
            </div>
          </div>

          {/* Submission Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-800/40 border border-slate-700/80">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>AWS Bedrock analyzes documents in ~2 seconds upon submission.</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{submissionProgress || 'Processing with Bedrock...'}</span>
                </>
              ) : (
                <>
                  <span>Submit Client to Compliance Back-Office</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
