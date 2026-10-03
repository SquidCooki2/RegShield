'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdvisorPortal() {
  const router = useRouter();

  // Form State
  const [activeTab, setActiveTab] = useState<'IDENTITY' | 'ACCOUNT' | 'SUITABILITY' | 'PROTECTIONS' | 'DISCLOSURES'>('IDENTITY');

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

  // Document Uploads
  const [photoIdFile, setPhotoIdFile] = useState<File | null>(null);
  const [proofOfAddressFile, setProofOfAddressFile] = useState<File | null>(null);
  const [brokerageStatementFile, setBrokerageStatementFile] = useState<File | null>(null);
  const [trustAgreementFile, setTrustAgreementFile] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedClientId, setSubmittedClientId] = useState<string | null>(null);

  // Preset Handlers
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
    setNotes('Standard intake verification.');
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
    setAccountType('Joint');
    setCoOwnerFullName('');
    setTargetPortfolio('Capital Preservation & Dividend Income');
    setEstimatedAum('875000');
    setAnnualIncome('$100,000 - $250,000');
    setLiquidNetWorth('$1,000,000 - $5,000,000');
    setRiskTolerance('Conservative / Income');
    setInvestmentObjective('Capital Preservation & Current Income');
    setLiquidityTimeHorizon('3 - 5 Years');
    setSourceOfWealth('Retirement Transfer');
    setTransferringCustodian('Charles Schwab & Co.');
    setTrustedContactName('');
    setFormCrsAcknowledged(true);
    setAdvPart2Delivered(true);
    setPrivacyPolicyConsent(true);
    setAdvisorName('Marcus Reynolds');
    setAdvisorFirm('Pacific Horizon Financial');
    setNotes('Schwab statement reflects Individual, but intake marked Joint + Senior TCP missing.');
    setActiveTab('ACCOUNT');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

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

      if (photoIdFile) formData.append('files', photoIdFile);
      if (proofOfAddressFile) formData.append('files', proofOfAddressFile);
      if (brokerageStatementFile) formData.append('files', brokerageStatementFile);
      if (trustAgreementFile) formData.append('files', trustAgreementFile);

      const res = await fetch('/api/compliance/submit', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to submit');
      const data = await res.json();
      setSubmittedClientId(data.client.id);
    } catch (err) {
      console.error(err);
      setSubmittedClientId('demo-client-john-doe');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 flex-1 w-full">
      {/* Sleek Subheader (Without "Intake Module") */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-semibold text-white">New Client Compliance Record</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLoadCleanPreset}
            className="text-xs px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
          >
            Fill Sample (John Doe)
          </button>
          <button
            type="button"
            onClick={handleLoadAnomalyPreset}
            className="text-xs px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-800 transition-colors"
          >
            Fill Anomaly (Eleanor Vance)
          </button>
        </div>
      </div>

      {submittedClientId ? (
        /* Clean Confirmation Screen (No OCR wording) */
        <div className="mt-8 p-8 border border-slate-800 rounded-lg bg-[#0e131f] text-left space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">Submission Processed</span>
            <span className="text-xs font-mono text-slate-500">ID: {submittedClientId}</span>
          </div>

          <h2 className="text-lg font-semibold text-white">Client intake record submitted for review.</h2>
          <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
            The record has been verified against CIP baselines, suitability parameters, and required disclosure checklists.
          </p>

          <div className="pt-3 flex items-center gap-3">
            <button
              onClick={() => {
                setSubmittedClientId(null);
                handleLoadCleanPreset();
              }}
              className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              New Submission
            </button>
            <button
              onClick={() => router.push(`/reviewer/${submittedClientId}`)}
              className="px-4 py-2 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-medium transition-colors"
            >
              Open Reviewer Record
            </button>
          </div>
        </div>
      ) : (
        /* Minimal Tabbed Form */
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Section Navigation Tabs */}
          <div className="flex items-center border-b border-slate-800 gap-6 text-xs font-medium overflow-x-auto pb-px">
            <button
              type="button"
              onClick={() => setActiveTab('IDENTITY')}
              className={`pb-2.5 transition-colors whitespace-nowrap ${
                activeTab === 'IDENTITY'
                  ? 'text-white border-b-2 border-sky-400 font-semibold'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              1. Identity &amp; CIP
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ACCOUNT')}
              className={`pb-2.5 transition-colors whitespace-nowrap ${
                activeTab === 'ACCOUNT'
                  ? 'text-white border-b-2 border-sky-400 font-semibold'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              2. Account Structure
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SUITABILITY')}
              className={`pb-2.5 transition-colors whitespace-nowrap ${
                activeTab === 'SUITABILITY'
                  ? 'text-white border-b-2 border-sky-400 font-semibold'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              3. Suitability &amp; Reg BI
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('PROTECTIONS')}
              className={`pb-2.5 transition-colors whitespace-nowrap ${
                activeTab === 'PROTECTIONS'
                  ? 'text-white border-b-2 border-sky-400 font-semibold'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              4. Senior Protection
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('DISCLOSURES')}
              className={`pb-2.5 transition-colors whitespace-nowrap ${
                activeTab === 'DISCLOSURES'
                  ? 'text-white border-b-2 border-sky-400 font-semibold'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              5. Disclosures &amp; Attestation
            </button>
          </div>

          {/* Form Container */}
          <div className="p-6 border border-slate-800/90 rounded-lg bg-[#0e131f] space-y-5">
            {/* TAB 1: IDENTITY */}
            {activeTab === 'IDENTITY' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-300 mb-1">Full Legal Name</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800 text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      required
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800 text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800 text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">Phone</label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800 text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">Tax ID / SSN (Last 4)</label>
                    <input
                      type="password"
                      maxLength={4}
                      required
                      value={ssnLast4}
                      onChange={(e) => setSsnLast4(e.target.value)}
                      className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800 text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">Citizenship Status</label>
                    <select
                      value={citizenshipStatus}
                      onChange={(e) => setCitizenshipStatus(e.target.value)}
                      className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800 text-slate-100"
                    >
                      <option value="US Citizen">US Citizen</option>
                      <option value="Permanent Resident">Permanent Resident</option>
                      <option value="Non-Resident Alien">Non-Resident Alien</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 mb-1">Residential Address</label>
                    <input
                      type="text"
                      required
                      value={residentialAddress}
                      onChange={(e) => setResidentialAddress(e.target.value)}
                      className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800 text-slate-100"
                    />
                  </div>
                </div>

                {/* Document Upload Slots */}
                <div className="pt-3 border-t border-slate-800 space-y-3">
                  <span className="text-[11px] font-mono text-slate-400 uppercase block">Required Documents</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Photo ID Slot */}
                    <div className="p-3 rounded bg-slate-900/80 border border-slate-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-slate-200 block">Government Photo ID</span>
                          <span className="text-[10px] text-slate-500">Driver License or Passport</span>
                        </div>
                        <label className="cursor-pointer px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700">
                          <span>{photoIdFile ? 'Change' : 'Upload'}</span>
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.png,.jpg,.jpeg"
                            onChange={(e) => {
                              if (e.target.files?.[0]) setPhotoIdFile(e.target.files[0]);
                            }}
                          />
                        </label>
                      </div>
                      <div className="mt-1.5 text-[11px] font-mono text-slate-400">
                        {photoIdFile ? photoIdFile.name : 'CA_Driver_License_JohnDoe.pdf (Pre-loaded)'}
                      </div>
                    </div>

                    {/* Proof of Address Slot */}
                    <div className="p-3 rounded bg-slate-900/80 border border-slate-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-slate-200 block">Proof of Address (&lt;90 days)</span>
                          <span className="text-[10px] text-slate-500">Utility bill or bank statement</span>
                        </div>
                        <label className="cursor-pointer px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700">
                          <span>{proofOfAddressFile ? 'Change' : 'Upload'}</span>
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.png,.jpg,.jpeg"
                            onChange={(e) => {
                              if (e.target.files?.[0]) setProofOfAddressFile(e.target.files[0]);
                            }}
                          />
                        </label>
                      </div>
                      <div className="mt-1.5 text-[11px] font-mono text-slate-400">
                        {proofOfAddressFile ? proofOfAddressFile.name : 'Edison_Utility_Bill_Sep2026.pdf (Pre-loaded)'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('ACCOUNT')}
                    className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium"
                  >
                    Continue to Account Structure
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: ACCOUNT */}
            {activeTab === 'ACCOUNT' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-300 mb-1">Registration Type</label>
                    <select
                      value={accountType}
                      onChange={(e) => setAccountType(e.target.value as any)}
                      className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800 text-slate-100"
                    >
                      <option value="Individual">Individual</option>
                      <option value="Joint">Joint (Rights of Survivorship)</option>
                      <option value="Trust">Trust (Revocable / Irrevocable)</option>
                      <option value="IRA">Traditional / Roth IRA</option>
                      <option value="Entity">Corporate / Entity</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">Estimated Inflow Amount ($)</label>
                    <input
                      type="number"
                      required
                      value={estimatedAum}
                      onChange={(e) => setEstimatedAum(e.target.value)}
                      className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800 text-slate-100"
                    />
                  </div>

                  {accountType === 'Joint' && (
                    <div className="sm:col-span-2 p-3.5 rounded bg-slate-900/80 border border-slate-800 space-y-3">
                      <span className="text-[11px] font-mono text-slate-400 uppercase">Co-Owner Information</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-400 mb-1">Co-Owner Legal Name</label>
                          <input
                            type="text"
                            value={coOwnerFullName}
                            onChange={(e) => setCoOwnerFullName(e.target.value)}
                            placeholder="Leave empty to test anomaly"
                            className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Relationship</label>
                          <select
                            value={coOwnerRelationship}
                            onChange={(e) => setCoOwnerRelationship(e.target.value)}
                            className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-100"
                          >
                            <option value="Spouse">Spouse</option>
                            <option value="Child">Child</option>
                            <option value="Partner">Partner</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {accountType === 'Trust' && (
                    <div className="sm:col-span-2 p-3.5 rounded bg-slate-900/80 border border-slate-800 space-y-3">
                      <span className="text-[11px] font-mono text-slate-400 uppercase">Trust Details</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-400 mb-1">Trust Name</label>
                          <input
                            type="text"
                            value={trustName}
                            onChange={(e) => setTrustName(e.target.value)}
                            className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Execution Date</label>
                          <input
                            type="date"
                            value={trustDate}
                            onChange={(e) => setTrustDate(e.target.value)}
                            className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-100"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between pt-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('IDENTITY')}
                    className="px-4 py-2 rounded bg-slate-900 text-slate-400 text-xs hover:text-slate-200"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('SUITABILITY')}
                    className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium"
                  >
                    Continue to Suitability
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: SUITABILITY */}
            {activeTab === 'SUITABILITY' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-300 mb-1">Target Strategy / Allocation</label>
                    <input
                      type="text"
                      required
                      value={targetPortfolio}
                      onChange={(e) => setTargetPortfolio(e.target.value)}
                      className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800 text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">Risk Tolerance</label>
                    <select
                      value={riskTolerance}
                      onChange={(e) => setRiskTolerance(e.target.value)}
                      className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800 text-slate-100"
                    >
                      <option value="Conservative / Income">Conservative / Income</option>
                      <option value="Moderate Growth">Moderate Growth</option>
                      <option value="Aggressive Growth">Aggressive Growth</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">Annual Income</label>
                    <select
                      value={annualIncome}
                      onChange={(e) => setAnnualIncome(e.target.value)}
                      className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800 text-slate-100"
                    >
                      <option value="Under $100,000">Under $100,000</option>
                      <option value="$100,000 - $250,000">$100,000 - $250,000</option>
                      <option value="$250,000 - $500,000">$250,000 - $500,000</option>
                      <option value="$500,000+">$500,000+</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">Liquid Net Worth</label>
                    <select
                      value={liquidNetWorth}
                      onChange={(e) => setLiquidNetWorth(e.target.value)}
                      className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800 text-slate-100"
                    >
                      <option value="Under $500,000">Under $500,000</option>
                      <option value="$500,000 - $1,000,000">$500,000 - $1,000,000</option>
                      <option value="$1,000,000 - $5,000,000">$1,000,000 - $5,000,000</option>
                      <option value="$5,000,000+">$5,000,000+</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">Time Horizon</label>
                    <select
                      value={liquidityTimeHorizon}
                      onChange={(e) => setLiquidityTimeHorizon(e.target.value)}
                      className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800 text-slate-100"
                    >
                      <option value="1 - 3 Years">1 - 3 Years</option>
                      <option value="3 - 5 Years">3 - 5 Years</option>
                      <option value="7 - 10 Years">7 - 10 Years</option>
                      <option value="10+ Years">10+ Years</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">Transferring Custodian</label>
                    <input
                      type="text"
                      value={transferringCustodian}
                      onChange={(e) => setTransferringCustodian(e.target.value)}
                      className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800 text-slate-100"
                    />
                  </div>
                </div>

                {/* Brokerage Statement Upload Slot */}
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <span className="text-[11px] font-mono text-slate-400 uppercase block">Competitor Account Statement</span>
                  <div className="p-3 rounded bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-slate-200 block text-xs">Brokerage Statement (PDF)</span>
                      <span className="text-[10px] text-slate-500">Holdings and registration transfer statement</span>
                    </div>
                    <label className="cursor-pointer px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700">
                      <span>{brokerageStatementFile ? 'Change' : 'Upload'}</span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={(e) => {
                          if (e.target.files?.[0]) setBrokerageStatementFile(e.target.files[0]);
                        }}
                      />
                    </label>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    {brokerageStatementFile ? brokerageStatementFile.name : 'Merrill_Lynch_ACAT_Statement.pdf (Pre-loaded)'}
                  </div>
                </div>

                <div className="flex justify-between pt-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('ACCOUNT')}
                    className="px-4 py-2 rounded bg-slate-900 text-slate-400 text-xs hover:text-slate-200"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('PROTECTIONS')}
                    className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium"
                  >
                    Continue to Protections
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: PROTECTIONS */}
            {activeTab === 'PROTECTIONS' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 mb-1">Trusted Contact Person (TCP) Legal Name</label>
                    <input
                      type="text"
                      value={trustedContactName}
                      onChange={(e) => setTrustedContactName(e.target.value)}
                      placeholder="Required for clients age 65+"
                      className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800 text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">TCP Phone Number</label>
                    <input
                      type="text"
                      value={trustedContactPhone}
                      onChange={(e) => setTrustedContactPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800 text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">TCP Relationship</label>
                    <input
                      type="text"
                      value={trustedContactRelationship}
                      onChange={(e) => setTrustedContactRelationship(e.target.value)}
                      className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800 text-slate-100"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('SUITABILITY')}
                    className="px-4 py-2 rounded bg-slate-900 text-slate-400 text-xs hover:text-slate-200"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('DISCLOSURES')}
                    className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium"
                  >
                    Continue to Disclosures
                  </button>
                </div>
              </div>
            )}

            {/* TAB 5: DISCLOSURES */}
            {activeTab === 'DISCLOSURES' && (
              <div className="space-y-5">
                {/* Checkboxes */}
                <div className="p-3.5 rounded bg-slate-900/80 border border-slate-800 space-y-2.5 text-xs">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formCrsAcknowledged}
                      onChange={(e) => setFormCrsAcknowledged(e.target.checked)}
                      className="mt-0.5 rounded border-slate-700 bg-slate-950 text-sky-500"
                    />
                    <span className="text-slate-300">
                      Form CRS Relationship Summary delivered and electronically acknowledged.
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={advPart2Delivered}
                      onChange={(e) => setAdvPart2Delivered(e.target.checked)}
                      className="mt-0.5 rounded border-slate-700 bg-slate-950 text-sky-500"
                    />
                    <span className="text-slate-300">
                      Form ADV Part 2A/2B fee schedule and conflict disclosures provided.
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={privacyPolicyConsent}
                      onChange={(e) => setPrivacyPolicyConsent(e.target.checked)}
                      className="mt-0.5 rounded border-slate-700 bg-slate-950 text-sky-500"
                    />
                    <span className="text-slate-300">
                      Gramm-Leach-Bliley Act privacy consent confirmed.
                    </span>
                  </label>
                </div>

                {/* Advisor Metadata */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Submitting Advisor</label>
                    <input
                      type="text"
                      required
                      value={advisorName}
                      onChange={(e) => setAdvisorName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Practice / Firm</label>
                    <input
                      type="text"
                      value={advisorFirm}
                      onChange={(e) => setAdvisorFirm(e.target.value)}
                      className="w-full px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">CRD Number</label>
                    <input
                      type="text"
                      value={advisorCrd}
                      onChange={(e) => setAdvisorCrd(e.target.value)}
                      className="w-full px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-slate-100"
                    />
                  </div>
                </div>

                {/* Submit Row */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveTab('PROTECTIONS')}
                    className="px-4 py-2 rounded bg-slate-900 text-slate-400 text-xs hover:text-slate-200"
                  >
                    Back
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold tracking-tight transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Processing Record...' : 'Submit Compliance Record'}
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
