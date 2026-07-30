import React, { useState } from 'react';
import { Icon } from './Icon';
import { useContract } from '../context/ContractContext';

interface RegisterAgentViewProps {
  onSuccess: (newAgentId: string) => void;
  onCancel: () => void;
}

export const RegisterAgentView: React.FC<RegisterAgentViewProps> = ({ onSuccess, onCancel }) => {
  const { registerAgent, transactionState, wallet } = useContract();

  const [origin, setOrigin] = useState('');
  const [userAgent, setUserAgent] = useState('');
  const [designatedUser, setDesignatedUser] = useState('');
  const [attestorPublicKey, setAttestorPublicKey] = useState('');
  const [policyUrl, setPolicyUrl] = useState('');
  const [allowedPurpose, setAllowedPurpose] = useState('');
  const [operatorBond, setOperatorBond] = useState<number>(1000);
  const [minimumChallengeBond, setMinimumChallengeBond] = useState<number>(100);
  const [penaltyAmount, setPenaltyAmount] = useState<number>(250);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const submittingLabel =
    transactionState.status === 'submitted'
      ? 'Transaction submitted...'
      : transactionState.status === 'accepted'
        ? 'Awaiting finalization...'
        : transactionState.status === 'finalized'
          ? 'Syncing contract state...'
          : 'Confirm in wallet...';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (
      !origin.trim() ||
      !userAgent.trim() ||
      !policyUrl.trim() ||
      !allowedPurpose.trim() ||
      !attestorPublicKey.trim()
    ) {
      setErrorMsg('Please fill in all required agent identity and policy fields.');
      return;
    }

    if (!/^0x04[0-9a-fA-F]{128}$/.test(attestorPublicKey.trim())) {
      setErrorMsg('Runner attestor key must be an uncompressed secp256k1 public key.');
      return;
    }

    if (operatorBond < 100) {
      setErrorMsg('Operator bond stake must be at least 100 GEN.');
      return;
    }

    setIsSubmitting(true);

    try {
      const newId = await registerAgent({
        origin: origin.startsWith('http') ? origin : `https://${origin}`,
        user_agent: userAgent,
        user: designatedUser || wallet.address,
        policy_url: policyUrl,
        attestor_public_key: attestorPublicKey.trim(),
        allowed_purpose: allowedPurpose,
        operator_bond: Number(operatorBond),
        minimum_challenge_bond: Number(minimumChallengeBond),
        penalty_amount: Number(penaltyAmount),
      });
      onSuccess(newId);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to register agent bond.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fadeIn">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="font-headline text-2xl md:text-3xl font-black uppercase text-white mb-1">
            Register New Web Agent Bond
          </h2>
          <p className="font-sans text-xs md:text-sm text-slate-400 max-w-2xl">
            Establish an immutable security bond for a new autonomous web agent on GenLayer Studionet. Fields locked upon blockchain registration.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded-xl border border-slate-800 text-slate-300 font-mono text-xs shrink-0">
          <Icon name="warning" className="text-sm text-orange-500" />
          <span>Requires GenLayer wallet signature</span>
        </div>
      </header>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 font-sans text-xs flex items-center gap-2">
          <Icon name="error" className="text-base" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form noValidate onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Fields */}
        <div className="lg:col-span-8 space-y-6">
          {/* Identity & Origin Parameters Module */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Icon name="fingerprint" className="text-9xl" />
            </div>

            <div className="flex items-center gap-3 mb-5 border-b border-slate-800 pb-3">
              <Icon name="badge" className="text-orange-500" />
              <h3 className="font-headline text-lg font-black uppercase text-white">
                Identity & Origin Parameters
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block font-mono text-xs text-slate-400 uppercase font-bold mb-1.5">
                  Protected Origin URL <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <Icon name="link" className="text-sm" />
                  </span>
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="https://api.my-domain.com"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1 font-sans">
                  The target web service domain protected by this access policy.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-xs text-slate-400 uppercase font-bold mb-1.5">
                    User-Agent String <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={userAgent}
                    onChange={(e) => setUserAgent(e.target.value)}
                    placeholder="e.g. AAB-IndexerBot/1.0"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="designated-user" className="block font-mono text-xs text-slate-400 uppercase font-bold mb-1.5">
                    Designated User Address (Beneficiary)
                  </label>
                  <input
                    id="designated-user"
                    type="text"
                    value={designatedUser}
                    onChange={(e) => setDesignatedUser(e.target.value)}
                    placeholder="0x..."
                    className="w-full bg-slate-950 border border-slate-800 text-orange-400 font-mono text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="attestor-public-key" className="block font-mono text-xs text-slate-400 uppercase font-bold mb-1.5">
                  Runner Attestor Public Key <span className="text-red-400">*</span>
                </label>
                <input
                  id="attestor-public-key"
                  type="text"
                  value={attestorPublicKey}
                  onChange={(e) => setAttestorPublicKey(e.target.value)}
                  placeholder="0x04... uncompressed secp256k1 public key"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-orange-500"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1 font-sans">
                  Access receipts must be signed by this immutable runner key before a bond can be slashed.
                </p>
              </div>
            </div>
          </div>

          {/* Behavioral Policy Module */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
            <div className="flex items-center gap-3 mb-5 border-b border-slate-800 pb-3">
              <Icon name="policy" className="text-orange-500" />
              <h3 className="font-headline text-lg font-black uppercase text-white">
                Behavioral Access Policy
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block font-mono text-xs text-slate-400 uppercase font-bold mb-1.5">
                  Policy Document URL (Publicly Inspectable) <span className="text-red-400">*</span>
                </label>
                <input
                  type="url"
                  value={policyUrl}
                  onChange={(e) => setPolicyUrl(e.target.value)}
                  placeholder="https://github.com/my-org/policies/agent-policy.md"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-orange-500"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1 font-sans">
                  GenLayer validators will fetch this policy URL during adjudication.
                </p>
              </div>

              <div>
                <label className="block font-mono text-xs text-slate-400 uppercase font-bold mb-1.5">
                  Allowed Purpose (Plaintext Operational Summary) <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={4}
                  value={allowedPurpose}
                  onChange={(e) => setAllowedPurpose(e.target.value)}
                  placeholder="Describe the exact scope, permitted paths, rate limits, and prohibited actions (e.g. Authorized to index /public/* endpoints. Prohibited from scraping /user/* or submitting forms)."
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 font-sans text-xs p-3.5 rounded-xl focus:outline-none focus:border-orange-500 leading-relaxed resize-none"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Financial Bond & Actions */}
        <div className="lg:col-span-4 space-y-6">
          {/* Operator Financial Bond Module */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2 border-b border-slate-800 pb-3">
              <Icon name="account_balance" className="text-amber-500" />
              <h3 className="font-headline text-lg font-black uppercase text-white">
                Operator Bond
              </h3>
            </div>

            <div>
              <label className="block font-mono text-xs text-slate-400 uppercase font-bold mb-1.5">
                Initial Bond Collateral (GEN)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={100}
                  value={operatorBond}
                  onChange={(e) => setOperatorBond(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-white font-mono text-base pr-16 pl-3 py-2 rounded-xl text-right focus:outline-none focus:border-orange-500"
                />
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 font-mono text-xs text-slate-500 pointer-events-none">
                  GEN
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-mono">Minimum recommended: 1,000 GEN</p>
            </div>

            <div>
              <label className="block font-mono text-xs text-slate-400 uppercase font-bold mb-1.5">
                Penalty Amount Slashed per Breach
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={penaltyAmount}
                  onChange={(e) => setPenaltyAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-amber-400 font-mono text-base pr-16 pl-3 py-2 rounded-xl text-right focus:outline-none focus:border-amber-500"
                />
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 font-mono text-xs text-slate-500 pointer-events-none">
                  GEN
                </span>
              </div>
            </div>

            <div>
              <label className="block font-mono text-xs text-slate-400 uppercase font-bold mb-1.5">
                Minimum Challenge Bond
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={minimumChallengeBond}
                  onChange={(e) => setMinimumChallengeBond(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 font-mono text-base pr-16 pl-3 py-2 rounded-xl text-right focus:outline-none focus:border-orange-500"
                />
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 font-mono text-xs text-slate-500 pointer-events-none">
                  GEN
                </span>
              </div>
            </div>
          </div>

          {/* Projected Security Summary */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-4">
            <h4 className="font-mono text-xs text-slate-500 uppercase border-b border-slate-800 pb-2 font-bold">
              Projected Security Summary
            </h4>

            <ul className="space-y-3 font-sans text-xs text-slate-300">
              <li className="flex gap-2.5 items-start">
                <Icon name="check_circle" className="text-emerald-400 text-base shrink-0" />
                <span>
                  Bond locks <strong className="font-mono text-orange-400">immutable constraints</strong> on agent behavior.
                </span>
              </li>
              <li className="flex gap-2.5 items-start">
                <Icon name="check_circle" className="text-emerald-400 text-base shrink-0" />
                <span>
                  Policy breaches confirmed via Access Reviews trigger automated <strong className="text-amber-400">slashing events</strong>.
                </span>
              </li>
              <li className="flex gap-2.5 items-start">
                <Icon name="lock" className="text-slate-500 text-base shrink-0" />
                <span>
                  Origin and Policy URL cannot be modified post-deployment.
                </span>
              </li>
            </ul>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-orange-500 text-slate-950 font-mono text-xs font-bold uppercase py-3 px-4 rounded-xl hover:bg-orange-400 transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Icon name="sync" className="text-sm animate-spin" />
                  <span>{submittingLabel}</span>
                </>
              ) : (
                <>
                  <Icon name="edit_document" className="text-sm" />
                  <span>Create Agent Draft Bond</span>
                </>
              )}
            </button>

            <p className="text-center text-[10px] font-mono text-slate-500 flex items-center justify-center gap-1">
              <Icon name="account_balance_wallet" className="text-xs" />
              <span>Prompts wallet signature on GenLayer Studionet</span>
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};
