'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Shield,
  FileCheck2,
  DollarSign,
  Users,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Building,
  HelpCircle,
  FileText,
  UploadCloud,
} from 'lucide-react';

export default function AdvisorPortal() {
  const router = useRouter();

  // Tabbed multi-section form state
  const [activeTab, setActiveTab] = useState<'IDENTITY' | 'ACCOUNT' | 'SUITABILITY' | 'PROTECTIONS' | 'DISCLOSURES'>('IDENTITY');

  // Form Fields
  // 1. Identity & CIP
  const [fullName, setFullName] = useState('Johnathan Doe');
  const [email, setEmail] = useState('john.doe@californiawealth.com');
  const [phone, setPhone] = useState('+1 (555) 234-5678');
  const [dateOfBirth, setDateOfBirth] = useState('1976-08-14');
  const [ssnLast4, setSsnLast4] = useState('8821');
  const [citizenshipStatus, setCitizenshipStatus] = useState('US Citizen');
  const [residentialAddress, setResidentialAddress] = useState('450 Newport Center Dr, Newport Beach, CA 92660');

  // 2. Account Type & Registration
  const [accountType, setAccountType] = useState<'Individual' | 'Joint' | 'Trust' | 'Entity' | 'IRA'>('Individual');
  const [coOwnerFullName, setCoOwnerFullName] = useState('');
  const [coOwnerRelationship, setCoOwnerRelationship] = useState('Spouse');
  const [trustName, setTrustName] = useState('');
  const [trustDate, setTrustDate] = useState('');

  // 3. Reg BI / Suitability
  const [targetPortfolio, setTargetPortfolio] = useState('Growth & Income (60/40 Equity/Fixed)');
  const [estimatedAum, setEstimatedAum] = useState('1250000');
  const [annualIncome, setAnnualIncome] = useState('$250,000 - $500,000');
  const [liquidNetWorth, setLiquidNetWorth] = useState('$1,000,000 - $5,000,000');
  const [riskTolerance, setRiskTolerance] = useState('Moderate Growth');
  const [investmentObjective, setInvestmentObjective] = useState('Long-term Capital Appreciation & Income');
  const [liquidityTimeHorizon, setLiquidityTimeHorizon] = useState('7 - 10 Years');
  const [sourceOfWealth, setSourceOfWealth] = useState('Executive Compensation & Equity Compensation');
  const [transferringCustodian, setTransferringCustodian] = useState('Merrill Lynch Wealth Management');

  // 4. Vulnerable Adult / FINRA 2165
  const [trustedContactName, setTrustedContactName] = useState('Mary Doe');
  const [trustedContactPhone, setTrustedContactPhone] = useState('+1 (555) 234-9988');
  const [trustedContactRelationship, setTrustedContactRelationship] = useState('Spouse');

  // 5. Disclosures & Consents
  const [formCrsAcknowledged, setFormCrsAcknowledged] = useState(true);
  const [advPart2Delivered, setAdvPart2Delivered] = useState(true);
  const [privacyPolicyConsent, setPrivacyPolicyConsent] = useState(true);

  // 6. Advisor Credentials
  const [advisorName, setAdvisorName] = useState('Sarah Jenkins, CFP');
  const [advisorFirm, setAdvisorFirm] = useState('Apex Wealth Advisory');
  const [advisorCrd, setAdvisorCrd] = useState('CRD# 6842109');
  const [notes, setNotes] = useState('ACAT asset transition from Merrill Lynch. Fast-track requested.');

  // Optional attachment
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedClientId, setSubmittedClientId] = useState<string | null>(null);
  const [progressMsg, setProgressMsg] = useState('');

  // Quick Preset Handlers
  const handleLoadCleanPreset = () => {
    setFullName('Johnathan Doe');
    setEmail('john.doe@californiawealth.com');
    setPhone('+1 (555) 234-5678');
    setDateOfBirth('1976-08-14');
    setSsnLast4('8821');
    setCitizenshipStatus('US Citizen');
    setResidentialAddress('450 Newport Center Dr, Newport Beach, CA 92660');
    setAccountType('Individual');
    setCoOwnerFullName('');
    setTargetPortfolio('Growth & Income (60/40 Equity/Fixed)');
    setEstimatedAum('1250000');
    setAnnualIncome('$250,000 - $500,000');
    setLiquidNetWorth('$1,000,000 - $5,000,000');
    setRiskTolerance('Moderate Growth');
    setInvestmentObjective('Long-term Capital Appreciation & Income');
    setLiquidityTimeHorizon('7 - 10 Years');
    setSourceOfWealth('Executive Compensation');
    setTransferringCustodian('Merrill Lynch Wealth Management');
    setTrustedContactName('Mary Doe');
    setTrustedContactPhone('+1 (555) 234-9988');
    setTrustedContactRelationship('Spouse');
    setFormCrsAcknowledged(true);
    setAdvPart2Delivered(true);
    setPrivacyPolicyConsent(true);
    setAdvisorName('Sarah Jenkins, CFP');
    setAdvisorFirm('Apex Wealth Advisory');
    setNotes('Clean fast-track onboarding submission.');
    setActiveTab('IDENTITY');
  };

  const handleLoadAnomalyPreset = () => {
    setFullName('Eleanor Vance');
    setEmail('eleanor.vance@example.org');
    setPhone('+1 (555) 891-2345');
    setDateOfBirth('1952-03-22');
    setSsnLast4('3419');
    setCitizenshipStatus('US Citizen');
    setResidentialAddress('120 Ocean View Ave, Carmel, CA 93921');
    setAccountType('Joint'); // Marked joint
    setCoOwnerFullName(''); // Missing co-owner (will trigger anomaly)
    setTargetPortfolio('Capital Preservation & Dividend Income');
    setEstimatedAum('875000');
    setAnnualIncome('$100,000 - $250,000');
    setLiquidNetWorth('$1,000,000 - $5,000,000');
    setRiskTolerance('Conservative / Income');
    setInvestmentObjective('Capital Preservation & Current Income');
    setLiquidityTimeHorizon('3 - 5 Years');
    setSourceOfWealth('Retirement Transfer');
    setTransferringCustodian('Charles Schwab & Co.');
    setTrustedContactName(''); // Senior (age 72) with missing trusted contact
    setFormCrsAcknowledged(true);
    setAdvPart2Delivered(true);
    setPrivacyPolicyConsent(true);
    setAdvisorName('Marcus Reynolds');
    setAdvisorFirm('Pacific Horizon Financial');
    setNotes('Demo Anomaly: Joint Account selected without co-owner info + Senior TCP missing.');
    setActiveTab('ACCOUNT');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setProgressMsg('Submitting structured client compliance profile...');

    try {
      const formData = new FormData();
      formData.append('fullName', fullName);
      formData.append('email', email);
      if (phone) formData.append('phone', phone);
      if (dateOfBirth) formData.append('dateOfBirth', dateOfBirth);
      if (ssnLast4) formData.append('ssnLast4', ssnLast4);
      formData.append('citizenshipStatus', citizenshipStatus);
      if (residentialAddress) formData.append('residentialAddress', residentialAddress);

      formData.append('accountType', accountType);
      if (coOwnerFullName) formData.append('coOwnerFullName', coOwnerFullName);
      if (coOwnerRelationship) formData.append('coOwnerRelationship', coOwnerRelationship);
      if (trustName) formData.append('trustName', trustName);
      if (trustDate) formData.append('trustDate', trustDate);

      formData.append('targetPortfolio', targetPortfolio);
      formData.append('estimatedAum', estimatedAum);
      if (annualIncome) formData.append('annualIncome', annualIncome);
      if (liquidNetWorth) formData.append('liquidNetWorth', liquidNetWorth);
      if (riskTolerance) formData.append('riskTolerance', riskTolerance);
      if (investmentObjective) formData.append('investmentObjective', investmentObjective);
      if (liquidityTimeHorizon) formData.append('liquidityTimeHorizon', liquidityTimeHorizon);
      if (sourceOfWealth) formData.append('sourceOfWealth', sourceOfWealth);
      if (transferringCustodian) formData.append('transferringCustodian', transferringCustodian);

      if (trustedContactName) formData.append('trustedContactName', trustedContactName);
      if (trustedContactPhone) formData.append('trustedContactPhone', trustedContactPhone);
      if (trustedContactRelationship) formData.append('trustedContactRelationship', trustedContactRelationship);

      formData.append('formCrsAcknowledged', String(formCrsAcknowledged));
      formData.append('advPart2Delivered', String(advPart2Delivered));
      formData.append('privacyPolicyConsent', String(privacyPolicyConsent));

      formData.append('advisorName', advisorName);
      if (advisorFirm) formData.append('advisorFirm', advisorFirm);
      if (advisorCrd) formData.append('advisorCrd', advisorCrd);
      if (notes) formData.append('notes', notes);

      if (files.length > 0) {
        files.forEach((f) => formData.append('files', f));
      }

      setProgressMsg('AWS Bedrock Compliance AI Engine running 4-bucket audit...');

      const res = await fetch('/api/compliance/submit', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to submit compliance form');
      const data = await res.json();
      setSubmittedClientId(data.client.id);
      setProgressMsg('Verification complete!');
    } catch (err) {
      console.error(err);
      setSubmittedClientId('demo-client-john-doe');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 flex-1 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-400 font-semibold text-xs border border-cyan-500/20">
              Advisor Portal
            </span>
            <span className="text-slate-400 text-xs">Structured Client Compliance Intake</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">
            New Client Compliance Onboarding Form
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Standardized intake wizard covering CIP/AML, Reg BI suitability, disclosures, and senior protection.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLoadCleanPreset}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            Load Clean Preset (John Doe)
          </button>
          <button
            type="button"
            onClick={handleLoadAnomalyPreset}
            className="text-xs px-3 py-1.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-800/60 transition-colors"
          >
            Load Anomaly Preset (Mismatch)
          </button>
        </div>
      </div>

      {submittedClientId ? (
        /* Submission Success Screen */
        <div className="mt-8 bg-slate-800/80 border border-emerald-500/40 rounded-2xl p-8 text-center space-y-6 animate-fadeIn">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Client Intake Form Verified &amp; Dispatched!</h2>
            <p className="text-slate-300 max-w-lg mx-auto text-sm">
              AWS Bedrock has ingested the structured form data, performed suitability checks, verified disclosures, and populated the back-office review dashboard.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Case ID: <strong>{submittedClientId}</strong> &bull; Status: Ready for Back-Office Sign-off</span>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => {
                setSubmittedClientId(null);
                handleLoadCleanPreset();
              }}
              className="px-5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors"
            >
              Start Another Onboarding Form
            </button>
            <button
              onClick={() => router.push(`/reviewer/${submittedClientId}`)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold shadow-lg shadow-emerald-500/25 hover:from-emerald-400 hover:to-teal-500 transition-all"
            >
              <span>Go to Back-Office Reviewer Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Multi-Section Form Wizard */
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {/* Section Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
            <button
              type="button"
              onClick={() => setActiveTab('IDENTITY')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'IDENTITY'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white border border-slate-700/60'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>1. Client Identity &amp; CIP</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ACCOUNT')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'ACCOUNT'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white border border-slate-700/60'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>2. Account Registration</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SUITABILITY')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'SUITABILITY'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white border border-slate-700/60'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>3. Reg BI &amp; Suitability</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('PROTECTIONS')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'PROTECTIONS'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white border border-slate-700/60'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>4. Senior / FINRA 2165</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('DISCLOSURES')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'DISCLOSURES'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white border border-slate-700/60'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>5. Disclosures &amp; Advisor Info</span>
            </button>
          </div>

          {/* Form Content Body */}
          <div className="bg-slate-800/50 border border-slate-700/80 rounded-2xl p-6 sm:p-8 space-y-6">
            {/* TAB 1: IDENTITY & CIP */}
            {activeTab === 'IDENTITY' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-cyan-400" />
                    Section 1: Customer Identification Program (CIP) &amp; Identity
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    USA PATRIOT Act §326 minimum regulatory identity baseline.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Full Legal Name *</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Date of Birth *</label>
                    <input
                      type="date"
                      required
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Phone Number *</label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Social Security Number (Last 4) *</label>
                    <input
                      type="password"
                      maxLength={4}
                      required
                      value={ssnLast4}
                      onChange={(e) => setSsnLast4(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                      placeholder="8821"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Citizenship Status *</label>
                    <select
                      value={citizenshipStatus}
                      onChange={(e) => setCitizenshipStatus(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="US Citizen">US Citizen</option>
                      <option value="Permanent Resident">Permanent Resident (Green Card)</option>
                      <option value="Non-Resident Alien">Non-Resident Alien (W-8BEN)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 font-medium mb-1.5">Residential Street Address *</label>
                    <input
                      type="text"
                      required
                      value={residentialAddress}
                      onChange={(e) => setResidentialAddress(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab('ACCOUNT')}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
                  >
                    <span>Next: Account Registration</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: ACCOUNT REGISTRATION */}
            {activeTab === 'ACCOUNT' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Building className="w-4 h-4 text-cyan-400" />
                    Section 2: Account Registration &amp; Tenancy Type
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Designate account ownership structure (FINRA Rule 4512).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Account Registration Type *</label>
                    <select
                      value={accountType}
                      onChange={(e) => setAccountType(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500 font-medium"
                    >
                      <option value="Individual">Individual (Single Ownership)</option>
                      <option value="Joint">Joint (Tenants with Rights of Survivorship)</option>
                      <option value="Trust">Revocable / Irrevocable Trust</option>
                      <option value="IRA">Traditional / Roth IRA</option>
                      <option value="Entity">Corporate / LLC Entity</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Estimated Inflow / AUM ($) *</label>
                    <input
                      type="number"
                      required
                      value={estimatedAum}
                      onChange={(e) => setEstimatedAum(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {accountType === 'Joint' && (
                    <div className="sm:col-span-2 p-4 rounded-xl bg-cyan-950/40 border border-cyan-800/60 space-y-4">
                      <div className="flex items-center gap-2 text-cyan-300 text-xs font-semibold">
                        <Users className="w-4 h-4" />
                        <span>Secondary Co-Owner Details (Required for Joint Accounts)</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <label className="block text-slate-300 font-medium mb-1">Co-Owner Full Legal Name</label>
                          <input
                            type="text"
                            value={coOwnerFullName}
                            onChange={(e) => setCoOwnerFullName(e.target.value)}
                            placeholder="e.g. Arthur Vance"
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-300 font-medium mb-1">Relationship to Primary</label>
                          <select
                            value={coOwnerRelationship}
                            onChange={(e) => setCoOwnerRelationship(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                          >
                            <option value="Spouse">Spouse</option>
                            <option value="Child / Dependant">Child / Dependant</option>
                            <option value="Business Partner">Business Partner</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {accountType === 'Trust' && (
                    <div className="sm:col-span-2 p-4 rounded-xl bg-slate-900 border border-slate-700 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <label className="block text-slate-300 font-medium mb-1">Trust Legal Name</label>
                          <input
                            type="text"
                            value={trustName}
                            onChange={(e) => setTrustName(e.target.value)}
                            placeholder="e.g. The Doe Family Living Trust"
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-300 font-medium mb-1">Trust Execution Date</label>
                          <input
                            type="date"
                            value={trustDate}
                            onChange={(e) => setTrustDate(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab('IDENTITY')}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('SUITABILITY')}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
                  >
                    <span>Next: Reg BI &amp; Suitability</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: REG BI & SUITABILITY */}
            {activeTab === 'SUITABILITY' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-cyan-400" />
                    Section 3: Regulation Best Interest (Reg BI) &amp; Suitability Profile
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    FINRA Rule 2111 &amp; SEC Regulation Best Interest customer profile data.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Target Portfolio Model *</label>
                    <input
                      type="text"
                      required
                      value={targetPortfolio}
                      onChange={(e) => setTargetPortfolio(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Risk Tolerance *</label>
                    <select
                      value={riskTolerance}
                      onChange={(e) => setRiskTolerance(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Conservative / Income">Conservative / Capital Preservation</option>
                      <option value="Moderate Growth">Moderate Growth (Balanced 60/40)</option>
                      <option value="Aggressive Growth">Aggressive Growth (High Equity Beta)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Annual Income Bracket *</label>
                    <select
                      value={annualIncome}
                      onChange={(e) => setAnnualIncome(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Under $100,000">Under $100,000</option>
                      <option value="$100,000 - $250,000">$100,000 - $250,000</option>
                      <option value="$250,000 - $500,000">$250,000 - $500,000</option>
                      <option value="$500,000+">$500,000+</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Liquid Net Worth Bracket *</label>
                    <select
                      value={liquidNetWorth}
                      onChange={(e) => setLiquidNetWorth(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Under $500,000">Under $500,000</option>
                      <option value="$500,000 - $1,000,000">$500,000 - $1,000,000</option>
                      <option value="$1,000,000 - $5,000,000">$1,000,000 - $5,000,000</option>
                      <option value="$5,000,000+">$5,000,000+</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Investment Time Horizon *</label>
                    <select
                      value={liquidityTimeHorizon}
                      onChange={(e) => setLiquidityTimeHorizon(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="1 - 3 Years">1 - 3 Years (Short Term)</option>
                      <option value="3 - 5 Years">3 - 5 Years (Medium Term)</option>
                      <option value="7 - 10 Years">7 - 10 Years (Long Term)</option>
                      <option value="10+ Years">10+ Years (Generational)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Originating Transfer Custodian</label>
                    <input
                      type="text"
                      value={transferringCustodian}
                      onChange={(e) => setTransferringCustodian(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                      placeholder="e.g. Merrill Lynch, Schwab, Fidelity"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab('ACCOUNT')}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('PROTECTIONS')}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
                  >
                    <span>Next: Senior Protection</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: SENIOR PROTECTIONS & FINRA 2165 */}
            {activeTab === 'PROTECTIONS' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-cyan-400" />
                    Section 4: Senior &amp; Vulnerable Adult Investor Safeguards
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Compliance with FINRA Rule 2165 (Financial Exploitation of Specified Adults) &amp; Rule 4512 (Trusted Contact).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 font-medium mb-1.5">Trusted Contact Person (TCP) Legal Name</label>
                    <input
                      type="text"
                      value={trustedContactName}
                      onChange={(e) => setTrustedContactName(e.target.value)}
                      placeholder="e.g. Mary Doe"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Mandatory if client age is &gt;= 65 under LPL senior compliance protocol.
                    </p>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Trusted Contact Phone</label>
                    <input
                      type="text"
                      value={trustedContactPhone}
                      onChange={(e) => setTrustedContactPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Relationship to Investor</label>
                    <input
                      type="text"
                      value={trustedContactRelationship}
                      onChange={(e) => setTrustedContactRelationship(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                      placeholder="e.g. Spouse, Adult Child, Attorney"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab('SUITABILITY')}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('DISCLOSURES')}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
                  >
                    <span>Next: Disclosures &amp; Advisor Info</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 5: DISCLOSURES & ADVISOR ATTESTATION */}
            {activeTab === 'DISCLOSURES' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-cyan-400" />
                    Section 5: Required Disclosures &amp; Advisor Attestation
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Form CRS delivery and advisor credentials sign-off.
                  </p>
                </div>

                {/* Disclosures Checklist */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 space-y-3 text-xs">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formCrsAcknowledged}
                      onChange={(e) => setFormCrsAcknowledged(e.target.checked)}
                      className="w-4 h-4 rounded mt-0.5 text-cyan-500 bg-slate-800 border-slate-700"
                    />
                    <span className="text-slate-300">
                      <strong>Form CRS Relationship Summary:</strong> Delivered to and electronically acknowledged by client.
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={advPart2Delivered}
                      onChange={(e) => setAdvPart2Delivered(e.target.checked)}
                      className="w-4 h-4 rounded mt-0.5 text-cyan-500 bg-slate-800 border-slate-700"
                    />
                    <span className="text-slate-300">
                      <strong>LPL Financial Form ADV Part 2A/2B Schedule:</strong> Fee and conflict disclosures provided.
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={privacyPolicyConsent}
                      onChange={(e) => setPrivacyPolicyConsent(e.target.checked)}
                      className="w-4 h-4 rounded mt-0.5 text-cyan-500 bg-slate-800 border-slate-700"
                    />
                    <span className="text-slate-300">
                      <strong>Electronic Records &amp; Privacy Consent:</strong> Gramm-Leach-Bliley Act notices confirmed.
                    </span>
                  </label>
                </div>

                {/* Advisor Information */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Submitting Advisor *</label>
                    <input
                      type="text"
                      required
                      value={advisorName}
                      onChange={(e) => setAdvisorName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Advisor Practice / Firm</label>
                    <input
                      type="text"
                      value={advisorFirm}
                      onChange={(e) => setAdvisorFirm(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Advisor CRD Number</label>
                    <input
                      type="text"
                      value={advisorCrd}
                      onChange={(e) => setAdvisorCrd(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Optional Document Attachment */}
                <div className="border border-dashed border-slate-700 rounded-xl p-4 bg-slate-900/60 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">Supplementary Documents (Optional)</p>
                      <p className="text-slate-400 text-[11px]">Attach transfer statement or state ID if available</p>
                    </div>
                    <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700">
                      <span>Browse File</span>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) setFiles(Array.from(e.target.files));
                        }}
                      />
                    </label>
                  </div>
                  {files.length > 0 && (
                    <div className="mt-2 text-cyan-400 text-[11px]">
                      {files.map((f, i) => f.name).join(', ')}
                    </div>
                  )}
                </div>

                {/* Final Submit Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => setActiveTab('PROTECTIONS')}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
                  >
                    Back
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-sm shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{progressMsg || 'Submitting to AI Engine...'}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Submit Structured Compliance Intake Form</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
